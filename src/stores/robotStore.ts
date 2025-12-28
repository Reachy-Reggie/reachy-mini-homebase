// Zustand Store for Robot State

import { create } from 'zustand';
import type {
  FullState,
  XYZRPYPose,
  DaemonState,
  ControlMode,
} from '../types/robot';

interface RobotStore {
  // Connection status
  isConnected: boolean;
  daemonState: DaemonState | null;
  error: string | null;

  // Current robot state
  controlMode: ControlMode | null;
  headPose: XYZRPYPose | null;
  headJoints: number[] | null;
  bodyYaw: number | null;
  antennasPosition: [number, number] | null;
  timestamp: string | null;

  // Target state (what we're commanding)
  targetHeadPose: XYZRPYPose | null;
  targetAntennas: [number, number] | null;
  targetBodyYaw: number | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setDaemonState: (state: DaemonState) => void;
  setError: (error: string | null) => void;
  updateState: (state: FullState) => void;
  setTargetHeadPose: (pose: Partial<XYZRPYPose>) => void;
  setTargetAntennas: (antennas: [number, number]) => void;
  setTargetBodyYaw: (yaw: number) => void;
  clearTargets: () => void;
}

export const useRobotStore = create<RobotStore>((set, get) => ({
  // Initial state
  isConnected: false,
  daemonState: null,
  error: null,

  controlMode: null,
  headPose: null,
  headJoints: null,
  bodyYaw: null,
  antennasPosition: null,
  timestamp: null,

  targetHeadPose: null,
  targetAntennas: null,
  targetBodyYaw: null,

  // Actions
  setConnected: (connected) => set({ isConnected: connected }),

  setDaemonState: (state) => set({ daemonState: state }),

  setError: (error) => set({ error }),

  updateState: (state) => {
    set({
      controlMode: state.control_mode,
      headPose: state.head_pose,
      headJoints: state.head_joints,
      bodyYaw: state.body_yaw,
      antennasPosition: state.antennas_position,
      timestamp: state.timestamp,
    });
  },

  setTargetHeadPose: (pose) => {
    const current = get().targetHeadPose || {
      x: 0,
      y: 0,
      z: 0,
      roll: 0,
      pitch: 0,
      yaw: 0,
    };
    set({ targetHeadPose: { ...current, ...pose } });
  },

  setTargetAntennas: (antennas) => set({ targetAntennas: antennas }),

  setTargetBodyYaw: (yaw) => set({ targetBodyYaw: yaw }),

  clearTargets: () =>
    set({
      targetHeadPose: null,
      targetAntennas: null,
      targetBodyYaw: null,
    }),
}));

// Selector hooks for common patterns
export const useIsConnected = () => useRobotStore((state) => state.isConnected);
export const useHeadPose = () => useRobotStore((state) => state.headPose);
export const useAntennas = () => useRobotStore((state) => state.antennasPosition);
export const useBodyYaw = () => useRobotStore((state) => state.bodyYaw);
export const useControlMode = () => useRobotStore((state) => state.controlMode);
