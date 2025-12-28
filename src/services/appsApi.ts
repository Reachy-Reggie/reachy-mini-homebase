// Apps Management API Service

import { api } from './api';
import type { AppInfo, AppStatus, JobInfo, SourceKind } from '../types/apps';

export const appsApi = {
  /**
   * List all available apps from all sources
   */
  listAll: async (): Promise<AppInfo[]> => {
    return api.get<AppInfo[]>('/apps/list-available');
  },

  /**
   * List apps from a specific source
   */
  listBySource: async (source: SourceKind): Promise<AppInfo[]> => {
    return api.get<AppInfo[]>(`/apps/list-available/${source}`);
  },

  /**
   * Install an app (returns job_id for tracking progress)
   */
  install: async (app: AppInfo): Promise<{ job_id: string }> => {
    return api.post<{ job_id: string }>('/apps/install', app);
  },

  /**
   * Remove an installed app (returns job_id for tracking progress)
   */
  remove: async (appName: string): Promise<{ job_id: string }> => {
    return api.post<{ job_id: string }>(`/apps/remove/${appName}`);
  },

  /**
   * Start an app
   */
  start: async (appName: string): Promise<AppStatus> => {
    return api.post<AppStatus>(`/apps/start-app/${appName}`);
  },

  /**
   * Stop the currently running app
   */
  stop: async (): Promise<void> => {
    return api.post('/apps/stop-current-app');
  },

  /**
   * Restart the currently running app
   */
  restart: async (): Promise<AppStatus> => {
    return api.post<AppStatus>('/apps/restart-current-app');
  },

  /**
   * Get the status of the currently running app
   */
  getCurrentStatus: async (): Promise<AppStatus | null> => {
    return api.get<AppStatus | null>('/apps/current-app-status');
  },

  /**
   * Get the status of a background job (install/remove)
   */
  getJobStatus: async (jobId: string): Promise<JobInfo> => {
    return api.get<JobInfo>(`/apps/job-status/${jobId}`);
  },
};

// WebSocket endpoint for streaming job logs
export const APPS_WS_ENDPOINTS = {
  jobLogs: (jobId: string) => `/apps/ws/apps-manager/${jobId}`,
};
