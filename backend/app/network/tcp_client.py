import asyncio
import logging
from typing import Optional, Tuple

from app.models.messages import NetworkMessage
from app.network.protocol import decode_message, encode_message

logger = logging.getLogger("TCPClient")


async def send_message_async(
    host: str, port: int, message: NetworkMessage, timeout: float = 2.0, wait_response: bool = False
) -> Tuple[bool, Optional[NetworkMessage]]:
    """Send a message to target host:port over TCP.
    Returns (success, response_message_if_any).
    """
    writer = None
    try:
        connect_coro = asyncio.open_connection(host, port)
        reader, writer = await asyncio.wait_for(connect_coro, timeout=timeout)

        data = encode_message(message)
        writer.write(data)
        await writer.drain()

        if wait_response:
            line = await asyncio.wait_for(reader.readline(), timeout=timeout)
            if line:
                decoded = decode_message(line.decode("utf-8", errors="ignore"))
                return True, decoded
            return True, None

        return True, None
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError) as exc:
        logger.debug("Failed to send message to %s:%s - %s", host, port, exc)
        return False, None
    except Exception as exc:
        logger.warning("Unexpected error sending message to %s:%s - %s", host, port, exc)
        return False, None
    finally:
        if writer:
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass
