from typing import Dict

from fastapi import APIRouter

from app.services.simulation_service import simulation_service

router = APIRouter(prefix="/simulation", tags=["Simulation"])


@router.post("/start")
async def start_simulation() -> Dict[str, str]:
    """Start the distributed simulation and launch node processes."""
    await simulation_service.start()
    return {"status": "success", "message": "Simulation started"}


@router.post("/stop")
async def stop_simulation() -> Dict[str, str]:
    """Stop all running node processes."""
    await simulation_service.stop()
    return {"status": "success", "message": "Simulation stopped"}


@router.post("/reset")
async def reset_simulation() -> Dict[str, str]:
    """Reset the simulation back to initial clean state."""
    await simulation_service.reset()
    return {"status": "success", "message": "Simulation reset completed"}
