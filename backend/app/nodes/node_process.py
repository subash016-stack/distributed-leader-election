import argparse
import asyncio
import logging
import signal
from typing import Dict, Optional

import httpx

from app.election.bully_algorithm import BullyElectionEngine
from app.election.failure_detector import HeartbeatFailureDetector
from app.models.events import SystemEvent
from app.models.messages import MessageType, NetworkMessage
from app.models.node import NodeStatus
from app.network.tcp_server import AsyncTCPServer
from app.nodes.node_state import NodeState

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] [Node %(name)s] %(levelname)s: %(message)s", datefmt="%H:%M:%S"
)


class NodeRuntime:
    """Runtime container for an independent node process."""

    def __init__(
        self,
        node_id: int,
        port: int,
        peers: Dict[int, int],
        host: str = "127.0.0.1",
        api_url: Optional[str] = None,
        heartbeat_interval: float = 2.0,
        heartbeat_timeout: float = 5.0,
        election_timeout: float = 4.0,
    ):
        self.node_id = node_id
        self.port = port
        self.host = host
        self.peers = peers
        self.api_url = api_url
        self.logger = logging.getLogger(str(node_id))

        self.state = NodeState(node_id=node_id, port=port, host=host, peers=peers)
        self.bully = BullyElectionEngine(
            state=self.state, election_timeout=election_timeout, event_callback=self._publish_event
        )
        self.failure_detector = HeartbeatFailureDetector(
            state=self.state,
            heartbeat_interval=heartbeat_interval,
            heartbeat_timeout=heartbeat_timeout,
            trigger_election=self._on_heartbeat_timeout,
            event_callback=self._publish_event,
        )
        self.server = AsyncTCPServer(host=host, port=port, handler=self.handle_message)
        self._stop_event = asyncio.Event()

    async def _publish_event(self, event: SystemEvent) -> None:
        """Forward event to central backend event pipeline if api_url is provided (fire-and-forget)."""
        if self.api_url:

            async def _send():
                try:
                    async with httpx.AsyncClient(timeout=0.6) as client:
                        await client.post(f"{self.api_url}/api/internal/events", json=event.model_dump(mode="json"))
                except Exception:
                    pass

            asyncio.create_task(_send())

    async def _on_heartbeat_timeout(self, reason: str) -> None:
        """Triggered when failure detector detects missing coordinator."""
        self.logger.warning("Heartbeat timeout triggered election: %s", reason)
        await self.bully.initiate_election(reason=reason)

    async def handle_message(self, msg: NetworkMessage) -> Optional[NetworkMessage]:
        """Handle incoming TCP message."""
        if self.state.status == NodeStatus.FAILED and msg.message_type != MessageType.ADMIN_STOP:
            return None

        # Route based on message type
        if msg.message_type == MessageType.ELECTION:
            return await self.bully.handle_election_message(msg)

        elif msg.message_type == MessageType.COORDINATOR:
            return await self.bully.handle_coordinator_message(msg)

        elif msg.message_type == MessageType.HEARTBEAT:
            self.state.record_message("IN", "HEARTBEAT", msg.sender_id)
            # Coordinator replies with HEARTBEAT_ACK
            return NetworkMessage(
                message_type=MessageType.HEARTBEAT_ACK,
                sender_id=self.node_id,
                receiver_id=msg.sender_id,
                generation=self.state.generation,
            )

        elif msg.message_type == MessageType.ADMIN_PING or msg.message_type == MessageType.ADMIN_STATUS:
            return NetworkMessage(
                message_type=MessageType.ADMIN_STATUS,
                sender_id=self.node_id,
                receiver_id=msg.sender_id,
                generation=self.state.generation,
                payload={
                    "status": self.state.status.value,
                    "is_coordinator": self.state.is_coordinator,
                    "coordinator_id": self.state.coordinator_id,
                    "started_at": self.state.started_at,
                    "last_heartbeat": self.state.last_heartbeat_ack_received or self.state.last_heartbeat_sent,
                    "election_in_progress": self.state.election_in_progress,
                    "recent_messages": self.state.recent_messages[-10:],
                },
            )

        elif msg.message_type == MessageType.START_ELECTION:
            reason = msg.payload.get("reason", "Manual trigger")
            asyncio.create_task(self.bully.initiate_election(reason=reason))
            return NetworkMessage(
                message_type=MessageType.OK,
                sender_id=self.node_id,
                receiver_id=msg.sender_id,
            )

        elif msg.message_type == MessageType.ADMIN_STOP:
            self.logger.info("Admin stop command received. Halting node.")
            self.state.status = NodeStatus.FAILED
            asyncio.create_task(self.shutdown())
            return NetworkMessage(
                message_type=MessageType.OK,
                sender_id=self.node_id,
                receiver_id=msg.sender_id,
            )

        return None

    async def start(self) -> None:
        await self.server.start()
        self.failure_detector.start()
        self.logger.info("Node %s started on %s:%s with peers %s", self.node_id, self.host, self.port, self.peers)

    async def shutdown(self) -> None:
        self.failure_detector.stop()
        await self.server.stop()
        self._stop_event.set()

    async def wait_stopped(self) -> None:
        await self._stop_event.wait()


async def run_node(args: argparse.Namespace) -> None:
    # Parse peer mappings "id:port,id:port"
    peer_dict: Dict[int, int] = {}
    if args.peers:
        for item in args.peers.split(","):
            if ":" in item:
                pid, port = item.split(":")
                peer_dict[int(pid)] = int(port)

    runtime = NodeRuntime(
        node_id=args.id,
        port=args.port,
        peers=peer_dict,
        host=args.host,
        api_url=args.api_url,
        heartbeat_interval=args.heartbeat_interval,
        heartbeat_timeout=args.heartbeat_timeout,
        election_timeout=args.election_timeout,
    )

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, lambda: asyncio.create_task(runtime.shutdown()))
        except (NotImplementedError, RuntimeError):
            pass

    await runtime.start()
    await runtime.wait_stopped()


def main():
    parser = argparse.ArgumentParser(description="Distributed Leader Election Node Process")
    parser.add_argument("--id", type=int, required=True, help="Node ID")
    parser.add_argument("--port", type=int, required=True, help="TCP port to listen on")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host address")
    parser.add_argument("--peers", type=str, default="", help="Peers as comma separated id:port (e.g. 2:9002,3:9003)")
    parser.add_argument(
        "--api-url", type=str, default="http://127.0.0.1:8000", help="Backend API URL for event logging"
    )
    parser.add_argument("--heartbeat-interval", type=float, default=2.0, help="Heartbeat interval in seconds")
    parser.add_argument("--heartbeat-timeout", type=float, default=5.0, help="Heartbeat timeout in seconds")
    parser.add_argument("--election-timeout", type=float, default=4.0, help="Election timeout in seconds")

    args = parser.parse_args()
    try:
        asyncio.run(run_node(args))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
