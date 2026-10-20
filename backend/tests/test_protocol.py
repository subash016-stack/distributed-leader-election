from app.models.messages import MessageType, NetworkMessage
from app.network.protocol import decode_message, encode_message


def test_encode_decode_valid_message():
    msg = NetworkMessage(
        message_type=MessageType.ELECTION,
        sender_id=1,
        receiver_id=5,
        election_id="elect-123",
        generation=2,
        payload={"reason": "test"},
    )
    encoded = encode_message(msg)
    assert encoded.endswith(b"\n")

    decoded = decode_message(encoded.decode("utf-8"))
    assert decoded is not None
    assert decoded.message_type == MessageType.ELECTION
    assert decoded.sender_id == 1
    assert decoded.receiver_id == 5
    assert decoded.election_id == "elect-123"
    assert decoded.generation == 2
    assert decoded.payload["reason"] == "test"


def test_decode_malformed_json():
    assert decode_message("not valid json\n") is None
    assert decode_message("") is None
    assert decode_message("   \n") is None
    assert decode_message('{"invalid_structure": true}\n') is None


def test_decode_unknown_message_type():
    raw = '{"message_type": "UNKNOWN_ACTION", "sender_id": 1, "receiver_id": 2, "generation": 0, "payload": {}}\n'
    assert decode_message(raw) is None
