// Real-time Motion Control Hook
// Uses WebSocket for continuous target updates

import { useCallback, useRef, useEffect, useState } from 'react';
import { getWsBaseUrl, WS_ENDPOINTS } from '../config/api';
import { useRobotStore } from '../stores/robotStore';
import type { XYZRPYPose, SetTargetRequest } from '../types/robot';

interface MotionControlOptions {
  autoConnect?: boolean;
  throttleMs?: number; // Minimum ms between updates
}

interface MotionControlState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useMotionControl(options: MotionControlOptions = {}) {
  const { autoConnect = true, throttleMs = 50 } = options;

  const socketRef = useRef<WebSocket | null>(null);
  const lastSendTimeRef = useRef<number>(0);
  const pendingUpdateRef = useRef<SetTargetRequest | null>(null);
  const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountedRef = useRef(false);

  const [state, setState] = useState<MotionControlState>({
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  // Get current state from store
  const headPose = useRobotStore((s) => s.headPose);
  const antennasPosition = useRobotStore((s) => s.antennasPosition);
  const bodyYaw = useRobotStore((s) => s.bodyYaw);

  // Store setters for target state
  const setTargetHeadPose = useRobotStore((s) => s.setTargetHeadPose);
  const setTargetAntennas = useRobotStore((s) => s.setTargetAntennas);
  const setTargetBodyYaw = useRobotStore((s) => s.setTargetBodyYaw);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.onmessage = null;
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;
    if (socketRef.current?.readyState === WebSocket.CONNECTING ||
        socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    cleanup();

    const url = `${getWsBaseUrl()}${WS_ENDPOINTS.moveSetTarget}`;
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        if (isUnmountedRef.current) return;
        setState({
          isConnected: true,
          isConnecting: false,
          error: null,
        });
      };

      socket.onclose = () => {
        if (isUnmountedRef.current) return;
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));
      };

      socket.onerror = () => {
        if (isUnmountedRef.current) return;
        setState((prev) => ({
          ...prev,
          error: 'Motion control WebSocket error',
          isConnecting: false,
        }));
      };

      socket.onmessage = (event) => {
        if (isUnmountedRef.current) return;
        // Handle acknowledgments or errors from server
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            setState((prev) => ({ ...prev, error: data.error }));
          }
        } catch {
          // Ignore non-JSON messages
        }
      };
    } catch {
      if (!isUnmountedRef.current) {
        setState({
          isConnected: false,
          isConnecting: false,
          error: 'Failed to connect to motion control',
        });
      }
    }
  }, [cleanup]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    cleanup();
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));
  }, [cleanup]);

  // Send update with throttling
  const sendUpdate = useCallback(
    (request: SetTargetRequest) => {
      if (socketRef.current?.readyState !== WebSocket.OPEN) {
        setState((prev) => ({ ...prev, error: 'Not connected' }));
        return false;
      }

      const now = Date.now();
      const timeSinceLastSend = now - lastSendTimeRef.current;

      if (timeSinceLastSend >= throttleMs) {
        // Send immediately
        socketRef.current.send(JSON.stringify(request));
        lastSendTimeRef.current = now;
        pendingUpdateRef.current = null;
        return true;
      }

      // Schedule throttled update
      pendingUpdateRef.current = request;

      if (!throttleTimeoutRef.current) {
        throttleTimeoutRef.current = setTimeout(() => {
          throttleTimeoutRef.current = null;
          if (pendingUpdateRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(pendingUpdateRef.current));
            lastSendTimeRef.current = Date.now();
            pendingUpdateRef.current = null;
          }
        }, throttleMs - timeSinceLastSend);
      }

      return true;
    },
    [throttleMs]
  );

  // High-level control functions
  const setHeadPose = useCallback(
    (pose: Partial<XYZRPYPose>) => {
      // Merge with current or default values
      const currentPose = headPose || { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 };
      const newPose: XYZRPYPose = { ...currentPose, ...pose };

      setTargetHeadPose(newPose);
      return sendUpdate({ target_head_pose: newPose });
    },
    [headPose, setTargetHeadPose, sendUpdate]
  );

  const setAntennas = useCallback(
    (antennas: [number, number]) => {
      setTargetAntennas(antennas);
      return sendUpdate({ target_antennas: antennas });
    },
    [setTargetAntennas, sendUpdate]
  );

  const setBodyYaw = useCallback(
    (yaw: number) => {
      setTargetBodyYaw(yaw);
      return sendUpdate({ target_body_yaw: yaw });
    },
    [setTargetBodyYaw, sendUpdate]
  );

  // Set full target state at once
  const setTarget = useCallback(
    (request: SetTargetRequest) => {
      if (request.target_head_pose) {
        setTargetHeadPose(request.target_head_pose as XYZRPYPose);
      }
      if (request.target_antennas) {
        setTargetAntennas(request.target_antennas);
      }
      if (request.target_body_yaw !== undefined) {
        setTargetBodyYaw(request.target_body_yaw);
      }
      return sendUpdate(request);
    },
    [setTargetHeadPose, setTargetAntennas, setTargetBodyYaw, sendUpdate]
  );

  // Auto-connect on mount
  useEffect(() => {
    isUnmountedRef.current = false;

    if (autoConnect) {
      connect();
    }

    return () => {
      isUnmountedRef.current = true;
      cleanup();
    };
  }, [autoConnect]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    connect,
    disconnect,
    setHeadPose,
    setAntennas,
    setBodyYaw,
    setTarget,
    // Expose current state for convenience
    currentHeadPose: headPose,
    currentAntennas: antennasPosition,
    currentBodyYaw: bodyYaw,
  };
}
