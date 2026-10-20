from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body
from pydantic import BaseModel

from app.models.events import CoordinatorRecord
from app.services.simulation_service import simulation_service
from app.services.state_service import state_service

router = APIRouter(prefix="/election", tags=["Election"])


class ElectionStartRequest(BaseModel):
    initiator_id: Optional[int] = None


@router.get("/status")
async def get_election_status() -> Dict[str, Any]:
    """Retrieve current coordinator and election status."""
    return await state_service.get_election_status()


@router.get("/history", response_model=List[CoordinatorRecord])
async def get_election_history():
    """Retrieve history of coordinators and election events."""
    return state_service.get_election_history()


@router.post("/start")
async def start_election(request: Optional[ElectionStartRequest] = Body(default=None)):
    """Manually initiate a Bully leader election."""
    initiator_id = request.initiator_id if request else None
    success = await simulation_service.trigger_manual_election(initiator_id)
    return {"status": "success" if success else "failed", "action": "election_triggered", "initiator_id": initiator_id}
