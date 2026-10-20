import asyncio
import logging
import time
from typing import Awaitable, Callable, Optional

from app.models.events import EventType, SystemEvent
from app.models.messages import MessageType, NetworkMessage
from app.models.node import NodeStatus
from app.network.tcp_client import send_message_async
from app.nodes.node_state import NodeState

logger = logging.getLogger("FailureDetector")

EventCallback = Callable[[SystemEvent], Awaitable[None]]
ElectionTrigger = Callable[[str], Awaitable[None]]


class HeartbeatFailureDetector:
    """Monitors the coordinator by sending periodic TCP heartbeats and detecting timeouts."""

    def __init__(
        self,
        state: NodeState,
        heartbeat_interval: float = 2.0,
        heartbeat_timeout: float = 5.0,
        trigger_election: Optional[ElectionTrigger] = None,
        event_callback: Optional[EventCallback] = None,
    ):
        self.state = state
        self.heartbeat_interval = heartbeat_interval
        self.heartbeat_timeout = heartbeat_timeout
        self.trigger_election = trigger_election
        self.event_callback = event_callback
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._consecutive_misses = 0

    async def emit_event(
        self, event_type: EventType, description: str, receiver_id: Optional[int] = None, details: Optional[dict] = None
    ) -> None:
        if self.event_callback:
            event = SystemEvent(
                event_type=event_type,
                sender_id=self.state.node_id,
                receiver_id=receiver_id,
                generation=self.state.generation,
                description=description,
                details=details or {},
            )
            try:
                await self.event_callback(event)
            except Exception as exc:
                logger.debug("Failed to emit event: %s", exc)

    def start(self) -> None:
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._loop())
            logger.info("Failure detector started for Node %s", self.state.node_id)

    def stop(self) -> None:
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("Failure detector stopped for Node %s", self.state.node_id)

    async def _loop(self) -> None:
        while self._running:
            try:
                await asyncio.sleep(self.heartbeat_interval)
                if not self._running:
                    break

                # If this node is failed, or in election, or is coordinator, skip sending heartbeats
                if (
                    self.state.status == NodeStatus.FAILED
                    or self.state.is_coordinator
                    or self.state.election_in_progress
                    or self.state.coordinator_id is None
                ):
                    continue

                coord_id = self.state.coordinator_id
                coord_port = self.state.peers.get(coord_id)
                if not coord_port:
                    continue

                # Send HEARTBEAT over TCP
                hb_msg = NetworkMessage(
                    message_type=MessageType.HEARTBEAT,
                    sender_id=self.state.node_id,
                    receiver_id=coord_id,
                    generation=self.state.generation,
                )
                self.state.last_heartbeat_sent = time.time()
                self.state.record_message("OUT", "HEARTBEAT", coord_id, "Ping")

                success, resp = await send_message_async(
                    self.state.host, coord_port, hb_msg, timeout=1.5, wait_response=True
                )

                if success and resp and resp.message_type == MessageType.HEARTBEAT_ACK:
                    self.state.last_heartbeat_ack_received = time.time()
                    self._consecutive_misses = 0
                    self.state.record_message("IN", "HEARTBEAT_ACK", coord_id, "Ack")
                else:
                    self._consecutive_misses += 1
                    logger.warning(
                        "Node %s missed heartbeat to Coordinator %s (miss count: %d)",
                        self.state.node_id,
                        coord_id,
                        self._consecutive_misses,
                    )

                    # Check if missed threshold represents timeout
                    if self._consecutive_misses >= 2:
                        logger.error(
                            "Node %s detected failure of Coordinator %s! Triggering election.",
                            self.state.node_id,
                            coord_id,
                        )
                        await self.emit_event(
                            EventType.HEARTBEAT_TIMEOUT,
                            f"Node {self.state.node_id} detected failure of Coordinator {coord_id} (heartbeat timeout)",
                            receiver_id=coord_id,
                            details={"failed_coordinator": coord_id, "misses": self._consecutive_misses},
                        )
                        self._consecutive_misses = 0
                        if self.trigger_election:
                            await self.trigger_election(f"Heartbeat timeout for coordinator {coord_id}")
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.debug("Error in failure detector loop: %s", exc)
