export type NodeStatusType = 'ALIVE' | 'FAILED' | 'SUSPECTED' | 'ELECTION' | 'OFFLINE';

export interface NodeInfo {
  id: number;
  host: string;
  port: number;
  status: NodeStatusType;
  is_coordinator: boolean;
  current_coordinator: number | null;
  election_generation: number;
  pid: number | null;
  started_at: number | null;
  last_heartbeat: number | null;
  peers: number[];
  recent_messages?: Array<{
    timestamp: number;
    direction: 'IN' | 'OUT';
    type: string;
    peer_id: number;
    details: string;
  }>;
}

export interface NetworkEdge {
  source: number;
  target: number;
}

export interface TopologyData {
  nodes: NodeInfo[];
  edges: NetworkEdge[];
  total_nodes: number;
  active_nodes: number;
  failed_nodes: number;
  current_coordinator: number | null;
  is_connected: boolean;
}
