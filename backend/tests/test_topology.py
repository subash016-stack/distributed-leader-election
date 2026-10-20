from app.models.node import NodeInfo, NodeStatus
from app.network.topology import TopologyManager


def test_default_topology_creation():
    mgr = TopologyManager(node_count=5, base_port=9001)
    assert len(mgr.node_configs) == 5
    assert mgr.is_connected() is True
    assert mgr.graph.number_of_nodes() == 5
    # Mesh has n*(n-1)/2 edges = 10
    assert mgr.graph.number_of_edges() == 10


def test_topology_peers():
    mgr = TopologyManager(node_count=5, base_port=9001)
    peers_for_node_1 = mgr.get_peer_ports(1)
    assert len(peers_for_node_1) == 4
    assert 2 in peers_for_node_1
    assert 5 in peers_for_node_1
    assert peers_for_node_1[5] == 9005


def test_validate_node():
    mgr = TopologyManager(node_count=5, base_port=9001)
    valid, _ = mgr.validate_node(1, 9001)
    assert valid is True

    invalid_id, msg = mgr.validate_node(-1, 9001)
    assert invalid_id is False

    invalid_port, msg = mgr.validate_node(1, 80)
    assert invalid_port is False


def test_get_topology_data():
    mgr = TopologyManager(node_count=3, base_port=9001)
    mock_infos = {
        1: NodeInfo(id=1, port=9001, status=NodeStatus.ALIVE, is_coordinator=False),
        2: NodeInfo(id=2, port=9002, status=NodeStatus.FAILED, is_coordinator=False),
        3: NodeInfo(id=3, port=9003, status=NodeStatus.ALIVE, is_coordinator=True),
    }
    topo = mgr.get_topology_data(mock_infos)
    assert topo.total_nodes == 3
    assert topo.active_nodes == 2
    assert topo.failed_nodes == 1
    assert topo.current_coordinator == 3
