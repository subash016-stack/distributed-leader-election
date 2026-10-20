import { TopologyData, NodeInfo } from '../types/node';
import { SystemEvent, CoordinatorRecord } from '../types/event';
import { ElectionStatus } from '../types/simulation';

const API_BASE = '/api';

export interface DatasetInfo {
  dataset_name: string;
  source_url: string;
  citation: string;
  published_nodes: number;
  published_edges: number;
  parsed_directed_nodes: number;
  parsed_directed_edges: number;
  undirected_nodes: number;
  undirected_unique_edges: number;
  duplicate_directed_edges: number;
  self_loops: number;
  connected_components_count: number;
  largest_connected_component_nodes: number;
  largest_connected_component_edges: number;
  average_degree: number;
}

export interface MetricRecord {
  GraphSize: number;
  MPIRanks: number;
  WallClockSec: number;
  TotalMessages: number;
  Rounds: number;
  Diameter: number;
  Speedup: number;
  Efficiency: number;
  Coordinators: string;
}

export const api = {
  async checkHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Backend health check failed');
    return res.json();
  },

  async getDatasetInfo(): Promise<DatasetInfo> {
    const res = await fetch(`${API_BASE}/dataset/info`);
    if (!res.ok) throw new Error('Failed to fetch dataset info');
    return res.json();
  },

  async getDatasetTopology(size: number = 10, seed: number = 42): Promise<any> {
    const res = await fetch(`${API_BASE}/dataset/topology?size=${size}&seed=${seed}`);
    if (!res.ok) throw new Error('Failed to fetch dataset topology');
    return res.json();
  },

  async runMPIExperiment(
    subgraphSize: number = 10,
    numRanks: number = 2,
    seed: number = 42,
    failedNodes: number[] = []
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/experiments/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subgraph_size: subgraphSize,
        num_ranks: numRanks,
        seed,
        failed_nodes: failedNodes,
        enable_threading: true,
      }),
    });
    if (!res.ok) throw new Error('Failed to run MPI experiment');
    return res.json();
  },

  async getMetrics(): Promise<{ metrics: MetricRecord[]; csv_available: boolean }> {
    const res = await fetch(`${API_BASE}/metrics`);
    if (!res.ok) throw new Error('Failed to fetch performance metrics');
    return res.json();
  },

  async getTopology(): Promise<TopologyData> {
    const res = await fetch(`${API_BASE}/topology`);
    if (!res.ok) throw new Error('Failed to fetch topology');
    return res.json();
  },

  async getNodes(): Promise<NodeInfo[]> {
    const res = await fetch(`${API_BASE}/nodes`);
    if (!res.ok) throw new Error('Failed to fetch nodes');
    return res.json();
  },

  async getNodeDetails(nodeId: number): Promise<NodeInfo> {
    const res = await fetch(`${API_BASE}/nodes/${nodeId}`);
    if (!res.ok) throw new Error(`Failed to fetch node ${nodeId}`);
    return res.json();
  },

  async getElectionStatus(): Promise<ElectionStatus> {
    const res = await fetch(`${API_BASE}/election/status`);
    if (!res.ok) throw new Error('Failed to fetch election status');
    return res.json();
  },

  async getElectionHistory(): Promise<CoordinatorRecord[]> {
    const res = await fetch(`${API_BASE}/election/history`);
    if (!res.ok) throw new Error('Failed to fetch election history');
    return res.json();
  },

  async getEvents(limit: number = 100): Promise<SystemEvent[]> {
    const res = await fetch(`${API_BASE}/events?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async startSimulation(): Promise<void> {
    const res = await fetch(`${API_BASE}/simulation/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start simulation');
  },

  async stopSimulation(): Promise<void> {
    const res = await fetch(`${API_BASE}/simulation/stop`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to stop simulation');
  },

  async resetSimulation(): Promise<void> {
    const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset simulation');
  },

  async failNode(nodeId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/nodes/${nodeId}/fail`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to fail node ${nodeId}`);
  },

  async restartNode(nodeId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/nodes/${nodeId}/restart`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to restart node ${nodeId}`);
  },

  async triggerElection(initiatorId?: number): Promise<void> {
    const res = await fetch(`${API_BASE}/election/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initiator_id: initiatorId ?? null }),
    });
    if (!res.ok) throw new Error('Failed to start election');
  },
};
