import gzip
import logging
import os
import urllib.request
from typing import Any

import networkx as nx

logger = logging.getLogger("DatasetManager")

DATASET_URL = "https://snap.stanford.edu/data/p2p-Gnutella08.txt.gz"
RAW_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "raw"))
GZ_PATH = os.path.join(RAW_DIR, "p2p-Gnutella08.txt.gz")
TXT_PATH = os.path.join(RAW_DIR, "p2p-Gnutella08.txt")


class GnutellaDatasetManager:
    """Manages the download, parsing, validation, and subgraph extraction
    for the Stanford SNAP Gnutella Peer-to-Peer network dataset (p2p-Gnutella08).
    """

    def __init__(self, data_path: str = TXT_PATH):
        self.data_path = data_path
        self.directed_graph: nx.DiGraph | None = None
        self.undirected_graph: nx.Graph | None = None
        self.stats: dict[str, Any] = {}

    def ensure_dataset(self) -> str:
        """Download and extract p2p-Gnutella08 if not already present."""
        os.makedirs(RAW_DIR, exist_ok=True)
        if os.path.exists(self.data_path) and os.path.getsize(self.data_path) > 0:
            return self.data_path

        logger.info("Dataset missing. Downloading from %s", DATASET_URL)
        try:
            urllib.request.urlretrieve(DATASET_URL, GZ_PATH)
            with gzip.open(GZ_PATH, "rb") as f_in:
                with open(self.data_path, "wb") as f_out:
                    f_out.write(f_in.read())
            logger.info(
                "Successfully downloaded and extracted dataset to %s", self.data_path
            )
            return self.data_path
        except Exception as exc:
            raise RuntimeError(
                f"Failed to automatically download Gnutella dataset from {DATASET_URL}. "
                f"Please manually download p2p-Gnutella08.txt.gz and place extracted p2p-Gnutella08.txt in {RAW_DIR}. "
                f"Error: {exc}"
            )

    def load_and_parse(self) -> dict[str, Any]:
        """Parse raw edge list, validate entries, and compute graph statistics."""
        self.ensure_dataset()

        di_graph = nx.DiGraph()
        un_graph = nx.Graph()
        duplicate_edges = 0
        self_loops = 0
        raw_edges_count = 0

        with open(self.data_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split()
                if len(parts) >= 2:
                    raw_edges_count += 1
                    u, v = int(parts[0]), int(parts[1])
                    if u == v:
                        self_loops += 1
                        continue
                    if di_graph.has_edge(u, v):
                        duplicate_edges += 1
                    else:
                        di_graph.add_edge(u, v)

                    # Modeling assumption: Construct undirected overlay communication graph
                    # for bidirectional peer-to-peer message exchanges
                    un_graph.add_edge(u, v)

        self.directed_graph = di_graph
        self.undirected_graph = un_graph

        components = list(nx.connected_components(un_graph))
        lcc_nodes = max(components, key=len)
        lcc_subgraph = un_graph.subgraph(lcc_nodes)

        self.stats = {
            "dataset_name": "p2p-Gnutella08",
            "source_url": DATASET_URL,
            "citation": "J. Leskovec, J. Kleinberg, C. Faloutsos (ACM TKDD 2007)",
            "published_nodes": 6301,
            "published_edges": 20777,
            "parsed_directed_nodes": di_graph.number_of_nodes(),
            "parsed_directed_edges": di_graph.number_of_edges(),
            "undirected_nodes": un_graph.number_of_nodes(),
            "undirected_unique_edges": un_graph.number_of_edges(),
            "duplicate_directed_edges": duplicate_edges,
            "self_loops": self_loops,
            "connected_components_count": len(components),
            "largest_connected_component_nodes": len(lcc_nodes),
            "largest_connected_component_edges": lcc_subgraph.number_of_edges(),
            "average_degree": round(
                2 * un_graph.number_of_edges() / un_graph.number_of_nodes(), 2
            ),
        }
        logger.info("Loaded Gnutella graph: %s", self.stats)
        return self.stats

    def get_connected_subgraph(
        self, size: int = 10, seed: int = 42, start_node: int | None = None
    ) -> tuple[nx.Graph, dict[str, Any]]:
        """Extract a deterministic, connected subgraph of the requested size
        from the largest connected component of the Gnutella network.
        """
        if self.undirected_graph is None:
            self.load_and_parse()

        # Find Largest Connected Component (LCC)
        components = list(nx.connected_components(self.undirected_graph))
        lcc_nodes = list(max(components, key=len))
        lcc_graph = self.undirected_graph.subgraph(lcc_nodes)

        if size > len(lcc_nodes):
            raise ValueError(
                f"Requested size {size} exceeds largest connected component ({len(lcc_nodes)})"
            )

        # Pick start node deterministically
        if start_node is None or start_node not in lcc_graph:
            # Sort candidate nodes by degree descending to select a well-connected root
            sorted_candidates = sorted(
                lcc_nodes, key=lambda n: (lcc_graph.degree[n], -n), reverse=True
            )
            # Offset by seed to allow reproducible variety
            root = sorted_candidates[seed % min(len(sorted_candidates), 100)]
        else:
            root = start_node

        # Perform BFS expansion to collect exactly `size` connected nodes
        visited = []
        queue = [root]
        seen = {root}

        while queue and len(visited) < size:
            curr = queue.pop(0)
            visited.append(curr)
            # Sort neighbors deterministically
            neighbors = sorted(list(lcc_graph.neighbors(curr)))
            for nbr in neighbors:
                if nbr not in seen:
                    seen.add(nbr)
                    queue.append(nbr)
                    if len(visited) + len(queue) >= size:
                        break

        while len(visited) < size and queue:
            visited.append(queue.pop(0))

        subgraph = lcc_graph.subgraph(visited).copy()

        # Compute diameter for termination bound calculation
        if nx.is_connected(subgraph):
            diameter = nx.diameter(subgraph)
        else:
            diameter = 0

        subgraph_meta = {
            "size": subgraph.number_of_nodes(),
            "edge_count": subgraph.number_of_edges(),
            "diameter": diameter,
            "root_node": root,
            "seed": seed,
            "is_connected": nx.is_connected(subgraph),
            "node_list": sorted(list(subgraph.nodes())),
            "edges": [{"source": u, "target": v} for u, v in subgraph.edges()],
            "degrees": {n: subgraph.degree[n] for n in subgraph.nodes()},
        }
        return subgraph, subgraph_meta


dataset_manager = GnutellaDatasetManager()
