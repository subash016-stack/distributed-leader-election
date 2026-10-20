# System Architecture

## Distributed Leader Election in Networked Systems

This document describes the architectural design of the **Distributed Leader Election System** built for the Parallel and Distributed Systems Laboratory.

---

## 1. High-Level Architecture Overview

The system is organized as a multi-tier distributed architecture containing:

1. **Independent Node Processes**: Each node runs as an autonomous Python operating system process listening on a distinct TCP port (`9001` through `9005`).
2. **TCP Socket Layer**: Nodes exchange newline-delimited JSON messages (`ELECTION`, `OK`, `COORDINATOR`, `HEARTBEAT`) directly over TCP streams.
3. **Simulation Controller / Node Manager**: Spawns OS processes, issues administrative commands, models network topology using NetworkX, and monitors process health.
4. **FastAPI Backend**: Exposes REST endpoints and a WebSocket channel for real-time status streaming.
5. **React Dashboard**: Provides interactive topology visualization (React Flow), controls, live timeline, and node inspection.

```mermaid
graph TD
    UI[React + React Flow Dashboard] <-->|REST & WebSocket| API[FastAPI Backend / State Service]
    API <-->|Process Mgmt & Admin Socket| NM[Node Process Manager]
    
    subgraph Distributed TCP Mesh
        N1[Node 1 : 9001] <-->|TCP Sockets| N2[Node 2 : 9002]
        N2 <-->|TCP Sockets| N3[Node 3 : 9003]
        N3 <-->|TCP Sockets| N4[Node 4 : 9004]
        N4 <-->|TCP Sockets| N5[Node 5 : 9005 (Coordinator)]
        N1 <-->|TCP Sockets| N5
        N1 <-->|TCP Sockets| N3
        N2 <-->|TCP Sockets| N4
        N2 <-->|TCP Sockets| N5
        N3 <-->|TCP Sockets| N5
        N1 <-->|TCP Sockets| N4
    end

    NM -.->|Spawn / Terminate| N1
    NM -.->|Spawn / Terminate| N2
    NM -.->|Spawn / Terminate| N3
    NM -.->|Spawn / Terminate| N4
    NM -.->|Spawn / Terminate| N5
```

---

## 2. Component Specifications

### 2.1 Independent Node Process (`app.nodes.node_process`)
- Each node runs in its own process space and does not share memory with peers or the backend.
- Manages an `AsyncTCPServer` listening on `127.0.0.1:<PORT>`.
- Maintains local `NodeState` (status, coordinator view, generation number, recent traffic buffer).
- Runs an instance of `BullyElectionEngine` to evaluate election rules.
- Runs an instance of `HeartbeatFailureDetector` to probe the current coordinator.

### 2.2 TCP Communication Protocol (`app.network.protocol`)
- Framing: Newline-delimited UTF-8 encoded JSON packets (`\n`).
- Validated via Pydantic (`NetworkMessage` schema).
- Fields:
  - `message_type`: `ELECTION`, `OK`, `COORDINATOR`, `HEARTBEAT`, `HEARTBEAT_ACK`, `ADMIN_STOP`, `ADMIN_STATUS`, `START_ELECTION`.
  - `sender_id`: Unique integer ID of the transmitting node.
  - `receiver_id`: Unique integer ID of the target peer (or `0` for broadcast).
  - `election_id`: Unique string identifying the election run.
  - `generation`: Integer incremented with each election round to detect and drop stale messages.
  - `timestamp`: Unix timestamp in seconds.
  - `payload`: Optional structured dictionary with auxiliary state data.

### 2.3 Network Topology Manager (`app.network.topology`)
- Modeled using `NetworkX` graph structure (`nx.Graph`).
- Default: 5 nodes in a complete mesh graph (10 bidirectional edges).
- Validates node IDs (positive integers), port bounds (1024–65535), and checks graph connectivity (`nx.is_connected`).

### 2.4 Event Bus and WebSocket Service (`app.services.event_service`)
- Broadcasts real-time events to all active WebSocket clients.
- Buffers up to 500 recent events in memory for initial client backfill.

---

## 3. Communication Patterns

### Election Sequence (Bully Algorithm)
1. Detecting node sends `ELECTION` to all higher-ID peers (`peer_id > my_id`).
2. Higher-ID nodes respond with `OK`.
3. If `OK` is received, the lower node waits for a `COORDINATOR` message within `election_timeout` seconds.
4. If no higher-ID node responds before timeout, the initiating node declares victory and broadcasts `COORDINATOR` to all peers.

### Failure Detection Loop
1. Non-coordinator nodes periodically send `HEARTBEAT` packets to the active coordinator.
2. The coordinator immediately returns `HEARTBEAT_ACK`.
3. If 2 consecutive heartbeats miss responses, the non-coordinator suspects coordinator failure and initiates an election.
