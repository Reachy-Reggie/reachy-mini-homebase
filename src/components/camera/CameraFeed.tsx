// Camera Feed Component
// WebRTC camera stream using GStreamer webrtcsink signaling protocol

import { useState, useRef, useCallback, useEffect } from 'react';
import { ROBOT_CONFIG } from '../../config/api';
import { cameraService } from '../../services/camera';
import { cameraRecoveryService } from '../../services/cameraRecovery';
import { useRobotStore } from '../../stores/robotStore';

// Timeout and health check constants
const WS_CONNECT_TIMEOUT_MS = 10000; // 10 second WebSocket timeout
const STREAM_HEALTH_CHECK_INTERVAL_MS = 5000; // Check every 5 seconds

interface CameraFeedProps {
  className?: string;
}

// GStreamer signaling message types
interface WelcomeMessage {
  type: 'welcome';
  peerId: string;
}

interface ListMessage {
  type: 'list';
  producers: Array<{ id: string; meta?: { name?: string } }>;
}

interface SessionStartedMessage {
  type: 'sessionStarted';
  peerId: string;
  sessionId: string;
}

interface PeerMessage {
  type: 'peer';
  sessionId: string;
  sdp?: { type: 'offer' | 'answer'; sdp: string };
  ice?: { candidate: string; sdpMLineIndex: number; sdpMid: string };
}

interface ErrorMessage {
  type: 'error';
  details: string;
}

type SignalingMessage = WelcomeMessage | ListMessage | SessionStartedMessage | PeerMessage | ErrorMessage;

