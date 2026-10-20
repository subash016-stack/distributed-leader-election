import time
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class MessageType(str, Enum):
    ELECTION = "ELECTION"
    OK = "OK"
    COORDINATOR = "COORDINATOR"
    HEARTBEAT = "HEARTBEAT"
    HEARTBEAT_ACK = "HEARTBEAT_ACK"
    ADMIN_PING = "ADMIN_PING"
    ADMIN_STATUS = "ADMIN_STATUS"
    ADMIN_STOP = "ADMIN_STOP"
    START_ELECTION = "START_ELECTION"


class NetworkMessage(BaseModel):
    message_type: MessageType
    sender_id: int
    receiver_id: int
    election_id: Optional[str] = None
    generation: int = 0
    timestamp: float = Field(default_factory=time.time)
    payload: Dict[str, Any] = Field(default_factory=dict)
