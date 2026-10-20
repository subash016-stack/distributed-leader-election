# Distributed Leader Election in Networked Systems Using MPI and Multithreading
## Parallel and Distributed Systems Laboratory — Project Report

**Date**: October 21, 2026  
**Course**: Parallel and Distributed Systems Laboratory  
**Dataset**: Stanford SNAP Gnutella Peer-to-Peer Network (`p2p-Gnutella08`)  
**Access Date**: August 8, 2002 snapshot / Access verified October 2026  
**Dataset URL**: [https://snap.stanford.edu/data/p2p-Gnutella08.html](https://snap.stanford.edu/data/p2p-Gnutella08.html)  

---

## 1. Abstract
This project presents the design, implementation, and empirical evaluation of a **Topology-Aware Distributed Maximum-ID Leader Election Protocol** executed across multiple Message Passing Interface (**MPI**) ranks with concurrent **multithreaded monitoring**. The system models a real-world peer-to-peer overlay network using the public Stanford SNAP Gnutella dataset (6,301 hosts, 20,777 connections). Inter-process communication is performed using point-to-point MPI primitives adhering to the `MPI.THREAD_FUNNELED` thread-safety standard, while autonomous background threads concurrently perform heartbeat probing, fault detection, and event logging. Empirical experiments quantify execution time, message overhead, speedup S(p), and parallel efficiency E(p) across varying graph sizes (N = 10 to 100) and process counts (p = 1, 2, 4).

---

## 2. Problem Statement & Motivation
In decentralized distributed systems such as peer-to-peer file sharing and distributed ledgers, nodes must coordinate tasks without relying on a permanent centralized master. When coordinators fail, surviving nodes must autonomously detect the disruption, exchange topology-constrained election messages, and reach deterministic consensus on a single legitimate coordinator within each connected component.

---

## 3. Dataset Description & Modeling Assumptions

### 3.1 Dataset Metadata & Academic Citations
- **Source**: Stanford Network Analysis Platform (SNAP)
- **URL**: `https://snap.stanford.edu/data/p2p-Gnutella08.html`
- **Download**: `https://snap.stanford.edu/data/p2p-Gnutella08.txt.gz`
- **Published Statistics**: 6,301 nodes, 20,777 directed edges.
- **Academic References**:
  1. J. Leskovec, J. Kleinberg, and C. Faloutsos, *"Graph Evolution: Densification and Shrinking Diameters,"* ACM Transactions on Knowledge Discovery from Data (TKDD), 2007.
  2. R. Ripeanu, I. Foster, and A. Iamnitchi, *"Mapping the Gnutella Network: Properties of Large-Scale Peer-to-Peer Systems and Implications for System Design,"* IEEE Internet Computing, 2002.

### 3.2 Graph Transformation & Modeling Assumptions
The original dataset records directed links between Gnutella hosts. Because distributed election protocols require bidirectional negotiation (e.g. inquiry and acknowledgement between neighboring peers), we transform the directed graph into an **undirected overlay communication graph** G = (V, E) where an edge exists if either (u, v) or (v, u) was present. Connected subgraphs (N = 10, 25, 50, 100) are extracted deterministically from the Largest Connected Component (6,299 hosts).

---

## 4. System Architecture & Two Core Concepts

### Concept A: MPI (Message Passing Interface)
- Multiple MPI ranks maintain isolated process-local state.
- Nodes mapped to ranks communicate exclusively via point-to-point MPI messages (`send`, `recv`).
- Strict enforcement of `MPI.THREAD_FUNNELED`.

### Concept B: Multithreading
- Autonomous heartbeat thread probes coordinator periodically (configurable interval tau).
- Watchdog thread monitors timeouts and alerts the main MPI thread via a thread-safe `queue.Queue`.

---

## 5. Topology-Aware Election Protocol
1. **Candidate Initialization**: Each node u sets candidate = u if active, or -1 if failed.
2. **Synchronous Propagation Rounds**: In each round r in [1, Delta + 1], each node sends its candidate to all graph neighbors.
3. **State Convergence**: Nodes update candidate = max(candidate, incoming).
4. **Diameter Bound Delta**: Consensus is mathematically guaranteed after Delta rounds, where Delta is the graph diameter.
5. **Coordinator Announcement**: The winning candidate declares victory and coordinates heartbeats.

---

## 6. Empirical Results & Performance Analysis

### Benchmark Measurements Table (Actual Executed Data)

| Graph Size | MPI Ranks (p) | Wall Clock (s) | Total Messages | Rounds | Diameter | Speedup S(p) | Efficiency E(p) | Elected Coordinator |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 10 | 1 | 0.0080 | 0 | 3 | 2 | 1.363 | 1.363 | Node 427.0 |
| 10 | 2 | 0.0087 | 48 | 3 | 2 | 1.253 | 0.626 | Node 427.0 |
| 10 | 4 | 0.0128 | 78 | 3 | 2 | 0.852 | 0.213 | Node 427.0 |
| 25 | 1 | 0.0179 | 0 | 3 | 2 | 1.223 | 1.223 | Node 2038.0 |
| 25 | 2 | 0.0220 | 162 | 3 | 2 | 0.995 | 0.497 | Node 2038.0 |
| 25 | 4 | 0.0278 | 228 | 3 | 2 | 0.788 | 0.197 | Node 2038.0 |
| 50 | 1 | 0.0259 | 0 | 3 | 2 | 1.498 | 1.498 | Node 4051.0 |
| 50 | 2 | 0.0420 | 306 | 3 | 2 | 0.924 | 0.462 | Node 4051.0 |
| 50 | 4 | 0.0498 | 432 | 3 | 2 | 0.779 | 0.195 | Node 4051.0 |
| 100 | 1 | 0.0973 | 0 | 4 | 3 | 0.923 | 0.923 | Node 6138.0 |
| 100 | 2 | 0.0964 | 944 | 4 | 3 | 0.932 | 0.466 | Node 6138.0 |
| 100 | 4 | 0.1343 | 1400 | 4 | 3 | 0.669 | 0.167 | Node 6138.0 |

### Discussion of Speedup & Efficiency
Unlike computational problems that scale super-linearly with data volume, distributed leader election is fundamentally **communication-bound**. Increasing the number of MPI ranks p from 1 to 4 introduces inter-process message serialization, leading to parallel efficiency E(p) < 1.0, accurately demonstrating the communication overhead predicted by Amdahl's Law in networked algorithms.

---

## 7. Team Contribution Matrix

| Team Member Name | Student ID | Assigned Module | Implementation Work | Testing & Evaluation | Presentation Responsibility |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Student 1 Name] | [ID 1] | Dataset & Topology | SNAP Gnutella parser & subgraph extraction | Dataset integration tests | Dataset & Graph Modeling |
| [Student 2 Name] | [ID 2] | MPI Election Engine | Point-to-point MPI communication & rounds | MPI convergence testing | Distributed Protocol & MPI |
| [Student 3 Name] | [ID 3] | Threaded Monitoring | Heartbeat threads & watchdog event queues | Thread safety & timeout tests | Multithreading & Fault Recovery |
| [Student 4 Name] | [ID 4] | Web Dashboard & UI | React Flow topology UI & FastAPI backend | End-to-end integration | System Demonstration & Report |

---

## 8. Conclusions
The project successfully bridges theoretical distributed graph consensus with modern high-performance parallel computing. By combining real-world Gnutella topologies, rigorous MPI process separation, and multithreaded fault recovery, the application satisfies all requirements of the Parallel and Distributed Systems Laboratory.
