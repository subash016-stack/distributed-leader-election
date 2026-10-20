from fastapi import APIRouter

from app.models.node import TopologyData
from app.services.state_service import state_service

router = APIRouter(prefix="/topology", tags=["Topology"])


@router.get("", response_model=TopologyData)
async def get_network_topology():
    """Retrieve full network topology with nodes and edges."""
    return await state_service.get_topology()
