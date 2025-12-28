// TypeScript types for Reachy Mini Robot API
// Based on daemon/app/models.py

// ============ Pose Types ============

export interface XYZRPYPose {
  x: number;
  y: number;
  z: number;
  roll: number;
  pitch: number;
  yaw: number;
}

export interface Matrix4x4Pose {
  m: number[]; // 16 elements, flattened 4x4 matrix
}

export type HeadPose = XYZRPYPose | Matrix4x4Pose;

// ============ Robot State ============

export type ControlMode = 'enabled' | 'disabled' | 'gravity_compensation';

export interface FullState {
  control_mode: ControlMode | null;
  head_pose: XYZRPYPose | null;
  head_joints: number[] | null; // 7 joints
  body_yaw: number | null;
  antennas_position: [number, number] | null;
  timestamp: string | null;
  passive_joints?: number[] | null; // 21 joints (Placo only)
  target_head_pose?: XYZRPYPose | null;
  target_head_joints?: number[] | null;
  target_body_yaw?: number | null;
  target_antennas_position?: [number, number] | null;
}

// ============ Daemon Status ============

export type DaemonState =
  | 'not_initialized'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'draining'
  | 'error';

export interface BackendStatus {
  ready: boolean;
  motor_control_mode: string;
  last_alive: string | null;
  control_loop_stats: {
    mean_control_loop_frequency: number;
    max_control_loop_interval: number;
    nb_error: number;
  };
  error: string | null;
}

export interface DaemonStatus {
  robot_name: string;
  state: DaemonState;
  wireless_version: boolean;
  desktop_app_daemon: boolean;
  stream_enabled: boolean;
  simulation_enabled: boolean;
  backend_status: BackendStatus | null;
  error: string | null;
  wlan_ip: string | null;
  version: string;
}

// ============ Motion Commands ============

export type InterpolationMethod = 'linear' | 'minjerk' | 'ease' | 'cartoon';

export interface GotoRequest {
  head_pose?: XYZRPYPose;
  antennas?: [number, number];
  body_yaw?: number;
  duration: number;
  interpolation?: InterpolationMethod;
}

export interface SetTargetRequest {
  target_head_pose?: XYZRPYPose;
  target_antennas?: [number, number];
  target_body_yaw?: number;
  timestamp?: string;
}

export interface MoveUUID {
  uuid: string;
}

// ============ Move Events (WebSocket) ============

export type MoveEventType = 'move_started' | 'move_completed' | 'move_failed' | 'move_cancelled';

export interface MoveEvent {
  type: MoveEventType;
  uuid: string;
  details?: string;
}

// ============ Apps ============

export interface AppInfo {
  name: string;
  source: 'huggingface' | 'local' | 'dashboard_selection';
  installed: boolean;
  running: boolean;
  hf_space_id?: string;
  description?: string;
}

export interface AppStatus {
  name: string;
  state: 'starting' | 'running' | 'done' | 'error' | 'stopping';
  exit_code?: number;
}

// ============ Volume ============

export interface VolumeInfo {
  volume: number; // 0-100
  device?: string;
  platform?: string;
}

// ============ Kinematics ============

export interface KinematicsInfo {
  engine: string;
  collision_checking: boolean;
}
