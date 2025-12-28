// API Configuration for Reachy Mini Dashboard

// Robot connection settings
export const ROBOT_CONFIG = {
  // Default robot address - can be overridden by environment variables
  host: import.meta.env.VITE_ROBOT_HOST || '192.168.0.11',
  port: import.meta.env.VITE_ROBOT_PORT || '8000',

  // Alternative hostname (mDNS)
  mdnsHost: 'reachy-mini.local',
};

// Construct base URLs
export const getApiBaseUrl = (useIp = true): string => {
  const host = useIp ? ROBOT_CONFIG.host : ROBOT_CONFIG.mdnsHost;
  return `http://${host}:${ROBOT_CONFIG.port}/api`;
};

export const getWsBaseUrl = (useIp = true): string => {
  const host = useIp ? ROBOT_CONFIG.host : ROBOT_CONFIG.mdnsHost;
  return `ws://${host}:${ROBOT_CONFIG.port}/api`;
};

// API endpoints
export const API_ENDPOINTS = {
  // Daemon
  daemonStatus: '/daemon/status',
  daemonStart: '/daemon/start',
  daemonStop: '/daemon/stop',
  daemonRestart: '/daemon/restart',

  // State
  statePresent: '/state/full',
  stateHeadPose: '/state/present_head_pose',
  stateBodyYaw: '/state/present_body_yaw',
  stateAntennas: '/state/present_antenna_joint_positions',

  // Motion
  moveGoto: '/move/goto',
  moveSetTarget: '/move/set_target',
  moveWakeUp: '/move/play/wake_up',
  moveGotoSleep: '/move/play/goto_sleep',
  moveStop: '/move/stop',
  moveRunning: '/move/running',
  moveListDataset: (dataset: string) => `/move/recorded-move-datasets/list/${dataset}`,
  movePlayRecorded: (dataset: string, move: string) => `/move/play/recorded-move-dataset/${dataset}/${move}`,

  // Motors
  motorsStatus: '/motors/status',
  motorsSetMode: (mode: string) => `/motors/set_mode/${mode}`,

  // Volume
  volumeCurrent: '/volume/current',
  volumeSet: '/volume/set',
  volumeMicCurrent: '/volume/microphone/current',
  volumeMicSet: '/volume/microphone/set',

  // Apps
  appsList: '/apps/list-available',
  appsInstall: '/apps/install',
  appsRemove: (name: string) => `/apps/remove/${name}`,
  appsStart: (name: string) => `/apps/start-app/${name}`,
  appsStop: '/apps/stop-current-app',
  appsRestart: '/apps/restart-current-app',
  appsCurrentStatus: '/apps/current-app-status',

  // Kinematics
  kinematicsInfo: '/kinematics/info',
  kinematicsUrdf: '/kinematics/urdf',
};

// WebSocket endpoints
export const WS_ENDPOINTS = {
  stateStream: '/state/ws/full',
  moveUpdates: '/move/ws/updates',
  moveSetTarget: '/move/ws/set_target',
};

// Default WebSocket frequencies
export const WS_DEFAULTS = {
  stateFrequency: 30, // Hz
  reconnectDelay: 1000, // ms
  maxReconnectAttempts: 5,
};
