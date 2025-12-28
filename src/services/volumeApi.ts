// Volume Control API Service

import { api } from './api';
import type { VolumeInfo, VolumeRequest } from '../types/apps';

export const volumeApi = {
  /**
   * Get current speaker volume
   */
  getCurrent: async (): Promise<VolumeInfo> => {
    return api.get<VolumeInfo>('/volume/current');
  },

  /**
   * Set speaker volume (0-100)
   */
  set: async (volume: number): Promise<VolumeInfo> => {
    return api.post<VolumeInfo>('/volume/set', { volume } as VolumeRequest);
  },

  /**
   * Play a test sound
   */
  testSound: async (): Promise<{ status: string; message: string }> => {
    return api.post<{ status: string; message: string }>('/volume/test-sound');
  },

  /**
   * Get current microphone volume
   */
  getMicCurrent: async (): Promise<VolumeInfo> => {
    return api.get<VolumeInfo>('/volume/microphone/current');
  },

  /**
   * Set microphone volume (0-100)
   */
  setMic: async (volume: number): Promise<VolumeInfo> => {
    return api.post<VolumeInfo>('/volume/microphone/set', { volume } as VolumeRequest);
  },
};
