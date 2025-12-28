// Motor Control Mode Selector
// Switch between enabled, disabled, and gravity compensation modes

import { useState } from 'react';
import { useControlMode } from '../../stores/robotStore';
import { api } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import type { ControlMode } from '../../types/robot';

const MODES: { value: ControlMode; label: string; description: string; color: string }[] = [
  {
    value: 'enabled',
    label: 'Enabled',
    description: 'Motors active, responding to commands',
    color: 'bg-green-500',
  },
  {
    value: 'disabled',
    label: 'Disabled',
    description: 'Motors off, robot is limp',
    color: 'bg-gray-500',
  },
  {
    value: 'gravity_compensation',
    label: 'Compliant',
    description: 'Motors compensate for gravity, can be moved by hand',
    color: 'bg-blue-500',
  },
];

interface MotorModeSelectorProps {
  compact?: boolean;
}

export function MotorModeSelector({ compact = false }: MotorModeSelectorProps) {
  const controlMode = useControlMode();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleModeChange = async (mode: ControlMode) => {
    if (mode === controlMode) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.post(API_ENDPOINTS.motorsSetMode(mode));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change motor mode');
    } finally {
      setIsLoading(false);
    }
  };

  const currentModeInfo = MODES.find((m) => m.value === controlMode);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Motors:</span>
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          {MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleModeChange(mode.value)}
              disabled={isLoading}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                controlMode === mode.value
                  ? `${mode.color} text-white`
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={mode.description}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">Motor Control Mode</h3>
        {currentModeInfo && (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${currentModeInfo.color}`}
          >
            {currentModeInfo.label}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => handleModeChange(mode.value)}
            disabled={isLoading}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
              controlMode === mode.value
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className={`w-3 h-3 rounded-full ${mode.color}`} />
            <div className="text-left">
              <div className="font-medium text-gray-900">{mode.label}</div>
              <div className="text-xs text-gray-500">{mode.description}</div>
            </div>
            {controlMode === mode.value && (
              <svg
                className="w-5 h-5 ml-auto text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</div>
      )}

      {!controlMode && (
        <div className="text-sm text-amber-600 bg-amber-50 rounded p-2">
          Motor mode unknown. Robot may not be connected.
        </div>
      )}
    </div>
  );
}
