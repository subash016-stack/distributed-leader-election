import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { TopologyData, NodeInfo } from '../types/node';
import { SystemEvent, CoordinatorRecord } from '../types/event';
import { ElectionStatus } from '../types/simulation';
import { useWebSocket } from './useWebSocket';

export function useSimulation() {
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [history, setHistory] = useState<CoordinatorRecord[]>([]);
  const [status, setStatus] = useState<ElectionStatus | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<NodeInfo | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchFullState = useCallback(async () => {
    try {
      const [topo, hist, st] = await Promise.all([
        api.getTopology(),
        api.getElectionHistory(),
        api.getElectionStatus(),
      ]);
      setTopology(topo);
      setHistory(hist);
      setStatus(st);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  // Handle incoming live WebSocket event
  const handleLiveEvent = useCallback((event: SystemEvent) => {
    setEvents((prev) => [event, ...prev.slice(0, 199)]);
    // Re-fetch topology and history on state changing events
    if (
      event.event_type.includes('COORDINATOR') ||
      event.event_type.includes('NODE_') ||
      event.event_type.includes('SIMULATION_') ||
      event.event_type.includes('TIMEOUT')
    ) {
      fetchFullState();
    }
  }, [fetchFullState]);

  const { isConnected: wsConnected } = useWebSocket(handleLiveEvent);

  // Initial load
  useEffect(() => {
    fetchFullState();
    api.getEvents(50).then((evts) => setEvents(evts.reverse())).catch(() => {});
  }, [fetchFullState]);

  // Periodic fallback refresh every 2.5s
  useEffect(() => {
    const timer = setInterval(() => {
      fetchFullState();
    }, 2500);
    return () => clearInterval(timer);
  }, [fetchFullState]);

  // Refresh selected node details
  useEffect(() => {
    if (selectedNodeId !== null) {
      api.getNodeDetails(selectedNodeId)
        .then(setSelectedNodeInfo)
        .catch(() => setSelectedNodeInfo(null));
    } else {
      setSelectedNodeInfo(null);
    }
  }, [selectedNodeId, topology]);

  const executeAction = async (actionFn: () => Promise<void>) => {
    setIsLoading(true);
    setActionError(null);
    try {
      await actionFn();
      await fetchFullState();
    } catch (err: any) {
      setActionError(err.message || 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    topology,
    events,
    history,
    status,
    selectedNodeId,
    setSelectedNodeId,
    selectedNodeInfo,
    backendOnline,
    wsConnected,
    isLoading,
    actionError,
    startSimulation: () => executeAction(api.startSimulation),
    stopSimulation: () => executeAction(api.stopSimulation),
    resetSimulation: () => executeAction(api.resetSimulation),
    failNode: (id: number) => executeAction(() => api.failNode(id)),
    restartNode: (id: number) => executeAction(() => api.restartNode(id)),
    triggerElection: (initiatorId?: number) => executeAction(() => api.triggerElection(initiatorId)),
    clearEvents: () => setEvents([]),
  };
}