export function CameraFeed({ className = '' }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isUnmountedRef = useRef(false);
  const isConnectingRef = useRef(false);

  // GStreamer signaling state
  const ourPeerIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const producerPeerIdRef = useRef<string | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidate[]>([]);

  // Retry logic for producer list
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const retryDelayMs = 2000;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const [showRepairButton, setShowRepairButton] = useState(false);

  // Recovery refs
  const recoveryInProgressRef = useRef(false);
  const healthCheckIntervalRef = useRef<number | null>(null);
  const wsConnectTimeoutRef = useRef<number | null>(null);
  const connectRef = useRef<(() => void) | null>(null);

  // Check daemon state - camera only works when daemon is running
  const daemonState = useRobotStore((state) => state.daemonState);
  const isDaemonRunning = daemonState === 'running';
  const wasRunningRef = useRef(isDaemonRunning);

  // WebRTC signaling server URL (wireless version only)
  // Note: Uses ws:// (not wss://) - the GStreamer webrtcsink doesn't use TLS
  const signalingUrl = `ws://${ROBOT_CONFIG.host}:8443`;

  // Send message to signaling server
  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const json = JSON.stringify(message);
      console.log('[Camera] Sending:', json);
      wsRef.current.send(json);
    } else {
      console.warn('[Camera] Cannot send - WebSocket not open');
    }
  }, []);

  // Stop health monitoring
  const stopHealthMonitoring = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('[Camera] Cleaning up...');

    // Stop health monitoring
    stopHealthMonitoring();

    // Clear WebSocket connect timeout
    if (wsConnectTimeoutRef.current) {
      clearTimeout(wsConnectTimeoutRef.current);
      wsConnectTimeoutRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video and unregister from camera service
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    cameraService.unregisterVideoElement();

    // Reset signaling state
    ourPeerIdRef.current = null;
    sessionIdRef.current = null;
    producerPeerIdRef.current = null;
    pendingIceCandidatesRef.current = [];
    retryCountRef.current = 0;
  }, [stopHealthMonitoring]);

  // Start health monitoring - detect dead streams
  const startHealthMonitoring = useCallback(() => {
    if (healthCheckIntervalRef.current) return;

    healthCheckIntervalRef.current = window.setInterval(() => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      // Check if connection is still alive
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log('[Camera] Health check detected dead stream, reconnecting...');
        cleanup();

        // Only auto-reconnect if daemon is still running
        if (isDaemonRunning && !isUnmountedRef.current) {
          setTimeout(() => {
            if (!isConnectingRef.current && !isUnmountedRef.current) {
              // Reset state and reconnect
              setIsConnected(false);
              setError(null);
              // connect() will be called, but we need to define it first
              // This will be handled by the effect that watches isDaemonRunning
            }
          }, 1000);
        }
      }
    }, STREAM_HEALTH_CHECK_INTERVAL_MS);
  }, [cleanup, isDaemonRunning]);

  // Attempt automatic recovery by restarting the daemon
  const attemptAutoRecovery = useCallback(async () => {
    if (recoveryInProgressRef.current) return;

    if (!cameraRecoveryService.canAttemptRecovery()) {
      setShowRepairButton(true);
      setError('Camera unavailable. Click "Repair Camera" to retry.');
      return;
    }

    recoveryInProgressRef.current = true;
    setRecoveryStatus(`Attempting recovery (${cameraRecoveryService.getAttemptCount() + 1}/2)...`);
    setError(null);

    console.log('[Camera] Starting auto-recovery...');
    const result = await cameraRecoveryService.attemptRecovery();

    if (result.success) {
      console.log('[Camera] Recovery successful, reconnecting...');
      setRecoveryStatus('Reconnecting...');
      setTimeout(() => {
        recoveryInProgressRef.current = false;
        setRecoveryStatus(null);
        // Use the ref to call connect
        if (connectRef.current && !isUnmountedRef.current) {
          connectRef.current();
        }
      }, 2000);
    } else {
      console.error('[Camera] Recovery failed:', result.message);
      recoveryInProgressRef.current = false;
      setRecoveryStatus(null);
      setError(result.message);

      if (!cameraRecoveryService.canAttemptRecovery()) {
        setShowRepairButton(true);
      }
    }
  }, []);

  // Handle incoming signaling messages
  const handleSignalingMessage = useCallback(async (message: SignalingMessage) => {
    if (isUnmountedRef.current) return;

    console.log('[Camera] Received message type:', message.type);

    switch (message.type) {
      case 'welcome': {
        // Step 1: Save our peer ID
        ourPeerIdRef.current = message.peerId;
        console.log('[Camera] Our peer ID:', message.peerId);
        setStatus('Registering...');

        // Step 2: Register as a listener
        sendMessage({
          type: 'setPeerStatus',
          roles: ['listener'],
          meta: {},
        });

        // Step 3: Request list of producers
        sendMessage({ type: 'list' });
        break;
      }

      case 'list': {
        // Step 4: Find the "reachymini" producer
        console.log('[Camera] Available producers:', message.producers);

        const producer = message.producers.find(
          (p) => p.meta?.name === 'reachymini'
        );

        if (!producer) {
          // Retry logic: producer may not be registered yet
          retryCountRef.current++;
          if (retryCountRef.current <= maxRetries) {
            console.log(`[Camera] No producer yet, retry ${retryCountRef.current}/${maxRetries}...`);
            setStatus(`Waiting for camera stream... (${retryCountRef.current}/${maxRetries})`);
            setTimeout(() => {
              if (wsRef.current?.readyState === WebSocket.OPEN && !isUnmountedRef.current) {
                sendMessage({ type: 'list' });
              }
            }, retryDelayMs);
            return;
          }
          // All retries exhausted - attempt auto-recovery
          console.log('[Camera] All retries exhausted, attempting auto-recovery...');
          setIsConnecting(false);
          isConnectingRef.current = false;
          cleanup();
          attemptAutoRecovery();
          return;
        }

        // Found producer - reset retry counter
        retryCountRef.current = 0;
        producerPeerIdRef.current = producer.id;
        console.log('[Camera] Found producer:', producer.id);
        setStatus('Starting session...');

        // Step 5: Request to start a session with the producer
        sendMessage({
          type: 'startSession',
          peerId: producer.id,
        });
        break;
      }

      case 'sessionStarted': {
        // Step 6: Save session ID
        sessionIdRef.current = message.sessionId;
        console.log('[Camera] Session started:', message.sessionId);
        setStatus('Waiting for stream...');

        // Now we wait for the server to send us an SDP offer
        break;
      }

      case 'peer': {
        if (!sessionIdRef.current) {
          console.warn('[Camera] Received peer message but no session');
          return;
        }

        if (message.sdp) {
          // Step 7: Handle SDP offer from server
          if (message.sdp.type === 'offer') {
            console.log('[Camera] Received SDP offer');
            setStatus('Processing offer...');

            if (!peerConnectionRef.current) {
              console.error('[Camera] No peer connection');
              return;
            }

            try {
              // Set remote description (the offer)
              await peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription({
                  type: 'offer',
                  sdp: message.sdp.sdp,
                })
              );
              console.log('[Camera] Remote description set');

              // Create and set local description (our answer)
              const answer = await peerConnectionRef.current.createAnswer();
              await peerConnectionRef.current.setLocalDescription(answer);
              console.log('[Camera] Local description set');

              // Step 8: Send our answer back
              sendMessage({
                type: 'peer',
                sessionId: sessionIdRef.current,
                sdp: {
                  type: 'answer',
                  sdp: answer.sdp!,
                },
              });
              console.log('[Camera] Sent SDP answer');
              setStatus('Connecting...');

              // Flush any pending ICE candidates
              for (const candidate of pendingIceCandidatesRef.current) {
                sendMessage({
                  type: 'peer',
                  sessionId: sessionIdRef.current,
                  ice: {
                    candidate: candidate.candidate,
                    sdpMLineIndex: candidate.sdpMLineIndex!,
                    sdpMid: candidate.sdpMid!,
                  },
                });
              }
              pendingIceCandidatesRef.current = [];
            } catch (err) {
              console.error('[Camera] Error handling offer:', err);
              setError('Failed to process video offer');
            }
          }
        }

        if (message.ice) {
          // Step 9: Handle ICE candidate from server
          console.log('[Camera] Received ICE candidate');
          if (peerConnectionRef.current) {
            try {
              await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate({
                  candidate: message.ice.candidate,
                  sdpMLineIndex: message.ice.sdpMLineIndex,
                  sdpMid: message.ice.sdpMid,
                })
              );
            } catch (err) {
              console.error('[Camera] Error adding ICE candidate:', err);
            }
          }
        }
        break;
      }

      case 'error': {
        console.error('[Camera] Signaling error:', message.details);
        setError(`Signaling error: ${message.details}`);
        break;
      }
    }
  }, [sendMessage, cleanup, attemptAutoRecovery]);

  const connect = useCallback(async () => {
    // Guard against double-connect
    if (isUnmountedRef.current) return;
    if (isConnectingRef.current) return;
    if (peerConnectionRef.current) return;

    console.log('[Camera] Starting connection to:', signalingUrl);
    isConnectingRef.current = true;
    retryCountRef.current = 0;
    setIsConnecting(true);
    setError(null);
    setStatus('Connecting...');

    try {
      // Create peer connection first
      console.log('[Camera] Creating RTCPeerConnection...');
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      // Add transceivers for receiving video/audio
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      // Handle incoming video track
      pc.ontrack = (event) => {
        console.log('[Camera] Received track:', event.track.kind);
        if (isUnmountedRef.current) return;
        if (videoRef.current && event.streams[0]) {
          console.log('[Camera] Setting video source');
          videoRef.current.srcObject = event.streams[0];
          // Register video element with camera service for frame capture
          cameraService.registerVideoElement(videoRef.current);
          setIsConnected(true);
          setIsConnecting(false);
          isConnectingRef.current = false;
          setStatus('');
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('[Camera] Connection state:', pc.connectionState);
        if (isUnmountedRef.current) return;
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setIsConnecting(false);
          isConnectingRef.current = false;
          setStatus('');
          setShowRepairButton(false);
          cameraRecoveryService.resetAttempts();
          startHealthMonitoring();
        } else if (pc.connectionState === 'disconnected') {
          // WebRTC disconnected but may recover
          console.log('[Camera] Connection disconnected, waiting for recovery...');
          setStatus('Reconnecting...');
        } else if (pc.connectionState === 'failed') {
          setIsConnected(false);
          stopHealthMonitoring();

          // If daemon is still running, try to reconnect
          if (isDaemonRunning) {
            console.log('[Camera] Connection failed, attempting reconnect...');
            cleanup();
            setTimeout(() => {
              if (!isConnectingRef.current && !isUnmountedRef.current && connectRef.current) {
                connectRef.current();
              }
            }, 2000);
          } else {
            setError('Connection failed - daemon not running');
            cleanup();
            isConnectingRef.current = false;
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[Camera] ICE connection state:', pc.iceConnectionState);
      };

      pc.onicegatheringstatechange = () => {
        console.log('[Camera] ICE gathering state:', pc.iceGatheringState);
      };

      // Send our ICE candidates to the server
      pc.onicecandidate = (event) => {
        if (isUnmountedRef.current) return;
        if (event.candidate) {
          console.log('[Camera] Local ICE candidate');
          if (sessionIdRef.current) {
            // Session exists, send immediately
            sendMessage({
              type: 'peer',
              sessionId: sessionIdRef.current,
              ice: {
                candidate: event.candidate.candidate,
                sdpMLineIndex: event.candidate.sdpMLineIndex!,
                sdpMid: event.candidate.sdpMid!,
              },
            });
          } else {
            // Queue for later
            pendingIceCandidatesRef.current.push(event.candidate);
          }
        } else {
          console.log('[Camera] ICE gathering complete');
        }
      };

      // Connect to signaling server with timeout
      console.log('[Camera] Connecting to WebSocket signaling server...');
      const ws = new WebSocket(signalingUrl);
      wsRef.current = ws;

      // Set connection timeout
      wsConnectTimeoutRef.current = window.setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
          console.error('[Camera] WebSocket connection timeout');
          ws.close();
          setError('Connection timeout - camera signaling server not responding');
          setIsConnecting(false);
          isConnectingRef.current = false;
        }
      }, WS_CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        // Clear the timeout
        if (wsConnectTimeoutRef.current) {
          clearTimeout(wsConnectTimeoutRef.current);
          wsConnectTimeoutRef.current = null;
        }

        console.log('[Camera] WebSocket connected!');
        if (isUnmountedRef.current) {
          ws.close();
          return;
        }
        setStatus('Connected to signaling server');
        // Wait for welcome message from server
      };

      ws.onmessage = async (event) => {
        if (isUnmountedRef.current) return;
        try {
          const message = JSON.parse(event.data) as SignalingMessage;
          await handleSignalingMessage(message);
        } catch (err) {
          console.error('[Camera] Error processing message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[Camera] WebSocket error:', event);
        if (isUnmountedRef.current) return;
        setError('WebSocket connection failed - check if streaming is enabled');
        setIsConnecting(false);
        isConnectingRef.current = false;
        cleanup();
      };

      ws.onclose = (event) => {
        console.log('[Camera] WebSocket closed. Code:', event.code, 'Reason:', event.reason);
        if (isUnmountedRef.current) return;
        // Only show error if we weren't connected
        if (!peerConnectionRef.current ||
            peerConnectionRef.current.connectionState !== 'connected') {
          if (!error) {
            setError(`WebSocket closed (code: ${event.code})`);
          }
          isConnectingRef.current = false;
          setIsConnecting(false);
        }
      };
    } catch (err) {
      console.error('[Camera] Connection error:', err);
      if (!isUnmountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to connect to camera');
        setIsConnecting(false);
        isConnectingRef.current = false;
        cleanup();
      }
    }
  }, [signalingUrl, cleanup, handleSignalingMessage, sendMessage, error, startHealthMonitoring, stopHealthMonitoring, isDaemonRunning]);

  // Store connect in ref for use by attemptAutoRecovery
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    // Send end session if we have one
    if (sessionIdRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage({
        type: 'endSession',
        sessionId: sessionIdRef.current,
      });
    }
    cleanup();
    setIsConnected(false);
    setIsConnecting(false);
    isConnectingRef.current = false;
    setStatus('');
  }, [cleanup, sendMessage]);

  // Cleanup on unmount only - empty dependency array
  // Note: cleanup is stable (empty deps) so we don't need it in the array
  // Using empty array prevents re-runs on state changes
  useEffect(() => {
    isUnmountedRef.current = false;

    return () => {
      isUnmountedRef.current = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-connect on mount if daemon is already running
  useEffect(() => {
    if (isDaemonRunning && !isConnected && !isConnectingRef.current) {
      // Small delay to let component fully mount
      const timer = setTimeout(() => {
        if (!isConnected && !isConnectingRef.current && !isUnmountedRef.current) {
          connect();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Auto-connect when daemon starts, disconnect when it stops
  useEffect(() => {
    if (isDaemonRunning && !wasRunningRef.current) {
      // Daemon just started - auto-connect camera after a short delay
      // (give the WebRTC pipeline time to initialize)
      const timer = setTimeout(() => {
        if (!isConnected && !isConnectingRef.current) {
          connect();
        }
      }, 2000);
      return () => clearTimeout(timer);
    } else if (!isDaemonRunning && wasRunningRef.current) {
      // Daemon just stopped - disconnect camera
      disconnect();
    }
    wasRunningRef.current = isDaemonRunning;
  }, [isDaemonRunning, isConnected, connect, disconnect]);

  return (
    <div className={`relative ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover rounded-lg bg-gray-900 ${
          isConnected ? '' : 'hidden'
        }`}
      />

      {/* Placeholder when not connected */}
      {!isConnected && (
        <div className="w-full aspect-video bg-gray-800 rounded-lg flex flex-col items-center justify-center gap-3">
          <svg
            className="w-12 h-12 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>

          {!isDaemonRunning ? (
            // Daemon not running - show clear message
            <>
              <span className="text-sm text-gray-400 text-center px-4">
                Start the robot daemon to enable camera
              </span>
              <span className="text-xs text-gray-500">
                Daemon status: {daemonState || 'unknown'}
              </span>
            </>
          ) : recoveryStatus ? (
            // Recovery in progress
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500" />
                <span className="text-sm text-yellow-400">{recoveryStatus}</span>
              </div>
              <span className="text-xs text-gray-500">Auto-restarting daemon...</span>
            </div>
          ) : error ? (
            <span className="text-sm text-red-400 text-center px-4">{error}</span>
          ) : isConnecting ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-reachy-500" />
                <span className="text-sm text-gray-400">Connecting...</span>
              </div>
              {status && <span className="text-xs text-gray-500">{status}</span>}
            </div>
          ) : (
            <span className="text-sm text-gray-400">Camera not connected</span>
          )}

          {/* Repair Camera button - shown when auto-recovery failed */}
          {showRepairButton && (
            <button
              onClick={() => {
                cameraRecoveryService.resetAttempts();
                setShowRepairButton(false);
                setError(null);
                attemptAutoRecovery();
              }}
              className="px-4 py-2 text-sm font-medium bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-colors"
            >
              Repair Camera
            </button>
          )}

          {/* Connect button - hidden during recovery */}
          {!showRepairButton && !recoveryStatus && (
            <button
              onClick={connect}
              disabled={isConnecting || !isDaemonRunning}
              className="px-4 py-2 text-sm font-medium bg-reachy-500 text-white rounded-lg hover:bg-reachy-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors shadow-glow-sm"
            >
              {isConnecting ? 'Connecting...' : 'Connect Camera'}
            </button>
          )}

          <p className="text-xs text-gray-500 text-center px-4">
            {isDaemonRunning
              ? 'Camera will auto-connect when stream is ready'
              : 'WebRTC camera requires daemon to be running'}
          </p>
        </div>
      )}

      {/* Connection indicator when connected */}
      {isConnected && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-black/50 rounded-full">
          <div className="w-2 h-2 rounded-full bg-reachy-500 animate-pulse shadow-glow-sm" />
          <span className="text-xs text-white">Live</span>
        </div>
      )}

      {/* Disconnect button when connected */}
      {isConnected && (
        <button
          onClick={disconnect}
          className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-black/50 text-white rounded hover:bg-black/70 transition-colors"
        >
          Disconnect
        </button>
      )}
    </div>
  );
}
