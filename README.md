# Distributed Leader Election in Networked Systems Using MPI and Multithreading

**Parallel and Distributed Systems Laboratory Academic Mini-Project**  
*Implementation of a Topology-Aware Distributed Leader Election Protocol on the Stanford SNAP Gnutella Peer-to-Peer Network using MPI (mpi4py) and Multithreading, with an Interactive React Flow Web Dashboard and Print-Ready Academic Report.*

---

## 1. Executive Summary

This project implements a complete, working academic laboratory system for **Distributed Leader Election in Networked Systems**. It solves the coordinator failure problem across real network topologies by combining two core laboratory concepts:

1. **Concept A — Message Passing Interface (MPI)**: Process-level distributed execution where isolated MPI ranks exchange point-to-point election and coordinator messages over a communication graph derived from the **Stanford SNAP Gnutella P2P Network**.
2. **Concept B — Multithreading**: Concurrent heartbeat monitoring, non-blocking watchdog timeout detection, and asynchronous thread-safe message queues complying strictly with `MPI.THREAD_FUNNELED` safety requirements.

In addition to the distributed MPI engine, an interactive **React Flow + TypeScript Web Dashboard** provides real-time visualization of network topologies, live message timelines, and an empirical performance benchmark suite. A print-ready 14-page academic project report in PDF format is generated in [`reports/project_report.pdf`](file:///d:/PDS/reports/project_report.pdf) with its editable Markdown source in [`reports/project_report.md`](file:///d:/PDS/reports/project_report.md).

---

## 2. Stanford SNAP Gnutella Dataset Integration

The system uses the official **Stanford SNAP Gnutella P2P Network** (`p2p-Gnutella08`):
- **Official Dataset Page**: [https://snap.stanford.edu/data/p2p-Gnutella08.html](https://snap.stanford.edu/data/p2p-Gnutella08.html)
- **Dataset Download**: [https://snap.stanford.edu/data/p2p-Gnutella08.txt.gz](https://snap.stanford.edu/data/p2p-Gnutella08.txt.gz)
- **Local Storage**: Preserved in [`dataset/raw/p2p-Gnutella08.txt.gz`](file:///d:/PDS/dataset/raw/p2p-Gnutella08.txt.gz) and decompressed to [`dataset/raw/p2p-Gnutella08.txt`](file:///d:/PDS/dataset/raw/p2p-Gnutella08.txt).

### Published vs. Parsed Network Statistics

| Metric | Published SNAP Figure | Parsed System Count | System Validation |
| :--- | :--- | :--- | :--- |
| **Total Network Hosts ($|V|$)** | 6,301 | 6,301 | 100% Match |
| **Directed Connections ($|E|$)** | 20,777 | 20,777 | 100% Match |
| **Duplicate Directed Edges** | - | 0 | Zero duplicates found |
| **Self-Loop Connections** | - | 0 | Zero self-loops |
| **Undirected Unique Overlay Edges** | - | 14,784 | Bidirectional overlay |
| **Connected Components** | - | 4 | 1 giant + 3 small |
| **Largest Connected Component (LCC)** | - | 6,299 nodes (99.97%) | Primary extraction pool |
| **Average Node Degree $\langle k \rangle$** | - | 3.30 connections/host | Sparse overlay structure |

### Graph Transformation & Modeling Assumptions
The raw SNAP dataset is directed. In peer-to-peer leader election, message exchange and acknowledgment require bidirectional reachability. The system transforms the directed graph into an **undirected overlay communication graph** $G = (V, E)$ where $(u, v) \in E \iff (u, v) \in E_{\text{dir}} \lor (v, u) \in E_{\text{dir}}$. This modeling assumption is formally documented in [`dataset/README.md`](file:///d:/PDS/dataset/README.md) and in the academic report.

Subgraphs of configurable sizes ($|V| \in \{10, 25, 50, 100\}$) are extracted from the Largest Connected Component using reproducible random seeds, ensuring valid graph diameter $\Delta$ for distributed round bounding.

---

## 3. System Architecture

```
+-----------------------------------------------------------------------------------+
|                        REACT FLOW WEB DASHBOARD (Port 5173)                       |
|   +------------------------------------+   +----------------------------------+   |
|   |   Stanford SNAP Gnutella & MPI     |   |   Interactive TCP Bully Cluster  |   |
|   |   - Subgraph: 10, 25, 50, 100      |   |   - 5 Autonomous Node Processes  |   |
|   |   - MPI Ranks: 1, 2, 4             |   |   - TCP Sockets (Ports 9001-9005)|   |
|   |   - Live MPI Results & Diameter    |   |   - Real-time Flow Visualization |   |
|   |   - Empirical Performance Plots    |   |   - Failure & Recovery Triggers  |   |
|   +------------------------------------+   +----------------------------------+   |
+------------------------------------------^----------------------------------------+
                                           | HTTP REST / WebSocket
+------------------------------------------v----------------------------------------+
|                             FASTAPI BACKEND (Port 8000)                           |
|   /api/dataset/*      /api/experiments/*      /api/metrics      /api/simulation/* |
|   Static Mounts:      /plots (Matplotlib PNGs)      /reports (Print-Ready PDF)    |
+------------------------------------------^----------------------------------------+
                                           | Process Spawning / Engine Calls
+------------------------------------------v----------------------------------------+
|                    DISTRIBUTED ENGINE & LABORATORY CONCEPTS                       |
|                                                                                   |
|   [CONCEPT A: MPI (mpi4py)]                  [CONCEPT B: MULTITHREADING]          |
|   - Multi-rank execution (1, 2, 4 ranks)     - Daemon Watchdog Threads            |
|   - Separate process-local state             - Non-blocking Heartbeat Monitor     |
|   - Point-to-point message passing           - Thread-safe Event Queues           |
|   - Typed messages (JSON/Dict)               - MPI.THREAD_FUNNELED safety         |
|   - Diameter-bounded rounds (\Delta)         - Failure injection without abort    |
+-----------------------------------------------------------------------------------+
```

---

## 4. Laboratory Concepts Implementation

### Concept A — MPI (Message Passing Interface)
- Implemented in [`distributed/mpi_runtime.py`](file:///d:/PDS/distributed/mpi_runtime.py) and [`distributed/election.py`](file:///d:/PDS/distributed/election.py).
- Uses `mpi4py.MPI` with explicit verification of `MPI.THREAD_FUNNELED` thread safety.
- Distributes graph nodes across $p$ ranks using modular rank assignment:
  $$\text{rank}(v) = v \pmod p$$
- Nodes maintain isolated local states and exchange point-to-point messages:
  - `ELECTION_PROPOSAL`: Propagates highest-ID candidate.
  - `ELECTION_ACK`: Acknowledges proposal receipt.
  - `COORDINATOR_ANNOUNCE`: Broadcasts winning coordinator.
  - `HEARTBEAT`: Periodic liveness probe.
- Guaranteed termination: bounded by graph diameter $\Delta$ without arbitrary timeout loops.

### Concept B — Multithreading
- Implemented in [`distributed/threaded_monitor.py`](file:///d:/PDS/distributed/threaded_monitor.py).
- **Heartbeat Daemon**: Spawns background thread to periodically enqueue heartbeats.
- **Watchdog Timeout Monitor**: Concurrent watchdog thread checks last-seen timestamps and signals failure upon timeout ($T_{\text{timeout}} = 1.5 \times T_{\text{interval}}$).
- **Thread Safety**: Complying with `MPI.THREAD_FUNNELED`, worker threads NEVER invoke MPI communication routines directly; instead, they push structured events into thread-safe queues processed exclusively by the main MPI thread.
- **Controlled Failure Simulation**: [`distributed/failure_simulator.py`](file:///d:/PDS/distributed/failure_simulator.py) flags nodes as inactive/unresponsive without triggering MPI runtime process crashes, modeling node downtime while allowing surviving ranks to continue.

---

## 5. Empirical Performance Benchmark Results

Experiments were executed across a 12-configuration benchmark grid:
- Graph sizes: $|V| \in \{10, 25, 50, 100\}$ nodes.
- MPI ranks: $p \in \{1, 2, 4\}$ processes.
- All numbers are recorded from actual system execution in [`experiments/results/benchmark_results.csv`](file:///d:/PDS/experiments/results/benchmark_results.csv).

| Graph Size ($|V|$) | MPI Ranks ($p$) | Wall-Clock (s) | Total Messages | Rounds | Diameter ($\Delta$) | Speedup $S(p)$ | Efficiency $E(p)$ | Coordinator |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **10** | 1 (Seq) | 0.0016 | 28 | 3 | 3 | 1.000 | 1.000 | 5040 |
| **10** | 2 | 0.0039 | 28 | 3 | 3 | 0.407 | 0.203 | 5040 |
| **10** | 4 | 0.0051 | 28 | 3 | 3 | 0.311 | 0.078 | 5040 |
| **25** | 1 (Seq) | 0.0044 | 74 | 3 | 3 | 1.000 | 1.000 | 6296 |
| **25** | 2 | 0.0089 | 74 | 3 | 3 | 0.493 | 0.247 | 6296 |
| **25** | 4 | 0.0125 | 74 | 3 | 3 | 0.352 | 0.088 | 6296 |
| **50** | 1 (Seq) | 0.0076 | 134 | 4 | 4 | 1.000 | 1.000 | 6296 |
| **50** | 2 | 0.0177 | 134 | 4 | 4 | 0.428 | 0.214 | 6296 |
| **50** | 4 | 0.0270 | 134 | 4 | 4 | 0.281 | 0.070 | 6296 |
| **100** | 1 (Seq) | 0.0146 | 290 | 4 | 4 | 1.000 | 1.000 | 6296 |
| **100** | 2 | 0.0354 | 290 | 4 | 4 | 0.413 | 0.207 | 6296 |
| **100** | 4 | 0.0601 | 290 | 4 | 4 | 0.243 | 0.061 | 6296 |

### Performance Insights & Scientific Findings
1. **Communication-Bound Nature**: Distributed consensus over graphs is strictly communication-bound. Because computation per node is $O(1)$ while inter-rank message synchronization incurs IPC overhead, speedup $S(p) < 1.0$ and parallel efficiency $E(p) < 1.0$. This accurately reflects Amdahl's Law and distributed systems theory.
2. **Deterministic Message Complexity**: Total election messages exchanged scale with the number of graph edges ($2 \cdot |E|$ per round), regardless of process count.
3. **Diameter Bound**: Convergence is strictly achieved within $\Delta$ synchronous rounds (3 rounds for 10/25 nodes; 4 rounds for 50/100 nodes).

High-resolution performance charts are stored in:
- [`experiments/plots/runtime_vs_graph_size.png`](file:///d:/PDS/experiments/plots/runtime_vs_graph_size.png)
- [`experiments/plots/message_count_vs_size.png`](file:///d:/PDS/experiments/plots/message_count_vs_size.png)
- [`experiments/plots/speedup_and_efficiency.png`](file:///d:/PDS/experiments/plots/speedup_and_efficiency.png)

---

## 6. Project Directory Structure

```
distributed-leader-election/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app & static file mounts (/plots, /reports)
│   │   ├── config.py                # Pydantic v2 application settings
│   │   ├── api/                     # REST endpoints (dataset, experiments, metrics, etc.)
│   │   ├── models/                  # Pydantic data schemas
│   │   ├── services/                # Simulation orchestration & cluster management
│   │   └── websocket/               # Real-time WebSocket broadcasting
│   └── tests/                       # 27 automated unit, integration, and E2E tests
├── dataset/
│   ├── dataset_manager.py           # Stanford SNAP downloader, parser & subgraph extractor
│   ├── README.md                    # Dataset source documentation & citations
│   └── raw/                         # p2p-Gnutella08.txt.gz & p2p-Gnutella08.txt
├── distributed/
│   ├── mpi_main.py                  # Standalone CLI runner for MPI execution
│   ├── election.py                  # Topology-aware maximum-ID distributed election protocol
│   ├── messages.py                  # Typed MPI message envelopes
│   ├── topology.py                  # Graph-to-MPI rank topology mapper
│   ├── failure_simulator.py         # Controlled node failure simulator
│   ├── threaded_monitor.py          # Watchdog & non-blocking heartbeat monitor
│   └── mpi_runtime.py               # MPI Communicator (native mpi4py + in-process queue)
├── experiments/
│   ├── run_experiment.py            # Reproducible benchmark grid executor
│   ├── results/                     # benchmark_results.csv
│   └── plots/                       # Generated Matplotlib charts (PNG)
├── frontend/
│   ├── src/
│   │   ├── components/              # GnutellaMPISection, NetworkGraph, OverviewCards, etc.
│   │   ├── pages/Dashboard.tsx      # Dual-mode tabbed dashboard
│   │   ├── services/api.ts          # Strongly-typed backend API client
│   │   └── types/                   # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
├── reports/
│   ├── project_report.md            # Complete academic laboratory project report
│   └── project_report.pdf           # 14-page print-ready PDF with embedded charts
├── scripts/
│   ├── run_mpi_experiment.bat       # Windows batch script for MPI experiments
│   └── run_mpi_experiment.sh        # Linux / WSL shell script for Open MPI
├── requirements.txt                 # Frozen Python dependencies
├── pyproject.toml                   # Project configuration
└── README.md                        # Master project documentation
```

---

## 7. How to Run the System

### Prerequisites
- **Python**: Version 3.11 or 3.12 (virtual environment provided in `.venv`).
- **Node.js**: Version 18+ (Vite + React frontend).
- **MPI Runtime**:
  - **Windows**: Microsoft MPI (`msmpisetup.exe` / `msmpisdk.msi`) or automated in-process runtime.
  - **Linux / WSL**: `sudo apt install openmpi-bin libopenmpi-dev`.

### Step 1: Start the Backend Server
```powershell
# From project root
d:\PDS\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- SNAP Dataset Info: [http://127.0.0.1:8000/api/dataset/info](http://127.0.0.1:8000/api/dataset/info)

### Step 2: Start the React Frontend Dashboard
```powershell
# From frontend directory
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
- Dashboard URL: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

### Step 3: Run the Standalone MPI Engine (CLI)
```powershell
# Execute 25-node Gnutella election across 2 MPI ranks
d:\PDS\.venv\Scripts\python.exe distributed/mpi_main.py --size 25 --ranks 2 --seed 42

# Execute with injected coordinator failure
d:\PDS\.venv\Scripts\python.exe distributed/mpi_main.py --size 25 --ranks 2 --seed 42 --fail 6296
```

### Step 4: Run the Benchmark Suite & Regenerate Plots
```powershell
d:\PDS\.venv\Scripts\python.exe experiments/run_experiment.py
```

### Step 5: Run Automated Tests
```powershell
d:\PDS\.venv\Scripts\pytest.exe backend/tests -v
```
All **27 tests** will pass with 100% pass rate.

---

## 8. Demonstration Checklist

Follow these steps for a live laboratory evaluation:

- [x] **Scenario A (Gnutella Subgraph & Initial Election)**:
  1. Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/) on the **Stanford SNAP Gnutella & MPI Engine** tab.
  2. Select `25 Nodes` and `2 Ranks`.
  3. Click **Launch MPI Distributed Election**.
  4. Observe the elected coordinator (Node 6296), wall-clock execution time (ms), and rank distribution.
- [x] **Scenario B (Coordinator Failure & Re-Election)**:
  1. In the **Injected Node Failures** input, enter `6296`.
  2. Click **Launch MPI Distributed Election**.
  3. Observe that Node 6296 is excluded from election participation.
  4. The surviving node with the next highest ID is unanimously elected coordinator.
- [x] **Scenario C (TCP Sockets Cluster Demonstration)**:
  1. Switch to the **Interactive TCP Bully Cluster** tab.
  2. Click **Start Cluster** to spawn 5 independent OS node processes on TCP ports 9001–9005.
  3. Click **Fail Node** on Node 5 (current coordinator).
  4. Observe heartbeat timeout, election message propagation, and Node 4 assuming leadership.
  5. Click **Restart Node** on Node 5; observe Node 5 bullying lower-ID nodes and reclaiming leadership.
- [x] **Scenario D (Empirical Charts & Summary Table)**:
  1. Scroll down to the **Empirical Performance Evaluation** section.
  2. Review the 3 embedded Matplotlib plots and the 12-row benchmark table.
- [x] **Scenario E (Print-Ready Report PDF)**:
  1. Open the generated project report directly at [`reports/project_report.pdf`](file:///d:/PDS/reports/project_report.pdf) for the complete 14-page formal documentation with team contributions.

---

## 9. Academic References & Citations

1. **J. Leskovec, J. Kleinberg, and C. Faloutsos**, *"Graph Evolution: Densification and Shrinking Diameters"*, ACM Transactions on Knowledge Discovery from Data (ACM TKDD), Vol. 1, No. 1, 2007.
2. **R. Ripeanu, I. Foster, and A. Iamnitchi**, *"Mapping the Gnutella Network: Properties of Large-Scale Peer-to-Peer Systems and Implications for System Design"*, IEEE Internet Computing, Vol. 6, No. 1, pp. 50–57, 2002.
3. **H. Garcia-Molina**, *"Elections in a Distributed Computing System"*, IEEE Transactions on Computers, Vol. C-31, No. 1, pp. 48–59, 1982.
4. **Message Passing Interface Forum**, *"MPI: A Message-Passing Interface Standard Version 4.0"*, 2021.
