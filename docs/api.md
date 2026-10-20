# REST and WebSocket API Reference

The backend exposes RESTful HTTP endpoints and a real-time WebSocket stream on port `8000`.

Base URL: `http://127.0.0.1:8000`

---

## 1. REST Endpoints

### Health Check
- **`GET /api/health`**
  - **Description**: Returns backend service status and version.
  - **Response `200 OK`**:
    ```json
    {
      "status": "ok",
      "service": "Distributed Leader Election Backend",
      "version": "1.0.0"
    }
    ```

### Node Management
- **`GET /api/nodes`**
  - **Description**: Returns the runtime status of all configured nodes.
  - **Response `200 OK`**:
    ```json
    [
      {
        "id": 1,
        "host": "127.0.0.1",
        "port": 9001,
        "status": "ALIVE",
        "is_coordinator": false,
        "current_coordinator": 5,
        "election_generation": 1,
        "pid": 28412,
        "started_at": 1713500000.0,
        "last_heartbeat": 1713500010.5,
        "peers": [2, 3, 4, 5]
      }
    ]
    ```

- **`GET /api/nodes/{node_id}`**
  - **Description**: Returns detailed state and recent TCP message history for a specific node.
  - **Response `200 OK` / `404 Not Found`**

- **`POST /api/nodes/{node_id}/fail`**
  - **Description**: Injects failure into the specified node process (sends `ADMIN_STOP` over TCP and terminates process).
  - **Response `200 OK`**:
    ```json
    {
      "status": "success",
      "node_id": 5,
      "action": "failed"
    }
    ```

- **`POST /api/nodes/{node_id}/restart`**
  - **Description**: Restarts a previously failed node process and triggers re-entry election.
  - **Response `200 OK`**

### Network Topology
- **`GET /api/topology`**
  - **Description**: Returns nodes, edges, active/failed counts, and NetworkX connectivity state.
  - **Response `200 OK`**:
    ```json
    {
      "nodes": [...],
      "edges": [{"source": 1, "target": 2}, ...],
      "total_nodes": 5,
      "active_nodes": 5,
      "failed_nodes": 0,
      "current_coordinator": 5,
      "is_connected": true
    }
    ```

### Election Management
- **`GET /api/election/status`**
  - **Description**: Current election state and active coordinator.
  - **Response `200 OK`**:
    ```json
    {
      "current_coordinator": 5,
      "is_running": true,
      "total_nodes": 5,
      "active_nodes": 5,
      "failed_nodes": 0,
      "election_in_progress": false,
      "history_count": 1
    }
    ```

- **`GET /api/election/history`**
  - **Description**: Historical log of coordinator transitions.
  - **Response `200 OK`**:
    ```json
    [
      {
        "id": "e0a1b2c3",
        "timestamp": 1713500005.0,
        "previous_coordinator": 5,
        "new_coordinator": 4,
        "trigger_node": 1,
        "reason": "Coordinator changed: Node 5 -> Node 4",
        "generation": 2,
        "status": "COMPLETED"
      }
    ]
    ```

- **`POST /api/election/start`**
  - **Description**: Manually initiate an election from an active node.
  - **Request Body (optional)**:
    ```json
    { "initiator_id": 1 }
    ```

### Simulation Lifecycle
- **`POST /api/simulation/start`**: Spawns all node processes and runs initial election.
- **`POST /api/simulation/stop`**: Terminates all child node processes.
- **`POST /api/simulation/reset`**: Resets history, state, and restarts all nodes clean.
- **`GET /api/events?limit=100`**: Retrieves recent system and message events.

---

## 2. WebSocket Interface

- **Endpoint**: `ws://127.0.0.1:8000/ws`
- **Protocol**: JSON-serialized `SystemEvent` records pushed on every state transition.
- **Payload Schema**:
  ```json
  {
    "id": "uuid-string",
    "timestamp": 1713500000.123,
    "event_type": "ELECTION_MESSAGE_SENT",
    "sender_id": 1,
    "receiver_id": 5,
    "election_id": "elect-1-1713500000",
    "generation": 1,
    "description": "Node 1 sent ELECTION message to higher Node 5",
    "details": {}
  }
  ```
