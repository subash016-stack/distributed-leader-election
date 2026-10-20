import asyncio
import logging
import time
import uuid
from typing import Awaitable, Callable, Optional

from app.models.events import EventType, SystemEvent
from app.models.messages import MessageType, NetworkMessage
from app.models.node import NodeStatus
from app.network.tcp_client import send_message_async
from app.nodes.node_state import NodeState

logger = logging.getLogger("BullyEngine")

EventCallback = Callable[[SystemEvent], Awaitable[None]]


class BullyElectionEngine:
    """Implements the Bully Leader Election algorithm over TCP."""

    def __init__(
        self,
        state: NodeState,
        election_timeout: float = 4.0,
        event_callback: Optional[EventCallback] = None,
    ):
        self.state = state
        self.election_timeout = election_timeout
        self.event_callback = event_callback
        self._election_lock = asyncio.Lock()
        self._election_task: Optional[asyncio.Task] = None
        self._coordinator_event = asyncio.Event()

    async def emit_event(
        self,
        event_type: EventType,
        description: str,
        receiver_id: Optional[int] = None,
        election_id: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> None:
        if self.event_callback:
            event = SystemEvent(
                event_type=event_type,
                sender_id=self.state.node_id,
                receiver_id=receiver_id,
                election_id=election_id or self.state.current_election_id,
                generation=self.state.generation,
                description=description,
                details=details or {},
            )
            try:
                await self.event_callback(event)
            except Exception as exc:
                logger.debug("Failed to emit event: %s", exc)

    async def initiate_election(self, reason: str = "Failure detected") -> None:
        """Start a new Bully election run."""
        if self.state.status == NodeStatus.FAILED:
            logger.warning("Node %s is failed and cannot initiate election", self.state.node_id)
            return

        async with self._election_lock:
            self.state.generation += 1
            election_id = f"elect-{self.state.node_id}-{int(time.time() * 1000)}-{uuid.uuid4().hex[:4]}"
            self.state.current_election_id = election_id
            self.state.status = NodeStatus.ELECTION
            self.state.election_in_progress = True
            self.state.waiting_for_higher_node = False
            self._coordinator_event.clear()

            logger.info(
                "Node %s initiating Bully election %s (gen %s). Reason: %s",
                self.state.node_id,
                election_id,
                self.state.generation,
                reason,
            )
            await self.emit_event(
                EventType.ELECTION_STARTED,
                f"Node {self.state.node_id} initiated leader election. Reason: {reason}",
                election_id=election_id,
                details={"reason": reason},
            )

            higher_peers = self.state.higher_peers()
            if not higher_peers:
                # No higher nodes exist in the network: this node is the highest!
                logger.info("Node %s has no higher peers. Declaring coordinator immediately.", self.state.node_id)
                await self.declare_coordinator()
                return

            # Broadcast ELECTION messages to all higher peers
            ok_received = False
            higher_tasks = []
            for peer_id, peer_port in higher_peers.items():
                election_msg = NetworkMessage(
                    message_type=MessageType.ELECTION,
                    sender_id=self.state.node_id,
                    receiver_id=peer_id,
                    election_id=election_id,
                    generation=self.state.generation,
                )
                self.state.record_message("OUT", "ELECTION", peer_id, f"Election {election_id}")
                await self.emit_event(
                    EventType.ELECTION_MESSAGE_SENT,
                    f"Node {self.state.node_id} sent ELECTION message to higher Node {peer_id}",
                    receiver_id=peer_id,
                    election_id=election_id,
                )
                higher_tasks.append(
                    send_message_async(self.state.host, peer_port, election_msg, timeout=1.5, wait_response=True)
                )

            # Wait for responses from higher nodes
            results = await asyncio.gather(*higher_tasks, return_exceptions=True)
            for res in results:
                if isinstance(res, tuple) and res[0]:
                    ok_msg = res[1]
                    if ok_msg and ok_msg.message_type == MessageType.OK:
                        ok_received = True
                        logger.info("Node %s received OK from higher node %s", self.state.node_id, ok_msg.sender_id)
                        self.state.record_message("IN", "OK", ok_msg.sender_id, "Higher node took over")
                        await self.emit_event(
                            EventType.OK_MESSAGE_RECEIVED,
                            f"Node {self.state.node_id} received OK from higher Node {ok_msg.sender_id}",
                            receiver_id=ok_msg.sender_id,
                            election_id=election_id,
                        )

            if ok_received:
                # At least one higher node is alive and responded with OK.
                # We wait for that higher node to finish the election and broadcast COORDINATOR.
                self.state.waiting_for_higher_node = True
                try:
                    await asyncio.wait_for(self._coordinator_event.wait(), timeout=self.election_timeout)
                    logger.info("Node %s: Coordinator announced while waiting for higher node", self.state.node_id)
                except asyncio.TimeoutError:
                    logger.warning(
                        "Node %s: Timeout waiting for higher node to announce coordinator. Re-initiating election.",
                        self.state.node_id,
                    )
                    # Higher node might have crashed while running election. Re-initiate!
                    if self.state.status == NodeStatus.ELECTION:
                        await self.declare_coordinator()
            else:
                # No higher node responded with OK before timeout.
                # This node wins and declares itself coordinator!
                logger.info(
                    "Node %s received no OK responses from higher nodes. Declaring victory.", self.state.node_id
                )
                await self.declare_coordinator()

    async def handle_election_message(self, msg: NetworkMessage) -> Optional[NetworkMessage]:
        """Handle incoming ELECTION message from a lower-ID node."""
        if self.state.status == NodeStatus.FAILED:
            return None

        self.state.record_message("IN", "ELECTION", msg.sender_id, f"Gen {msg.generation}")

        # In Bully algorithm: reply with OK to lower node
        ok_msg = NetworkMessage(
            message_type=MessageType.OK,
            sender_id=self.state.node_id,
            receiver_id=msg.sender_id,
            election_id=msg.election_id,
            generation=self.state.generation,
        )
        self.state.record_message("OUT", "OK", msg.sender_id, "Acknowledging election")

        # Now start our own election if we haven't already
        if not self.state.election_in_progress and not self.state.is_coordinator:
            asyncio.create_task(self.initiate_election(reason=f"Election message received from Node {msg.sender_id}"))

        return ok_msg

    async def declare_coordinator(self) -> None:
        """Declare this node as coordinator and broadcast to all peers."""
        if self.state.status == NodeStatus.FAILED:
            return

        old_coord = self.state.coordinator_id
        self.state.is_coordinator = True
        self.state.coordinator_id = self.state.node_id
        self.state.status = NodeStatus.ALIVE
        self.state.election_in_progress = False
        self.state.waiting_for_higher_node = False
        self._coordinator_event.set()

        logger.info("🏆 Node %s declared itself as NEW COORDINATOR!", self.state.node_id)
        await self.emit_event(
            EventType.COORDINATOR_ANNOUNCED,
            f"🏆 Node {self.state.node_id} declared itself COORDINATOR!",
            details={"previous_coordinator": old_coord, "new_coordinator": self.state.node_id},
        )
        await self.emit_event(
            EventType.COORDINATOR_CHANGED,
            f"Coordinator changed: Node {old_coord} -> Node {self.state.node_id}",
            details={"previous_coordinator": old_coord, "new_coordinator": self.state.node_id},
        )

        # Broadcast COORDINATOR message to all peers
        coord_msg = NetworkMessage(
            message_type=MessageType.COORDINATOR,
            sender_id=self.state.node_id,
            receiver_id=0,  # Broadcast
            election_id=self.state.current_election_id,
            generation=self.state.generation,
            payload={"coordinator_id": self.state.node_id},
        )

        broadcast_tasks = []
        for peer_id, peer_port in self.state.peers.items():
            peer_coord_msg = coord_msg.model_copy()
            peer_coord_msg.receiver_id = peer_id
            self.state.record_message("OUT", "COORDINATOR", peer_id, "Victory broadcast")
            broadcast_tasks.append(send_message_async(self.state.host, peer_port, peer_coord_msg, timeout=1.5))

        if broadcast_tasks:
            await asyncio.gather(*broadcast_tasks, return_exceptions=True)

    async def handle_coordinator_message(self, msg: NetworkMessage) -> Optional[NetworkMessage]:
        """Handle incoming COORDINATOR victory announcement."""
        if self.state.status == NodeStatus.FAILED:
            return None

        self.state.record_message("IN", "COORDINATOR", msg.sender_id, f"Node {msg.sender_id} won")

        # Stale-message check: if sender is lower than this node and this node is healthy
        if msg.sender_id < self.state.node_id:
            logger.warning(
                "Node %s received COORDINATOR message from lower node %s. Rejecting and asserting leadership!",
                self.state.node_id,
                msg.sender_id,
            )
            # Re-assert election
            asyncio.create_task(self.initiate_election(reason=f"Lower node {msg.sender_id} falsely claimed leadership"))
            return None

        old_coord = self.state.coordinator_id
        new_coord = msg.sender_id
        self.state.coordinator_id = new_coord
        self.state.is_coordinator = new_coord == self.state.node_id
        self.state.status = NodeStatus.ALIVE
        self.state.election_in_progress = False
        self.state.waiting_for_higher_node = False
        self._coordinator_event.set()

        logger.info("Node %s accepted Node %s as coordinator", self.state.node_id, new_coord)
        if old_coord != new_coord:
            await self.emit_event(
                EventType.COORDINATOR_CHANGED,
                f"Node {self.state.node_id} acknowledged new coordinator: Node {new_coord}",
                details={"previous_coordinator": old_coord, "new_coordinator": new_coord},
            )

        return None
