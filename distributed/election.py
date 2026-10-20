import logging
import time
from typing import Any

import networkx as nx

from distributed.failure_simulator import FailureSimulator
from distributed.messages import MPIMessage, MPIMessageTag
from distributed.mpi_runtime import MPICommunicator
from distributed.topology import TopologyMapper

logger = logging.getLogger("DistributedElectionEngine")


class TopologyAwareElectionEngine:
    """Implements the topology-aware distributed maximum-ID leader election protocol
    over a graph topology using MPI point-to-point communication.
    """

    def __init__(
        self,
        comm: MPICommunicator,
        topology: TopologyMapper,
        failure_sim: FailureSimulator | None = None,
        generation: int = 1,
    ):
        self.comm = comm
        self.topology = topology
        self.failure_sim = failure_sim or FailureSimulator()
        self.generation = generation
        self.rank = comm.Get_rank()
        self.owned_nodes = topology.rank_to_nodes.get(self.rank, [])

        # Local state per owned node: node_id -> current best candidate
        self.best_candidate: dict[int, int] = {}
        # Final coordinator view: node_id -> coordinator_id
        self.coordinator_view: dict[int, int | None] = {}

        # Message & performance counters
        self.messages_sent = 0
        self.messages_received = 0
        self.rounds_completed = 0
        self.execution_duration = 0.0

    def run_election(self, max_rounds: int | None = None) -> dict[str, Any]:
        """Execute the distributed election rounds over the graph topology."""
        start_time = time.time()
        self.messages_sent = 0
        self.messages_received = 0

        # Calculate diameter-bounded rounds
        if max_rounds is None:
            try:
                # Diameter across all connected components
                comps = list(nx.connected_components(self.topology.graph))
                diameters = [
                    nx.diameter(self.topology.graph.subgraph(c))
                    for c in comps
                    if len(c) > 1
                ]
                graph_diameter = max(diameters) if diameters else 1
            except Exception:
                graph_diameter = self.topology.num_nodes
            max_rounds = max(2, graph_diameter + 1)

        # 1. Initialization
        for n in self.owned_nodes:
            if self.failure_sim.is_failed(n):
                self.best_candidate[n] = -1  # Excluded
                self.coordinator_view[n] = None
            else:
                self.best_candidate[n] = n
                self.coordinator_view[n] = None

        logger.info(
            "Rank %d starting election (gen %d, max_rounds %d) for nodes %s",
            self.rank,
            self.generation,
            max_rounds,
            self.owned_nodes,
        )

        # 2. Propagation Rounds
        for round_idx in range(1, max_rounds + 1):
            # A. Prepare candidate messages for all graph neighbors
            outbox_messages: list[MPIMessage] = []
            for node_id in self.owned_nodes:
                if self.failure_sim.is_failed(node_id):
                    continue
                cand = self.best_candidate[node_id]
                for nbr in self.topology.get_node_neighbors(node_id):
                    nbr_rank = self.topology.node_to_rank[nbr]
                    msg = MPIMessage(
                        tag=MPIMessageTag.ELECTION,
                        sender_rank=self.rank,
                        sender_node_id=node_id,
                        dest_rank=nbr_rank,
                        dest_node_id=nbr,
                        generation=self.generation,
                        round_num=round_idx,
                        candidate_id=cand,
                    )
                    outbox_messages.append(msg)

            # B. Send messages to neighbor ranks via MPI
            # Group by destination rank
            sent_by_dest: dict[int, list[MPIMessage]] = {}
            for msg in outbox_messages:
                sent_by_dest.setdefault(msg.dest_rank, []).append(msg)

            for dest_r, msgs in sent_by_dest.items():
                if dest_r != self.rank:
                    self.comm.send(msgs, dest=dest_r, tag=MPIMessageTag.ELECTION.value)
                    self.messages_sent += len(msgs)

            # C. Collect candidate messages from neighbor ranks
            inbox_messages: list[MPIMessage] = []
            # Local loopback messages
            if self.rank in sent_by_dest:
                inbox_messages.extend(sent_by_dest[self.rank])

            rank_nbrs = self.topology.get_rank_neighbors(self.rank)
            for r_nbr in rank_nbrs:
                try:
                    src, tag, incoming = self.comm.recv(
                        source=r_nbr, tag=MPIMessageTag.ELECTION.value, timeout=3.0
                    )
                    if isinstance(incoming, list):
                        inbox_messages.extend(incoming)
                        self.messages_received += len(incoming)
                    elif isinstance(incoming, MPIMessage):
                        inbox_messages.append(incoming)
                        self.messages_received += 1
                except TimeoutError:
                    logger.warning(
                        "Rank %d timed out waiting for neighbor rank %d in round %d",
                        self.rank,
                        r_nbr,
                        round_idx,
                    )

            # D. Update local state with highest candidate received along graph edges
            for msg in inbox_messages:
                dest_node = msg.dest_node_id
                if dest_node in self.owned_nodes and not self.failure_sim.is_failed(
                    dest_node
                ):
                    self.best_candidate[dest_node] = max(
                        self.best_candidate[dest_node], msg.candidate_id
                    )

            self.rounds_completed = round_idx

        # 3. Coordinator Announcement
        # Each active node's best candidate is now the component coordinator
        for node_id in self.owned_nodes:
            if not self.failure_sim.is_failed(node_id):
                winner = self.best_candidate[node_id]
                self.coordinator_view[node_id] = winner
                if winner == node_id:
                    logger.info(
                        "🏆 Node %d (Rank %d) is elected COORDINATOR for its component!",
                        node_id,
                        self.rank,
                    )

        self.execution_duration = time.time() - start_time
        logger.info(
            "Rank %d finished election in %.4fs (%d rounds, %d sent, %d recv). Views: %s",
            self.rank,
            self.execution_duration,
            self.rounds_completed,
            self.messages_sent,
            self.messages_received,
            self.coordinator_view,
        )

        return {
            "rank": self.rank,
            "owned_nodes": self.owned_nodes,
            "coordinator_view": self.coordinator_view,
            "rounds_completed": self.rounds_completed,
            "messages_sent": self.messages_sent,
            "messages_received": self.messages_received,
            "duration": self.execution_duration,
        }
