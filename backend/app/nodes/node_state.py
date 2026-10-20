import time
from typing import Dict, List, Optional

from app.models.node import NodeStatus


class NodeState:
    """Maintains local state for an individual node."""

    def __init__(self, node_id: int, port: int, host: str = "127.0.0.1", peers: Optional[Dict[int, int]] = None):
        self.node_id = node_id
        self.port = port
        self.host = host
        self.peers: Dict[int, int] = peers or {}  # peer_id -> port
        self.status: NodeStatus = NodeStatus.ALIVE
        self.is_coordinator: bool = False
        self.coordinator_id: Optional[int] = None
        self.current_election_id: Optional[str] = None
        self.generation: int = 0
        self.election_in_progress: bool = False
        self.waiting_for_higher_node: bool = False
        self.last_heartbeat_sent: Optional[float] = None
        self.last_heartbeat_ack_received: Optional[float] = None
        self.started_at: float = time.time()
        self.recent_messages: List[Dict[str, any]] = []

    def higher_peers(self) -> Dict[int, int]:
        """Return dict of peers with ID greater than this node's ID."""
        return {pid: port for pid, port in self.peers.items() if pid > self.node_id}

    def lower_peers(self) -> Dict[int, int]:
        """Return dict of peers with ID less than this node's ID."""
        return {pid: port for pid, port in self.peers.items() if pid < self.node_id}

    def record_message(self, direction: str, msg_type: str, peer_id: int, details: str = "") -> None:
        self.recent_messages.append(
            {"timestamp": time.time(), "direction": direction, "type": msg_type, "peer_id": peer_id, "details": details}
        )
        if len(self.recent_messages) > 50:
            self.recent_messages.pop(0)
