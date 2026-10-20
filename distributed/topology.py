import logging
from typing import Any

import networkx as nx

logger = logging.getLogger("TopologyMapper")


class TopologyMapper:
    """Maps nodes of a Gnutella graph to MPI ranks, computes neighbor lists,
    and identifies connected components.
    """

    def __init__(self, graph: nx.Graph, num_ranks: int):
        self.graph = graph
        self.num_ranks = max(1, num_ranks)
        self.sorted_nodes: list[int] = sorted(list(graph.nodes()))
        self.num_nodes = len(self.sorted_nodes)

        # Mapping: node_id -> rank_id
        self.node_to_rank: dict[int, int] = {}
        # Mapping: rank_id -> list of node_ids
        self.rank_to_nodes: dict[int, list[int]] = {
            r: [] for r in range(self.num_ranks)
        }

        self._assign_ranks()

    def _assign_ranks(self) -> None:
        """Assign nodes round-robin or block partitioned to ranks."""
        for idx, node_id in enumerate(self.sorted_nodes):
            rank = idx % self.num_ranks
            self.node_to_rank[node_id] = rank
            self.rank_to_nodes[rank].append(node_id)

    def get_node_neighbors(self, node_id: int) -> list[int]:
        if node_id in self.graph:
            return sorted(list(self.graph.neighbors(node_id)))
        return []

    def get_rank_neighbors(self, rank_id: int) -> set[int]:
        """Return the set of other ranks that have at least one graph edge
        connecting to a node owned by this rank.
        """
        rank_nbrs: set[int] = set()
        for node in self.rank_to_nodes.get(rank_id, []):
            for nbr in self.graph.neighbors(node):
                nbr_rank = self.node_to_rank[nbr]
                if nbr_rank != rank_id:
                    rank_nbrs.add(nbr_rank)
        return rank_nbrs

    def get_components(self) -> list[set[int]]:
        """Return connected components of the graph."""
        return [c for c in nx.connected_components(self.graph)]

    def get_component_for_node(self, node_id: int) -> set[int]:
        for comp in nx.connected_components(self.graph):
            if node_id in comp:
                return comp
        return set()

    def to_dict(self) -> dict[str, Any]:
        return {
            "num_nodes": self.num_nodes,
            "num_ranks": self.num_ranks,
            "edges": [{"source": u, "target": v} for u, v in self.graph.edges()],
            "node_to_rank": self.node_to_rank,
            "rank_to_nodes": self.rank_to_nodes,
            "components_count": nx.number_connected_components(self.graph),
        }
