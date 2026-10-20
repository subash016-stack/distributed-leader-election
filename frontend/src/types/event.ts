export type EventType =
  | 'SIMULATION_STARTED'
  | 'SIMULATION_STOPPED'
  | 'SIMULATION_RESET'
  | 'NODE_SPAWNED'
  | 'NODE_CONNECTED'
  | 'NODE_FAILED'
  | 'NODE_RECOVERED'
  | 'HEARTBEAT_SENT'
  | 'HEARTBEAT_ACK_RECEIVED'
  | 'HEARTBEAT_TIMEOUT'
  | 'ELECTION_STARTED'
  | 'ELECTION_MESSAGE_SENT'
  | 'OK_MESSAGE_RECEIVED'
  | 'COORDINATOR_ANNOUNCED'
  | 'COORDINATOR_CHANGED';

export interface SystemEvent {
  id: string;
  timestamp: number;
  event_type: EventType;
  sender_id: number | null;
  receiver_id: number | null;
  election_id: string | null;
  generation: number;
  description: string;
  details: Record<string, any>;
}

export interface CoordinatorRecord {
  id: string;
  timestamp: number;
  previous_coordinator: number | null;
  new_coordinator: number;
  trigger_node: number | null;
  reason: string;
  election_id: string | null;
  generation: number;
  status: string;
}
