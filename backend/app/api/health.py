from typing import Dict

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check() -> Dict[str, str]:
    return {"status": "ok", "service": "Distributed Leader Election Backend", "version": "1.0.0"}
