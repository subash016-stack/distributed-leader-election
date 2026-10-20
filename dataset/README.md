# Gnutella Peer-to-Peer Network Dataset (p2p-Gnutella08)

## Stanford SNAP Network Data

- **Official Dataset Page**: [https://snap.stanford.edu/data/p2p-Gnutella08.html](https://snap.stanford.edu/data/p2p-Gnutella08.html)
- **Direct Download URL**: [https://snap.stanford.edu/data/p2p-Gnutella08.txt.gz](https://snap.stanford.edu/data/p2p-Gnutella08.txt.gz)
- **Local Location**: `dataset/raw/p2p-Gnutella08.txt.gz` and `dataset/raw/p2p-Gnutella08.txt`

## Published Dataset Statistics
- **Nodes (Hosts)**: 6,301
- **Edges (Connections)**: 20,777 (Directed)
- **Collection Date**: August 8, 2002
- **Description**: A snapshot of the Gnutella peer-to-peer file sharing network from August 8, 2002. Nodes represent hosts in the network topology and edges represent peer-to-peer TCP connections between hosts.

## Graph Modeling Assumptions for Distributed Leader Election
The original Stanford SNAP dataset is a **directed graph**. However, in a distributed peer-to-peer system executing leader election and heartbeat monitoring, communication between adjacent peers is **bidirectional** (e.g., node $u$ sends an election inquiry to neighbor $v$, and $v$ responds with an acknowledgment).

**Modeling Transformation**:
1. We parse the directed edge list $(u, v)$.
2. We construct an **undirected overlay communication graph** $G = (V, E)$ where an edge exists between $u$ and $v$ if either $(u, v) \in E_{orig}$ or $(v, u) \in E_{orig}$.
3. Duplicate edges and self-loops are deduplicated.
4. For empirical experiments, we extract the **Largest Connected Component (LCC)** or select connected subgraphs of configurable size (e.g. $N = 10, 25, 50, 100$) so that all nodes within each test partition have mutual reachability.

## Academic Citations

```bibtex
@article{leskovec2007graph,
  author    = {Jure Leskovec and Jon Kleinberg and Christos Faloutsos},
  title     = {Graph Evolution: Densification and Shrinking Diameters},
  journal   = {ACM Transactions on Knowledge Discovery from Data (TKDD)},
  volume    = {1},
  number    = {1},
  pages     = {2},
  year      = {2007},
  publisher = {ACM}
}

@article{ripeanu2002mapping,
  author    = {Matei Ripeanu and Ian Foster and Adriana Iamnitchi},
  title     = {Mapping the Gnutella Network: Properties of Large-Scale Peer-to-Peer Systems and Implications for System Design},
  journal   = {IEEE Internet Computing},
  volume    = {6},
  number    = {1},
  pages     = {50--57},
  year      = {2002},
  publisher = {IEEE}
}
```
