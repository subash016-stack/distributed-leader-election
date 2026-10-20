import asyncio
import logging
from typing import Awaitable, Callable, Optional

from app.models.messages import NetworkMessage
from app.network.protocol import decode_message, encode_message

logger = logging.getLogger("TCPServer")

MessageHandler = Callable[[NetworkMessage], Awaitable[Optional[NetworkMessage]]]


class AsyncTCPServer:
    """Async TCP Server for an individual node process."""

    def __init__(self, host: str, port: int, handler: MessageHandler):
        self.host = host
        self.port = port
        self.handler = handler
        self._server: Optional[asyncio.Server] = None
        self._is_running = False

    async def start(self) -> None:
        self._server = await asyncio.start_server(self._handle_client, self.host, self.port, reuse_address=True)
        self._is_running = True
        logger.info("TCP Server listening on %s:%s", self.host, self.port)

    async def _handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        try:
            while not reader.at_eof() and self._is_running:
                line_bytes = await reader.readline()
                if not line_bytes:
                    break
                line = line_bytes.decode("utf-8", errors="ignore")
                msg = decode_message(line)
                if msg:
                    response_msg = await self.handler(msg)
                    if response_msg:
                        resp_bytes = encode_message(response_msg)
                        writer.write(resp_bytes)
                        await writer.drain()
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.debug("Error handling TCP client connection: %s", exc)
        finally:
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass

    async def stop(self) -> None:
        self._is_running = False
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            self._server = None
            logger.info("TCP Server stopped on port %s", self.port)
