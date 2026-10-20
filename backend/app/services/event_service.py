import asyncio
import logging
from typing import List, Set

from fastapi import WebSocket

from app.models.events import SystemEvent

logger = logging.getLogger("EventService")


class EventService:
    """Central event bus that persists recent events and broadcasts to WebSocket clients."""

    def __init__(self, max_history: int = 500):
        self.max_history = max_history
        self.events: List[SystemEvent] = []
        self._subscribers: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._subscribers.add(websocket)
        logger.info("WebSocket client connected. Active subscribers: %d", len(self._subscribers))

        # Send recent events to newly connected client
        for event in self.events[-30:]:
            try:
                await websocket.send_text(event.model_dump_json())
            except Exception:
                break

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._subscribers.discard(websocket)
        logger.info("WebSocket client disconnected. Remaining subscribers: %d", len(self._subscribers))

    async def publish(self, event: SystemEvent) -> None:
        """Store event in history and broadcast to all connected WebSocket clients."""
        async with self._lock:
            self.events.append(event)
            if len(self.events) > self.max_history:
                self.events.pop(0)

        payload = event.model_dump_json()
        disconnected: Set[WebSocket] = set()

        for ws in list(self._subscribers):
            try:
                await ws.send_text(payload)
            except Exception:
                disconnected.add(ws)

        if disconnected:
            async with self._lock:
                for ws in disconnected:
                    self._subscribers.discard(ws)

    def get_events(self, limit: int = 100) -> List[SystemEvent]:
        return self.events[-limit:]

    def clear(self) -> None:
        self.events.clear()


event_service = EventService()
