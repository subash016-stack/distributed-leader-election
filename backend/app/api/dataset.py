from typing import Any, Dict, Optional

from dataset.dataset_manager import dataset_manager
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/dataset", tags=["Dataset"])


class SubgraphRequest(BaseModel):
    size: int = 10
    seed: int = 42
    start_node: Optional[int] = None


@router.get("/info")
def get_dataset_info() -> Dict[str, Any]:
    """Retrieve SNAP Gnutella dataset metadata, published statistics, and citations."""
    if not dataset_manager.stats:
        dataset_manager.load_and_parse()
    return dataset_manager.stats


@router.get("/topology")
def get_dataset_topology(size: int = Query(default=10, ge=4, le=500), seed: int = Query(default=42)):
    """Retrieve a connected subgraph of the Gnutella network for topology display."""
    try:
        _, meta = dataset_manager.get_connected_subgraph(size=size, seed=seed)
        return meta
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/subgraph")
def select_subgraph(request: SubgraphRequest):
    """Extract and select a specific connected subgraph for experiments."""
    try:
        _, meta = dataset_manager.get_connected_subgraph(
            size=request.size, seed=request.seed, start_node=request.start_node
        )
        return meta
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
