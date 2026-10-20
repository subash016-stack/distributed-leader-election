from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class NodeStatus(str, Enum):
    ALIVE = "ALIVE"
    FAILED = "FAILED"
    SUSPECTED = "SUSPECTED"
    ELECTION = "ELECTION"
    OFFLINE = "OFFLINE"


class NodeInfo(BaseModel):
    id: int
    host: str = "127.0.0.1"
    port: int
    status: NodeStatus = NodeStatus.OFFLINE
    is_coordinator: bool = False
    current_coordinator: Optional[int] = None
    election_generation: int = 0
    pid: Optional[int] = None
    started_at: Optional[float] = None
    last_heartbeat: Optional[float] = None
    peers: List[int] = Field(default_factory=list)


class NodeConfig(BaseModel):
    id: int
    host: str = "127.0.0.1"
    port: int
    peers: Dict[int, int]  # peer_id -> peer_port


class NetworkEdge(BaseModel):
    source: int
    target: int


class TopologyData(BaseModel):
    nodes: List[NodeInfo]
    edges: List[NetworkEdge]
    total_nodes: int
    active_nodes: int
    failed_nodes: int
    current_coordinator: Optional[int] = None
    is_connected: bool = True
