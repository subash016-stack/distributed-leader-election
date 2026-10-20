from typing import List

from fastapi import APIRouter, HTTPException, Path

from app.models.node import NodeInfo
from app.services.simulation_service import simulation_service
from app.services.state_service import state_service

router = APIRouter(prefix="/nodes", tags=["Nodes"])


@router.get("", response_model=List[NodeInfo])
async def list_nodes():
    """Retrieve runtime state of all nodes."""
    return await state_service.get_nodes()


@router.get("/{node_id}", response_model=NodeInfo)
async def get_node_details(node_id: int = Path(..., description="The ID of the node")):
    """Get detailed state for a specific node."""
    if node_id not in simulation_service.topology_manager.node_configs:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found in topology")
    info = await simulation_service.node_manager.query_node_status(node_id)
    return info


@router.post("/{node_id}/fail")
async def fail_node(node_id: int = Path(..., description="The ID of the node to fail")):
    """Manually fail a node process."""
    if node_id not in simulation_service.topology_manager.node_configs:
        raise HTTPException(status_code=404, detail=f"Node {node_id} does not exist")
    success = await simulation_service.fail_node(node_id)
    return {"status": "success" if success else "failed", "node_id": node_id, "action": "failed"}


@router.post("/{node_id}/restart")
async def restart_node(node_id: int = Path(..., description="The ID of the node to restart")):
    """Restart a failed node process."""
    if node_id not in simulation_service.topology_manager.node_configs:
        raise HTTPException(status_code=404, detail=f"Node {node_id} does not exist")
    success = await simulation_service.restart_node(node_id)
    return {"status": "success" if success else "failed", "node_id": node_id, "action": "restarted"}
