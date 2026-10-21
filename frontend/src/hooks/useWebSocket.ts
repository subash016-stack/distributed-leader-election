import { useEffect, useRef, useState, useCallback } from 'react';
import { SystemEvent } from '../types/event';

export function useWebSocket(onEvent?: (event: SystemEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState<SystemEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const isUnmountedRef = useRef(false);

  // Store onEvent callback in ref so connect() doesn't re-create and reconnect on every render
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (!isUnmountedRef.current) {
          setIsConnected(true);
        }
      };

      socket.onmessage = (event) => {
        try {
          const data: SystemEvent = JSON.parse(event.data);
          setLatestEvent(data);
          if (onEventRef.current) {
            onEventRef.current(data);
          }
        } catch {
          // Non-JSON ping/pong
        }
      };

      socket.onclose = () => {
        if (!isUnmountedRef.current) {
          setIsConnected(false);
          // Attempt reconnect after 2.5 seconds
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, 2500);
        }
      };

      socket.onerror = () => {
        // Will trigger onclose automatically
        try {
          socket.close();
        } catch {
          // ignore
        }
      };

      wsRef.current = socket;
    } catch {
      if (!isUnmountedRef.current) {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
      }
    }
  }, []);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected, latestEvent };
}
