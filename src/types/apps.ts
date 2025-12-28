// TypeScript types for Apps Management

export type SourceKind = 'hf_space' | 'dashboard_selection' | 'local' | 'installed';

export interface AppInfo {
  name: string;
  source_kind: SourceKind;
  description?: string;
  url?: string;
  extra?: Record<string, unknown>;
}

export type AppState = 'starting' | 'running' | 'done' | 'stopping' | 'error';

export interface AppStatus {
  info: AppInfo;
  state: AppState;
  error?: string;
}

export type JobStatus = 'pending' | 'in_progress' | 'done' | 'failed';

export interface JobInfo {
  command: string;
  status: JobStatus;
  logs: string[];
}

// Volume types
export interface VolumeInfo {
  volume: number;
  device: string;
  platform: string;
}

export interface VolumeRequest {
  volume: number;
}
