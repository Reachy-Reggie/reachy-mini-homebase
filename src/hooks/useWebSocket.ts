// Generic WebSocket Hook for Reachy Mini Dashboard

import { useEffect, useRef, useState, useCallback } from 'react';
import { getWsBaseUrl, WS_DEFAULTS } from '../config/api';

export interface WebSocketOptions {
  endpoint: string;
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: unknown | null;
  error: string | null;
}

export function useWebSocket(options: WebSocketOptions) {
  const {
    endpoint,
    onMessage,
    onOpen,
    onClose,
    onError,
    autoConnect = true,
    reconnect = true,
    reconnectDelay = WS_DEFAULTS.reconnectDelay,
    maxReconnectAttempts = WS_DEFAULTS.maxReconnectAttempts,
  } = options;

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);

  // Store callbacks in refs to avoid dependency issues
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  }, [onMessage, onOpen, onClose, onError]);

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    lastMessage: null,
    error: null,
  });

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      // Remove event handlers before closing to prevent callbacks
      socketRef.current.onopen = null;
      socketRef.current.onmessage = null;
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;
    if (socketRef.current?.readyState === WebSocket.CONNECTING ||
        socketRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected or connecting
    }

    cleanup();

    const url = `${getWsBaseUrl()}${endpoint}`;
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        if (isUnmountedRef.current) return;
        reconnectAttemptsRef.current = 0;
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
        onOpenRef.current?.();
      };

      socket.onmessage = (event) => {
        if (isUnmountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          setState((prev) => ({ ...prev, lastMessage: data }));
          onMessageRef.current?.(data);
        } catch {
          setState((prev) => ({ ...prev, lastMessage: event.data }));
          onMessageRef.current?.(event.data);
        }
      };

      socket.onclose = () => {
        if (isUnmountedRef.current) return;

        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));
        onCloseRef.current?.();

        // Attempt reconnection
        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isUnmountedRef.current) return;
            reconnectAttemptsRef.current += 1;
            connect();
          }, reconnectDelay);
        }
      };

      socket.onerror = () => {
        if (isUnmountedRef.current) return;
        setState((prev) => ({
          ...prev,
          error: 'WebSocket connection error',
          isConnecting: false,
        }));
        onErrorRef.current?.(new Event('error'));
      };
    } catch {
      setState((prev) => ({
        ...prev,
        error: 'Failed to create WebSocket connection',
        isConnecting: false,
      }));
    }
  }, [endpoint, reconnect, reconnectDelay, maxReconnectAttempts, cleanup]);

  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = maxReconnectAttempts;
    cleanup();
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));
  }, [cleanup, maxReconnectAttempts]);

  const send = useCallback((data: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        typeof data === 'string' ? data : JSON.stringify(data)
      );
      return true;
    }
    return false;
  }, []);

  // Auto-connect on mount - only depends on endpoint
  useEffect(() => {
    isUnmountedRef.current = false;
    reconnectAttemptsRef.current = 0;

    if (autoConnect) {
      connect();
    }

    return () => {
      isUnmountedRef.current = true;
      cleanup();
    };
  }, [endpoint]); // Only reconnect when endpoint changes

  return {
    ...state,
    connect,
    disconnect,
    send,
  };
}
