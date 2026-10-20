import pytest

from app.election.bully_algorithm import BullyElectionEngine
from app.models.messages import MessageType, NetworkMessage
from app.models.node import NodeStatus
from app.nodes.node_state import NodeState


@pytest.mark.asyncio
async def test_highest_node_declares_coordinator():
    # Node 5 has no higher peers
    state5 = NodeState(node_id=5, port=9005, peers={1: 9001, 2: 9002, 3: 9003, 4: 9004})
    engine5 = BullyElectionEngine(state=state5, election_timeout=1.0)

    await engine5.initiate_election(reason="Initial test election")

    assert state5.is_coordinator is True
    assert state5.coordinator_id == 5
    assert state5.status == NodeStatus.ALIVE
    assert state5.election_in_progress is False


@pytest.mark.asyncio
async def test_handle_election_message_returns_ok():
    state4 = NodeState(node_id=4, port=9004, peers={1: 9001, 2: 9002, 3: 9003, 5: 9005})
    engine4 = BullyElectionEngine(state=state4, election_timeout=1.0)

    # Node 2 sends ELECTION to Node 4
    incoming = NetworkMessage(
        message_type=MessageType.ELECTION, sender_id=2, receiver_id=4, election_id="elect-test-1", generation=1
    )
    ok_resp = await engine4.handle_election_message(incoming)

    assert ok_resp is not None
    assert ok_resp.message_type == MessageType.OK
    assert ok_resp.sender_id == 4
    assert ok_resp.receiver_id == 2


@pytest.mark.asyncio
async def test_handle_coordinator_message():
    state2 = NodeState(node_id=2, port=9002, peers={1: 9001, 3: 9003, 4: 9004, 5: 9005})
    engine2 = BullyElectionEngine(state=state2, election_timeout=1.0)

    coord_msg = NetworkMessage(
        message_type=MessageType.COORDINATOR,
        sender_id=4,
        receiver_id=2,
        election_id="elect-test-2",
        generation=1,
        payload={"coordinator_id": 4},
    )
    await engine2.handle_coordinator_message(coord_msg)

    assert state2.coordinator_id == 4
    assert state2.is_coordinator is False
    assert state2.status == NodeStatus.ALIVE


@pytest.mark.asyncio
async def test_failed_node_does_not_participate():
    state5 = NodeState(node_id=5, port=9005, peers={1: 9001})
    state5.status = NodeStatus.FAILED
    engine5 = BullyElectionEngine(state=state5, election_timeout=1.0)

    # Failed node cannot initiate election
    await engine5.initiate_election("Test")
    assert state5.is_coordinator is False

    # Failed node ignores incoming election messages
    msg = NetworkMessage(message_type=MessageType.ELECTION, sender_id=1, receiver_id=5, generation=1)
    resp = await engine5.handle_election_message(msg)
    assert resp is None
