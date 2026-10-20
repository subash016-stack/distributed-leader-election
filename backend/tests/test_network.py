import pytest

from app.models.messages import MessageType, NetworkMessage
from app.network.tcp_client import send_message_async
from app.network.tcp_server import AsyncTCPServer


@pytest.mark.asyncio
async def test_tcp_send_and_receive():
    received_messages = []

    async def mock_handler(msg: NetworkMessage):
        received_messages.append(msg)
        if msg.message_type == MessageType.ELECTION:
            return NetworkMessage(
                message_type=MessageType.OK,
                sender_id=msg.receiver_id,
                receiver_id=msg.sender_id,
                generation=msg.generation,
            )
        return None

    # Pick test port
    test_port = 9876
    server = AsyncTCPServer("127.0.0.1", test_port, mock_handler)
    await server.start()

    try:
        # Send ELECTION message from Node 1 to Node 2
        election_msg = NetworkMessage(message_type=MessageType.ELECTION, sender_id=1, receiver_id=2, generation=1)
        success, response = await send_message_async(
            "127.0.0.1", test_port, election_msg, timeout=2.0, wait_response=True
        )

        assert success is True
        assert len(received_messages) == 1
        assert received_messages[0].message_type == MessageType.ELECTION
        assert response is not None
        assert response.message_type == MessageType.OK
        assert response.sender_id == 2
        assert response.receiver_id == 1

    finally:
        await server.stop()


@pytest.mark.asyncio
async def test_tcp_connection_refused():
    msg = NetworkMessage(message_type=MessageType.HEARTBEAT, sender_id=1, receiver_id=99, generation=0)
    # Port 59999 has nothing listening
    success, resp = await send_message_async("127.0.0.1", 59999, msg, timeout=0.5)
    assert success is False
    assert resp is None
