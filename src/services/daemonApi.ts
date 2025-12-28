// Daemon API Service

import { api } from './api';
import { API_ENDPOINTS } from '../config/api';
import type { DaemonStatus } from '../types/robot';

export const daemonApi = {
  /**
   * Get current daemon status
   */
  getStatus: async (): Promise<DaemonStatus> => {
    return api.get<DaemonStatus>(API_ENDPOINTS.daemonStatus);
  },

  /**
   * Start the daemon
   * @param wakeUp - Whether to run wake up animation
   */
  start: async (wakeUp: boolean = true): Promise<{ job_id: string }> => {
    return api.post(`${API_ENDPOINTS.daemonStart}?wake_up=${wakeUp}`);
  },

  /**
   * Stop the daemon
   * @param gotoSleep - Whether to run sleep animation first
   */
  stop: async (gotoSleep: boolean = false): Promise<void> => {
    return api.post(`${API_ENDPOINTS.daemonStop}?goto_sleep=${gotoSleep}`);
  },

  /**
   * Restart the daemon
   */
  restart: async (): Promise<void> => {
    return api.post(API_ENDPOINTS.daemonRestart);
  },
};
