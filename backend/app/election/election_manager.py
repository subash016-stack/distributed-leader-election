import logging
from typing import List, Optional

from app.models.events import CoordinatorRecord

logger = logging.getLogger("ElectionManager")


class ElectionManager:
    """Tracks election history and coordinator records."""

    def __init__(self):
        self.history: List[CoordinatorRecord] = []
        self.current_coordinator: Optional[int] = None
        self.election_in_progress: bool = False
        self.latest_election_id: Optional[str] = None

    def record_transition(
        self,
        new_coordinator: int,
        previous_coordinator: Optional[int],
        trigger_node: Optional[int],
        reason: str,
        election_id: Optional[str],
        generation: int,
    ) -> CoordinatorRecord:
        record = CoordinatorRecord(
            previous_coordinator=previous_coordinator,
            new_coordinator=new_coordinator,
            trigger_node=trigger_node,
            reason=reason,
            election_id=election_id,
            generation=generation,
            status="COMPLETED",
        )
        self.history.append(record)
        self.current_coordinator = new_coordinator
        self.election_in_progress = False
        self.latest_election_id = election_id
        logger.info(
            "Election recorded: New coordinator %s (prev: %s, trigger: %s, reason: %s)",
            new_coordinator,
            previous_coordinator,
            trigger_node,
            reason,
        )
        return record

    def clear(self) -> None:
        self.history.clear()
        self.current_coordinator = None
        self.election_in_progress = False
        self.latest_election_id = None
