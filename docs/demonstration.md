# Laboratory Demonstration Guide

## Distributed Leader Election in Networked Systems

This guide provides the exact demonstration procedure required for the **Parallel and Distributed Systems Laboratory**.

---

## Prerequisites & Launch

### 1. Start the Backend
Open a PowerShell or Command Prompt terminal:
```bat
.\scripts\start_backend.bat
```
*Wait until you see:* `Uvicorn running on http://127.0.0.1:8000`

### 2. Start the Frontend Dashboard
Open a second terminal:
```bat
.\scripts\start_frontend.bat
```
*Open your web browser at:* `http://localhost:5173`

---

## Demonstration Script

### Step 1: System Initialization
1. In the dashboard top control bar, click **"Start System"** (or observe auto-initialization).
2. The backend launches 5 independent Python OS processes:
   - Node 1 on port 9001
   - Node 2 on port 9002
   - Node 3 on port 9003
   - Node 4 on port 9004
   - Node 5 on port 9005
3. An initial election occurs: lower nodes send `ELECTION` up to Node 5.
4. **Expected Result**:
   - Current Coordinator: **Node 5** (Green with crown icon).
   - Nodes 1, 2, 3, 4: Active (Blue).
   - Failed Nodes: None.
   - React Flow displays all 5 interconnected mesh nodes.

---

### Step 2: Inject Coordinator Failure (Fail Node 5)
1. In the **Simulation & Failure Controls** card, locate **Fail Node (Simulate Crash)**.
2. Ensure **Node 5 (Coordinator)** is selected in the dropdown.
3. Click the red **"Fail"** button.
4. **Expected Result**:
   - The OS process for Node 5 is terminated immediately.
   - Node 5 turns **Red (Failed)** in the topology graph.
   - The **"Failed Nodes"** card updates to show: **Node 5**.

---

### Step 3: Observe Election Process
1. Within 2–5 seconds, the failure detector on non-coordinator nodes detects missing heartbeats from Node 5.
2. Nodes 1, 2, 3, and 4 initiate Bully elections.
3. In the **Real-Time Election Event Timeline**, observe actual TCP messages:
   - Node 1 sends `ELECTION` to Nodes 2, 3, 4, 5.
   - Node 2 and Node 3 respond with `OK`.
   - Node 4 attempts to send `ELECTION` to Node 5 (fails / connection refused).
   - Node 4 receives no `OK` from higher nodes.

---

### Step 4: Coordinator Victory Announcement
1. Node 4 discovers it is the highest reachable active node.
2. Node 4 broadcasts `COORDINATOR` over TCP to Nodes 1, 2, and 3.
3. **Expected Result**:
   - Node 4 turns **Green** with the Crown icon.
   - The **"Current Coordinator"** card updates to: **Node 4**.
   - The **"Latest Transition"** card updates to: **Node 5 → Node 4**.
   - All surviving nodes update their coordinator view to Node 4.

---

### Step 5: Sequential Coordinator Failure (Fail Node 4)
1. In the **Fail Node** control, select **Node 4 (Coordinator)**.
2. Click **"Fail"**.
3. **Expected Result**:
   - Node 4 process is terminated.
   - Nodes 1, 2, and 3 initiate an election.
   - Node 3 receives no OK from higher nodes.
   - **Node 3** emerges as the new coordinator and turns Green.
   - Failed Nodes list shows: **Node 5, Node 4**.

---

### Step 6: Restarting Nodes & Recovery
1. In the **Restart Failed Node** control, select **Node 5**.
2. Click **"Restart"**.
3. **Expected Result**:
   - Fresh process is launched on port 9005.
   - Node 5 sends an election message and immediately claims coordinator because its ID (5) is higher than Node 3!
   - Node 5 asserts leadership and resumes as coordinator.

---

### Step 7: Reset Simulation
1. Click the **"Reset"** button in the header or controls.
2. All running processes are terminated cleanly, event history is reset, and a fresh 5-node cluster is spawned with Node 5 as coordinator.
