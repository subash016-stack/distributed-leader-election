import time
import uuid
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class EventType(str, Enum):
    SIMULATION_STARTED = "SIMULATION_STARTED"
    SIMULATION_STOPPED = "SIMULATION_STOPPED"
    SIMULATION_RESET = "SIMULATION_RESET"
    NODE_SPAWNED = "NODE_SPAWNED"
    NODE_CONNECTED = "NODE_CONNECTED"
    NODE_FAILED = "NODE_FAILED"
    NODE_RECOVERED = "NODE_RECOVERED"
    HEARTBEAT_SENT = "HEARTBEAT_SENT"
    HEARTBEAT_ACK_RECEIVED = "HEARTBEAT_ACK_RECEIVED"
    HEARTBEAT_TIMEOUT = "HEARTBEAT_TIMEOUT"
    ELECTION_STARTED = "ELECTION_STARTED"
    ELECTION_MESSAGE_SENT = "ELECTION_MESSAGE_SENT"
    OK_MESSAGE_RECEIVED = "OK_MESSAGE_RECEIVED"
    COORDINATOR_ANNOUNCED = "COORDINATOR_ANNOUNCED"
    COORDINATOR_CHANGED = "COORDINATOR_CHANGED"


class SystemEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = Field(default_factory=time.time)
    event_type: EventType
    sender_id: Optional[int] = None
    receiver_id: Optional[int] = None
    election_id: Optional[str] = None
    generation: int = 0
    description: str
    details: Dict[str, Any] = Field(default_factory=dict)


class CoordinatorRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = Field(default_factory=time.time)
    previous_coordinator: Optional[int] = None
    new_coordinator: int
    trigger_node: Optional[int] = None
    reason: str
    election_id: Optional[str] = None
    generation: int
    status: str = "COMPLETED"
