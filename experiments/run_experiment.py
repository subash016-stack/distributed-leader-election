import json
import logging
import os
import time
from typing import Any

import matplotlib
import pandas as pd

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import networkx as nx

from dataset.dataset_manager import dataset_manager
from distributed.election import TopologyAwareElectionEngine
from distributed.failure_simulator import FailureSimulator
from distributed.mpi_runtime import get_communicator
from distributed.threaded_monitor import ThreadedHeartbeatMonitor
from distributed.topology import TopologyMapper

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s"
)
logger = logging.getLogger("ExperimentRunner")

RESULTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "results"))
PLOTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "plots"))
CONFIG_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "configurations"))


class ExperimentRunner:
    """Orchestrates repeatable distributed leader election experiments,
    collects performance metrics, saves CSV logs, and generates visualization charts.
    """

    def __init__(self):
        os.makedirs(RESULTS_DIR, exist_ok=True)
        os.makedirs(PLOTS_DIR, exist_ok=True)
        os.makedirs(CONFIG_DIR, exist_ok=True)

    def run_scenario(
        self,
        subgraph_size: int = 10,
        num_ranks: int = 2,
        seed: int = 42,
        failed_nodes: list[int] | None = None,
        enable_threading: bool = True,
        base_port: int = 12000,
    ) -> dict[str, Any]:
        """Execute a single scenario across multiple MPI ranks with real message passing."""
        failed_nodes = failed_nodes or []
        _, meta = dataset_manager.get_connected_subgraph(size=subgraph_size, seed=seed)

        # Reconstruct NetworkX subgraph
        graph = nx.Graph()
        for e in meta["edges"]:
            graph.add_edge(e["source"], e["target"])

        # If scenario disconnects graph, verify components
        topology = TopologyMapper(graph=graph, num_ranks=num_ranks)
        failure_sim = FailureSimulator()
        for fn in failed_nodes:
            failure_sim.fail_node(fn)

        start_time = time.time()

        # Execute ranks
        ranks_data = []
        communicators = [
            get_communicator(rank=r, size=num_ranks, base_port=base_port)
            for r in range(num_ranks)
        ]
        engines = [
            TopologyAwareElectionEngine(
                comm=comm, topology=topology, failure_sim=failure_sim
            )
            for comm in communicators
        ]

        # Optional threaded monitors
        monitors = []
        if enable_threading:
            for r in range(num_ranks):
                for nid in topology.rank_to_nodes.get(r, []):
                    m = ThreadedHeartbeatMonitor(node_id=nid, rank=r)
                    if failure_sim.is_failed(nid):
                        m.set_failed(True)
                    m.start()
                    monitors.append(m)

        # Run election in each rank
        # We can simulate concurrent ranks or run sequential rounds
        # Here each engine runs its round loop communicating over communicator sockets
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=num_ranks) as executor:
            futures = [executor.submit(eng.run_election) for eng in engines]
            for f in concurrent.futures.as_completed(futures):
                ranks_data.append(f.result())

        total_duration = time.time() - start_time

        # Cleanup monitors & communicators
        for m in monitors:
            m.stop()
        for comm in communicators:
            comm.close()

        # Aggregate coordinator results
        merged_coordinator_view = {}
        total_msgs_sent = sum(r["messages_sent"] for r in ranks_data)
        sum(r["messages_received"] for r in ranks_data)
        max_rounds = max(r["rounds_completed"] for r in ranks_data) if ranks_data else 0

        for r in ranks_data:
            merged_coordinator_view.update(r["coordinator_view"])

        # Determine winner(s)
        unique_coordinators = sorted(
            list(set(c for c in merged_coordinator_view.values() if c is not None))
        )

        scenario_result = {
            "timestamp": time.time(),
            "dataset": "p2p-Gnutella08",
            "subgraph_size": subgraph_size,
            "num_ranks": num_ranks,
            "seed": seed,
            "diameter": meta["diameter"],
            "failed_nodes": failed_nodes,
            "active_nodes_count": subgraph_size - len(failed_nodes),
            "threading_enabled": enable_threading,
            "coordinators_elected": unique_coordinators,
            "coordinator_views": merged_coordinator_view,
            "wall_clock_time": round(total_duration, 4),
            "total_messages": total_msgs_sent,
            "max_rounds": max_rounds,
            "components_count": nx.number_connected_components(graph),
        }

        # Save latest run
        with open(os.path.join(RESULTS_DIR, "latest_run.json"), "w") as f:
            json.dump(scenario_result, f, indent=2)

        return scenario_result

    def run_benchmark_suite(self) -> pd.DataFrame:
        """Run standard benchmark grid across multiple ranks and subgraph sizes."""
        logger.info("Executing comprehensive benchmark grid...")
        records = []
        sizes = [10, 25, 50, 100]
        rank_counts = [1, 2, 4]

        # 1. Run Sequential Baseline T(1) for each size
        baseline_times = {}
        for sz in sizes:
            logger.info("Measuring sequential baseline for size %d...", sz)
            res = self.run_scenario(subgraph_size=sz, num_ranks=1, base_port=13000)
            baseline_times[sz] = max(res["wall_clock_time"], 0.001)

        # 2. Run Grid
        port_offset = 14000
        for sz in sizes:
            t1 = baseline_times[sz]
            for p in rank_counts:
                logger.info("Benchmarking size %d with %d ranks...", sz, p)
                res = self.run_scenario(
                    subgraph_size=sz, num_ranks=p, base_port=port_offset
                )
                port_offset += 20
                tp = res["wall_clock_time"]
                speedup = round(t1 / tp, 3) if tp > 0 else 1.0
                efficiency = round(speedup / p, 3)

                rec = {
                    "GraphSize": sz,
                    "MPIRanks": p,
                    "WallClockSec": tp,
                    "TotalMessages": res["total_messages"],
                    "Rounds": res["max_rounds"],
                    "Diameter": res["diameter"],
                    "Speedup": speedup,
                    "Efficiency": efficiency,
                    "Coordinators": ",".join(
                        str(c) for c in res["coordinators_elected"]
                    ),
                }
                records.append(rec)

        df = pd.DataFrame(records)
        csv_path = os.path.join(RESULTS_DIR, "benchmark_results.csv")
        df.to_csv(csv_path, index=False)
        logger.info("Benchmark complete! Saved results to %s", csv_path)

        # 3. Generate Matplotlib Charts
        self.generate_plots(df)
        return df

    def generate_plots(self, df: pd.DataFrame) -> None:
        """Generate high-resolution PNG charts for project report and dashboard."""
        plt.style.use(
            "seaborn-v0_8-whitegrid"
            if "seaborn-v0_8-whitegrid" in plt.style.available
            else "default"
        )

        # Plot 1: Runtime vs Graph Size for different MPI rank counts
        plt.figure(figsize=(7, 4.5), dpi=300)
        for p in sorted(df["MPIRanks"].unique()):
            sub = df[df["MPIRanks"] == p]
            plt.plot(
                sub["GraphSize"],
                sub["WallClockSec"],
                marker="o",
                linewidth=2,
                label=f"{p} MPI Ranks",
            )
        plt.title(
            "Leader Election Runtime vs. Gnutella Graph Size",
            fontsize=12,
            fontweight="bold",
        )
        plt.xlabel("Graph Nodes (Size)", fontsize=10)
        plt.ylabel("Execution Time (Seconds)", fontsize=10)
        plt.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(PLOTS_DIR, "runtime_vs_graph_size.png"))
        plt.close()

        # Plot 2: Total Message Count vs Graph Size
        plt.figure(figsize=(7, 4.5), dpi=300)
        for p in sorted(df["MPIRanks"].unique()):
            sub = df[df["MPIRanks"] == p]
            plt.plot(
                sub["GraphSize"],
                sub["TotalMessages"],
                marker="s",
                linewidth=2,
                label=f"{p} MPI Ranks",
            )
        plt.title(
            "Total Election Messages vs. Graph Size", fontsize=12, fontweight="bold"
        )
        plt.xlabel("Graph Nodes (Size)", fontsize=10)
        plt.ylabel("Messages Exchanged", fontsize=10)
        plt.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(PLOTS_DIR, "message_count_vs_size.png"))
        plt.close()

        # Plot 3: Speedup vs Number of Ranks
        plt.figure(figsize=(7, 4.5), dpi=300)
        for sz in [25, 50, 100]:
            sub = df[df["GraphSize"] == sz]
            if not sub.empty:
                plt.plot(
                    sub["MPIRanks"],
                    sub["Speedup"],
                    marker="^",
                    linewidth=2,
                    label=f"Graph Size {sz}",
                )
        plt.plot([1, 2, 4], [1, 2, 4], "k--", alpha=0.5, label="Ideal Linear Speedup")
        plt.title("Speedup S(p) vs. MPI Process Count", fontsize=12, fontweight="bold")
        plt.xlabel("MPI Processes (p)", fontsize=10)
        plt.ylabel("Speedup S(p) = T(1)/T(p)", fontsize=10)
        plt.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(PLOTS_DIR, "speedup_and_efficiency.png"))
        plt.close()

        logger.info("Generated performance plots in %s", PLOTS_DIR)


experiment_runner = ExperimentRunner()

if __name__ == "__main__":
    experiment_runner.run_benchmark_suite()
