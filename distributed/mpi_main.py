import argparse
import json
import logging

from dataset.dataset_manager import dataset_manager
from distributed.election import TopologyAwareElectionEngine
from distributed.failure_simulator import FailureSimulator
from distributed.mpi_runtime import get_communicator
from distributed.threaded_monitor import ThreadedHeartbeatMonitor
from distributed.topology import TopologyMapper

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [Rank %(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)


def run_mpi_node(args: argparse.Namespace) -> None:
    comm = get_communicator(rank=args.rank, size=args.size, base_port=args.base_port)
    rank = comm.Get_rank()
    size = comm.Get_size()
    logger = logging.getLogger(str(rank))

    thread_level = comm.check_thread_support()
    logger.info("Starting Rank %d of %d (Thread support: %s)", rank, size, thread_level)

    # 1. Load Gnutella subgraph
    _, meta = dataset_manager.get_connected_subgraph(
        size=args.subgraph_size, seed=args.seed
    )
    # Reconstruct subgraph locally
    import networkx as nx

    graph = nx.Graph()
    for e in meta["edges"]:
        graph.add_edge(e["source"], e["target"])

    topology = TopologyMapper(graph=graph, num_ranks=size)
    failure_sim = FailureSimulator()

    # Apply failure scenario if specified
    if args.fail_nodes:
        for fn in [int(x) for x in args.fail_nodes.split(",") if x.strip()]:
            failure_sim.fail_node(fn)

    # 2. Setup Threaded Monitors for owned nodes
    owned_nodes = topology.rank_to_nodes.get(rank, [])
    monitors = []
    for node_id in owned_nodes:
        mon = ThreadedHeartbeatMonitor(
            node_id=node_id,
            rank=rank,
            heartbeat_interval=args.heartbeat_interval,
            heartbeat_timeout=args.heartbeat_timeout,
        )
        if failure_sim.is_failed(node_id):
            mon.set_failed(True)
        mon.start()
        monitors.append(mon)

    # 3. Execute Distributed Election
    engine = TopologyAwareElectionEngine(
        comm=comm,
        topology=topology,
        failure_sim=failure_sim,
        generation=args.generation,
    )
    result = engine.run_election()

    # Update monitors with elected coordinator
    for mon in monitors:
        coord = result["coordinator_view"].get(mon.node_id)
        if coord is not None:
            mon.set_coordinator(coord, is_self=(coord == mon.node_id))

    # Stop monitors
    for mon in monitors:
        mon.stop()

    comm.close()

    # Print JSON result to stdout for orchestrator
    print(
        json.dumps(
            {"rank": rank, "size": size, "thread_level": thread_level, "result": result}
        )
    )


def main():
    parser = argparse.ArgumentParser(description="MPI Distributed Election Runner")
    parser.add_argument(
        "--rank",
        type=int,
        default=0,
        help="MPI process rank (for non-native MPI execution)",
    )
    parser.add_argument("--size", type=int, default=1, help="Total MPI ranks")
    parser.add_argument(
        "--subgraph-size", type=int, default=10, help="Gnutella subgraph size"
    )
    parser.add_argument(
        "--seed", type=int, default=42, help="Random seed for subgraph extraction"
    )
    parser.add_argument(
        "--fail-nodes", type=str, default="", help="Comma-separated node IDs to fail"
    )
    parser.add_argument("--generation", type=int, default=1, help="Election generation")
    parser.add_argument("--base-port", type=int, default=11000, help="Base IPC port")
    parser.add_argument(
        "--heartbeat-interval",
        type=float,
        default=1.0,
        help="Heartbeat interval in seconds",
    )
    parser.add_argument(
        "--heartbeat-timeout",
        type=float,
        default=3.0,
        help="Heartbeat timeout in seconds",
    )

    args = parser.parse_args()
    run_mpi_node(args)


if __name__ == "__main__":
    main()
