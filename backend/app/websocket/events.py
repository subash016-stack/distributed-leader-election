import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.event_service import event_service

logger = logging.getLogger("WebSocket")
router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await event_service.connect(websocket)
    try:
        while True:
            # Keep connection open and receive optional ping messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await event_service.disconnect(websocket)
    except Exception as exc:
        logger.debug("WebSocket exception: %s", exc)
        await event_service.disconnect(websocket)
