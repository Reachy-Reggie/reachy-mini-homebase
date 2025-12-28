// Motion API Service

import { api } from './api';
import { API_ENDPOINTS } from '../config/api';
import type { GotoRequest, SetTargetRequest, MoveUUID } from '../types/robot';

export const motionApi = {
  /**
   * Move to target pose with interpolation
   */
  goto: async (request: GotoRequest): Promise<MoveUUID> => {
    return api.post<MoveUUID>(API_ENDPOINTS.moveGoto, request);
  },

  /**
   * Set target immediately (no interpolation)
   */
  setTarget: async (request: SetTargetRequest): Promise<void> => {
    return api.post(API_ENDPOINTS.moveSetTarget, request);
  },

  /**
   * Execute wake up animation
   */
  wakeUp: async (): Promise<MoveUUID> => {
    return api.post<MoveUUID>(API_ENDPOINTS.moveWakeUp);
  },

  /**
   * Execute go to sleep animation
   */
  gotoSleep: async (): Promise<MoveUUID> => {
    return api.post<MoveUUID>(API_ENDPOINTS.moveGotoSleep);
  },

  /**
   * Stop a running move
   */
  stop: async (uuid?: string): Promise<void> => {
    return api.post(API_ENDPOINTS.moveStop, uuid ? { uuid } : undefined);
  },

  /**
   * Get list of currently running moves
   */
  getRunning: async (): Promise<string[]> => {
    return api.get<string[]>(API_ENDPOINTS.moveRunning);
  },

  /**
   * List available moves in a dataset
   */
  listMoves: async (dataset: string): Promise<string[]> => {
    return api.get<string[]>(API_ENDPOINTS.moveListDataset(dataset));
  },

  /**
   * Play a recorded move from a dataset
   */
  playRecorded: async (dataset: string, moveName: string): Promise<MoveUUID> => {
    return api.post<MoveUUID>(API_ENDPOINTS.movePlayRecorded(dataset, moveName));
  },
};

// Dataset names for move libraries
export const MOVE_DATASETS = {
  dances: 'pollen-robotics/reachy-mini-dances-library',
  emotions: 'pollen-robotics/reachy-mini-emotions-library',
} as const;
