// Robot State Hook - Real-time state via WebSocket

import { useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useRobotStore } from '../stores/robotStore';
import { WS_ENDPOINTS, WS_DEFAULTS } from '../config/api';
import type { FullState } from '../types/robot';

interface UseRobotStateOptions {
  frequency?: number;
}

export function useRobotState(options: UseRobotStateOptions = {}) {
  const { frequency = WS_DEFAULTS.stateFrequency } = options;

  const updateState = useRobotStore((state) => state.updateState);
  const setConnected = useRobotStore((state) => state.setConnected);
  const daemonState = useRobotStore((state) => state.daemonState);

  // Track if daemon is running
  const isDaemonRunning = daemonState === 'running';
  const wasRunningRef = useRef(isDaemonRunning);

  const handleMessage = useCallback(
    (data: unknown) => {
      updateState(data as FullState);
    },
    [updateState]
  );

  const handleOpen = useCallback(() => {
    setConnected(true);
  }, [setConnected]);

  const handleClose = useCallback(() => {
    setConnected(false);
  }, [setConnected]);

  const endpoint = `${WS_ENDPOINTS.stateStream}?frequency=${frequency}`;

  // Only auto-connect if daemon is running
  const ws = useWebSocket({
    endpoint,
    onMessage: handleMessage,
    onOpen: handleOpen,
    onClose: handleClose,
    autoConnect: isDaemonRunning,
    reconnect: isDaemonRunning, // Only reconnect if daemon is still running
    maxReconnectAttempts: isDaemonRunning ? WS_DEFAULTS.maxReconnectAttempts : 0,
  });

  // Connect/disconnect when daemon state changes
  useEffect(() => {
    if (isDaemonRunning && !wasRunningRef.current) {
      // Daemon just started - connect
      ws.connect();
    } else if (!isDaemonRunning && wasRunningRef.current) {
      // Daemon just stopped - disconnect
      ws.disconnect();
    }
    wasRunningRef.current = isDaemonRunning;
  }, [isDaemonRunning, ws]);

  return {
    isConnected: ws.isConnected,
    isConnecting: ws.isConnecting,
    error: ws.error,
    connect: ws.connect,
    disconnect: ws.disconnect,
  };
}
