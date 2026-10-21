import { useState, useEffect, useCallback, useRef } from 'react';
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

  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Don't mark offline if just a transient election glitch
    }
  }, []);

  const debouncedFetchState = useCallback(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => {
      fetchFullState();
    }, 350);
  }, [fetchFullState]);

  // Handle incoming live WebSocket event
  const handleLiveEvent = useCallback((event: SystemEvent) => {
    // Filter out raw heartbeat noise to keep clean high-value core events
    if (event.event_type === 'HEARTBEAT_SENT' || event.event_type === 'HEARTBEAT_ACK_RECEIVED') {
      return;
    }

    setEvents((prev) => {
      const exists = prev.some((e) => e.id === event.id);
      if (exists) return prev;
      return [event, ...prev.slice(0, 99)];
    });

    // Re-fetch topology and history with debounce on state-changing events
    if (
      event.event_type.includes('COORDINATOR') ||
      event.event_type.includes('NODE_') ||
      event.event_type.includes('SIMULATION_') ||
      event.event_type.includes('TIMEOUT') ||
      event.event_type.includes('ELECTION')
    ) {
      debouncedFetchState();
    }
  }, [debouncedFetchState]);

  const { isConnected: wsConnected } = useWebSocket(handleLiveEvent);

  // Initial load
  useEffect(() => {
    fetchFullState();
    api.getEvents(50).then((evts) => {
      const coreOnly = evts.filter(
        (e) => e.event_type !== 'HEARTBEAT_SENT' && e.event_type !== 'HEARTBEAT_ACK_RECEIVED'
      );
      const unique = coreOnly.filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i);
      setEvents(unique.reverse());
    }).catch(() => {});
  }, [fetchFullState]);

  // Periodic fallback refresh every 3s
  useEffect(() => {
    const timer = setInterval(() => {
      fetchFullState();
    }, 3000);
    return () => clearInterval(timer);
  }, [fetchFullState]);

  // Keep selected node details persistent (never close on election!)
  useEffect(() => {
    if (selectedNodeId !== null) {
      const nodeFromTopology = topology?.nodes.find((n) => n.id === selectedNodeId);
      if (nodeFromTopology) {
        setSelectedNodeInfo((prev) => (prev ? { ...prev, ...nodeFromTopology } : nodeFromTopology));
      }
      api.getNodeDetails(selectedNodeId)
        .then((details) => {
          setSelectedNodeInfo(details);
        })
        .catch(() => {
          // On temporary socket busy during election, retain topology node state
          if (nodeFromTopology) {
            setSelectedNodeInfo(nodeFromTopology);
          }
        });
    } else {
      setSelectedNodeInfo(null);
    }
  }, [selectedNodeId, topology]);

  const executeAction = async (actionFn: () => Promise<void>) => {
    setIsLoading(true);
    setActionError(null);
    try {
      await actionFn();
      // Allow distributed processes a moment to settle, then fetch
      setTimeout(() => {
        fetchFullState();
      }, 300);
    } catch (err: any) {
      setActionError(err.message || 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const crashCoordinatorAndElect = async () => {
    const coordId = topology?.current_coordinator;
    if (coordId) {
      await executeAction(async () => {
        await api.failNode(coordId);
      });
    }
  };

  const restartAllNodes = async () => {
    const failed = topology?.nodes.filter((n) => n.status === 'FAILED') || [];
    await executeAction(async () => {
      for (const n of failed) {
        await api.restartNode(n.id);
      }
      await api.triggerElection(1);
    });
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
    crashCoordinatorAndElect,
    restartAllNodes,
    clearEvents: () => setEvents([]),
  };
}
