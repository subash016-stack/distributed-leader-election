import networkx as nx
from dataset.dataset_manager import dataset_manager
from distributed.election import TopologyAwareElectionEngine
from distributed.failure_simulator import FailureSimulator
from distributed.mpi_runtime import get_communicator
from distributed.threaded_monitor import ThreadedHeartbeatMonitor
from distributed.topology import TopologyMapper


def test_topology_mapper_and_partitioning():
    _, meta = dataset_manager.get_connected_subgraph(size=12, seed=42)
    graph = nx.Graph()
    for e in meta["edges"]:
        graph.add_edge(e["source"], e["target"])

    mapper = TopologyMapper(graph=graph, num_ranks=4)
    assert mapper.num_nodes == 12
    assert mapper.num_ranks == 4
    # All nodes mapped
    assert len(mapper.node_to_rank) == 12
    # Each rank has 3 nodes
    for r in range(4):
        assert len(mapper.rank_to_nodes[r]) == 3


def test_mpi_election_convergence_on_gnutella():
    _, meta = dataset_manager.get_connected_subgraph(size=10, seed=42)
    graph = nx.Graph()
    for e in meta["edges"]:
        graph.add_edge(e["source"], e["target"])

    expected_max = max(meta["node_list"])
    mapper = TopologyMapper(graph=graph, num_ranks=2)
    comm0 = get_communicator(rank=0, size=2, base_port=15000)
    comm1 = get_communicator(rank=1, size=2, base_port=15000)

    eng0 = TopologyAwareElectionEngine(comm=comm0, topology=mapper)
    eng1 = TopologyAwareElectionEngine(comm=comm1, topology=mapper)

    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
        f0 = ex.submit(eng0.run_election)
        f1 = ex.submit(eng1.run_election)
        r0 = f0.result()
        r1 = f1.result()

    # Both ranks must agree on the highest node ID
    for nid, winner in r0["coordinator_view"].items():
        assert winner == expected_max
    for nid, winner in r1["coordinator_view"].items():
        assert winner == expected_max


def test_mpi_election_with_failed_node():
    _, meta = dataset_manager.get_connected_subgraph(size=10, seed=42)
    graph = nx.Graph()
    for e in meta["edges"]:
        graph.add_edge(e["source"], e["target"])

    sorted_nodes = sorted(meta["node_list"])
    highest_node = sorted_nodes[-1]
    second_highest = sorted_nodes[-2]

    fail_sim = FailureSimulator()
    fail_sim.fail_node(highest_node)

    mapper = TopologyMapper(graph=graph, num_ranks=2)
    comm0 = get_communicator(rank=0, size=2, base_port=16000)
    comm1 = get_communicator(rank=1, size=2, base_port=16000)

    eng0 = TopologyAwareElectionEngine(comm=comm0, topology=mapper, failure_sim=fail_sim)
    eng1 = TopologyAwareElectionEngine(comm=comm1, topology=mapper, failure_sim=fail_sim)

    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
        f0 = ex.submit(eng0.run_election)
        f1 = ex.submit(eng1.run_election)
        r0 = f0.result()
        r1 = f1.result()

    # The highest node was failed, so second_highest must win
    all_views = {}
    all_views.update(r0["coordinator_view"])
    all_views.update(r1["coordinator_view"])

    assert all_views[highest_node] is None  # Failed node has no coordinator view
    for nid, winner in all_views.items():
        if nid != highest_node:
            assert winner == second_highest


def test_threaded_heartbeat_monitor():
    monitor = ThreadedHeartbeatMonitor(node_id=1, rank=0, heartbeat_interval=0.1, heartbeat_timeout=0.3)
    monitor.set_coordinator(coord_id=99, is_self=False)
    monitor.start()

    # Wait for timeout to trigger
    import time

    time.sleep(0.5)
    monitor.stop()

    # Outbox should have TRIGGER_ELECTION request
    requests = []
    while not monitor.mpi_outbox.empty():
        requests.append(monitor.mpi_outbox.get_nowait())

    timeout_requests = [r for r in requests if r.get("type") == "TRIGGER_ELECTION"]
    assert len(timeout_requests) >= 1
