import time
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class MPIMessageTag(int, Enum):
    ELECTION = 101
    COORDINATOR = 102
    HEARTBEAT = 103
    HEARTBEAT_ACK = 104
    ADMIN_CONTROL = 105
    ROUND_SYNC = 106


class MPIMessage(BaseModel):
    tag: MPIMessageTag
    sender_rank: int
    sender_node_id: int
    dest_rank: int
    dest_node_id: int
    generation: int = 0
    round_num: int = 0
    candidate_id: int = 0
    timestamp: float = Field(default_factory=time.time)
    payload: dict[str, Any] = Field(default_factory=dict)
