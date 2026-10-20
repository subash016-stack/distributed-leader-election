import json
import logging
from typing import Optional

from app.models.messages import NetworkMessage

logger = logging.getLogger("Protocol")


def encode_message(msg: NetworkMessage) -> bytes:
    """Encode NetworkMessage to newline-delimited JSON bytes."""
    data = msg.model_dump_json()
    return (data + "\n").encode("utf-8")


def decode_message(raw_line: str) -> Optional[NetworkMessage]:
    """Parse a single newline-delimited string into a validated NetworkMessage.
    Returns None if malformed or invalid without throwing an unhandled exception.
    """
    cleaned = raw_line.strip()
    if not cleaned:
        return None
    try:
        data = json.loads(cleaned)
        return NetworkMessage.model_validate(data)
    except Exception as exc:
        logger.warning("Failed to decode message: %s. Error: %s", cleaned, exc)
        return None
