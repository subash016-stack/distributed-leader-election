from typing import List

from fastapi import APIRouter, Query

from app.models.events import EventType, SystemEvent
from app.services.event_service import event_service
from app.services.simulation_service import simulation_service

router = APIRouter(tags=["Events"])


@router.get("/events", response_model=List[SystemEvent])
async def get_system_events(limit: int = Query(default=100, ge=1, le=500)):
    """Retrieve recent system events."""
    return event_service.get_events(limit=limit)


@router.post("/internal/events")
async def report_internal_event(event: SystemEvent):
    """Internal callback for independent node processes to report state transitions."""
    await event_service.publish(event)

    # If coordinator changed, record in election manager
    if event.event_type == EventType.COORDINATOR_CHANGED:
        prev_coord = event.details.get("previous_coordinator")
        new_coord = event.details.get("new_coordinator", event.sender_id)
        if new_coord is not None:
            simulation_service.election_manager.record_transition(
                new_coordinator=new_coord,
                previous_coordinator=prev_coord,
                trigger_node=event.sender_id,
                reason=event.description,
                election_id=event.election_id,
                generation=event.generation,
            )

    return {"status": "ok"}
