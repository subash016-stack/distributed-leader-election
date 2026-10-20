export interface ElectionStatus {
  current_coordinator: number | null;
  is_running: boolean;
  total_nodes: number;
  active_nodes: number;
  failed_nodes: number;
  election_in_progress: boolean;
  history_count: number;
}
