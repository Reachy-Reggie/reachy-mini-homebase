// Preset Motion Buttons
// Quick access to common poses and movements

import { useState } from 'react';
import { motionApi, MOVE_DATASETS } from '../../services/motionApi';

interface Preset {
  id: string;
  label: string;
  icon: string;
  action: () => Promise<void>;
  category: 'poses' | 'actions';
}

interface PresetButtonsProps {
  compact?: boolean;
}

export function PresetButtons({ compact = false }: PresetButtonsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presets: Preset[] = [
    // Poses
    {
      id: 'wake_up',
      label: 'Wake Up',
      icon: '👋',
      category: 'poses',
      action: async () => {
        await motionApi.wakeUp();
      },
    },
    {
      id: 'sleep',
      label: 'Sleep',
      icon: '😴',
      category: 'poses',
      action: async () => {
        await motionApi.gotoSleep();
      },
    },
    // Popular dances
    {
      id: 'dance_happy',
      label: 'Happy Dance',
      icon: '💃',
      category: 'actions',
      action: async () => {
        await motionApi.playRecorded(MOVE_DATASETS.dances, 'happy');
      },
    },
    {
      id: 'dance_yes',
      label: 'Yes',
      icon: '✅',
      category: 'actions',
      action: async () => {
        await motionApi.playRecorded(MOVE_DATASETS.emotions, 'yes');
      },
    },
    {
      id: 'dance_no',
      label: 'No',
      icon: '❌',
      category: 'actions',
      action: async () => {
        await motionApi.playRecorded(MOVE_DATASETS.emotions, 'no');
      },
    },
    {
      id: 'dance_confused',
      label: 'Confused',
      icon: '🤔',
      category: 'actions',
      action: async () => {
        await motionApi.playRecorded(MOVE_DATASETS.emotions, 'confused');
      },
    },
  ];

  const handleClick = async (preset: Preset) => {
    setLoadingId(preset.id);
    setError(null);

    try {
      await preset.action();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to execute ${preset.label}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleStop = async () => {
    setLoadingId('stop');
    try {
      await motionApi.stop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop motion');
    } finally {
      setLoadingId(null);
    }
  };

  const poses = presets.filter((p) => p.category === 'poses');
  const actions = presets.filter((p) => p.category === 'actions');

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {presets.slice(0, 4).map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleClick(preset)}
              disabled={loadingId !== null}
              className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors ${
                loadingId === preset.id ? 'opacity-50 cursor-wait' : ''
              }`}
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
          <button
            onClick={handleStop}
            disabled={loadingId !== null}
            className="flex items-center gap-1 px-2 py-1 rounded text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            Stop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Poses Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Poses</h3>
        <div className="flex flex-wrap gap-2">
          {poses.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleClick(preset)}
              disabled={loadingId !== null}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all ${
                loadingId === preset.id ? 'opacity-50 cursor-wait bg-gray-100' : ''
              }`}
            >
              <span className="text-lg">{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions/Emotions Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Expressions</h3>
        <div className="flex flex-wrap gap-2">
          {actions.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleClick(preset)}
              disabled={loadingId !== null}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all ${
                loadingId === preset.id ? 'opacity-50 cursor-wait bg-gray-100' : ''
              }`}
            >
              <span className="text-lg">{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stop Button */}
      <div className="pt-2 border-t border-gray-100">
        <button
          onClick={handleStop}
          disabled={loadingId !== null}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-medium border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="6" y="6" width="12" height="12" rx="1" strokeWidth={2} />
          </svg>
          <span>Stop All Motion</span>
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</div>
      )}
    </div>
  );
}
