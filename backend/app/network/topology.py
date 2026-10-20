import logging
from typing import Dict, List, Tuple

import networkx as nx

from app.models.node import NetworkEdge, NodeInfo, NodeStatus, TopologyData

logger = logging.getLogger("Topology")


class TopologyManager:
    """Manages the network topology using NetworkX and validates node configurations."""

    def __init__(self, node_count: int = 5, base_port: int = 9001, host: str = "127.0.0.1"):
        self.node_count = node_count
        self.base_port = base_port
        self.host = host
        self.graph = nx.Graph()
        self.node_configs: Dict[int, Dict[str, any]] = {}
        self.build_default_topology()

    def build_default_topology(self) -> None:
        """Create the default mesh network topology for the configured node count."""
        self.graph.clear()
        self.node_configs.clear()

        # Generate node configs with IDs 1..N
        for i in range(1, self.node_count + 1):
            port = self.base_port + (i - 1)
            self.node_configs[i] = {
                "id": i,
                "host": self.host,
                "port": port,
            }
            self.graph.add_node(i, port=port, host=self.host)

        # In standard Bully Algorithm, all nodes are initially mutually connected (full mesh)
        for i in range(1, self.node_count + 1):
            for j in range(i + 1, self.node_count + 1):
                self.graph.add_edge(i, j)

    def validate_node(self, node_id: int, port: int) -> Tuple[bool, str]:
        if node_id <= 0:
            return False, f"Invalid node ID: {node_id}. Must be a positive integer."
        if not (1024 <= port <= 65535):
            return False, f"Invalid port: {port}. Must be between 1024 and 65535."
        return True, ""

    def get_peer_ports(self, node_id: int) -> Dict[int, int]:
        """Return a mapping of peer_id -> port for all peers of node_id."""
        peers: Dict[int, int] = {}
        if node_id not in self.graph:
            return peers
        for peer_id in self.graph.neighbors(node_id):
            if peer_id in self.node_configs:
                peers[peer_id] = self.node_configs[peer_id]["port"]
        return peers

    def get_edges(self) -> List[NetworkEdge]:
        edges: List[NetworkEdge] = []
        for u, v in self.graph.edges():
            edges.append(NetworkEdge(source=u, target=v))
        return edges

    def is_connected(self) -> bool:
        if self.graph.number_of_nodes() == 0:
            return False
        return nx.is_connected(self.graph)

    def get_topology_data(self, current_nodes_info: Dict[int, NodeInfo]) -> TopologyData:
        """Combine static topology with dynamic runtime node info."""
        nodes_list: List[NodeInfo] = []
        active_count = 0
        failed_count = 0
        current_coord = None

        for node_id in sorted(self.node_configs.keys()):
            info = current_nodes_info.get(node_id)
            if info:
                nodes_list.append(info)
                if info.status in (NodeStatus.ALIVE, NodeStatus.ELECTION):
                    active_count += 1
                elif info.status in (NodeStatus.FAILED, NodeStatus.SUSPECTED):
                    failed_count += 1
                if info.is_coordinator:
                    current_coord = info.id
            else:
                cfg = self.node_configs[node_id]
                nodes_list.append(
                    NodeInfo(
                        id=node_id,
                        host=cfg["host"],
                        port=cfg["port"],
                        status=NodeStatus.OFFLINE,
                        is_coordinator=False,
                        current_coordinator=None,
                        peers=list(self.graph.neighbors(node_id)),
                    )
                )

        return TopologyData(
            nodes=nodes_list,
            edges=self.get_edges(),
            total_nodes=len(self.node_configs),
            active_nodes=active_count,
            failed_nodes=failed_count,
            current_coordinator=current_coord,
            is_connected=self.is_connected(),
        )
