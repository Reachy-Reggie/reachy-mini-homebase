// Combined Motion Control Panel
// Provides full motion control in a single panel

import { useState } from 'react';
import { HeadPoseSliders } from './HeadPoseSliders';
import { AntennaControls } from './AntennaControls';
import { BodyYawControl } from './BodyYawControl';
import { MotorModeSelector } from './MotorModeSelector';
import { PresetButtons } from './PresetButtons';
import { VirtualJoystick } from './VirtualJoystick';
import { MovePlayer } from './MovePlayer';
import { useMotionControl } from '../../hooks/useMotionControl';

type TabId = 'head' | 'joystick' | 'body' | 'moves';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'head', label: 'Sliders' },
  { id: 'joystick', label: 'Joystick' },
  { id: 'body', label: 'Body' },
  { id: 'moves', label: 'Moves' },
];

interface MotionControlPanelProps {
  showTabs?: boolean;
  defaultTab?: TabId;
  compact?: boolean;
}

export function MotionControlPanel({
  showTabs = true,
  defaultTab = 'head',
  compact = false,
}: MotionControlPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const { isConnected, isConnecting, error } = useMotionControl();

  const renderContent = () => {
    switch (activeTab) {
      case 'head':
        return (
          <div className="space-y-6">
            <HeadPoseSliders compact={compact} />
            <AntennaControls compact={compact} />
          </div>
        );
      case 'joystick':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <VirtualJoystick mode="yaw-pitch" />
              <VirtualJoystick mode="roll-z" />
            </div>
            <PresetButtons compact />
          </div>
        );
      case 'body':
        return (
          <div className="space-y-6">
            <BodyYawControl compact={compact} />
            <MotorModeSelector compact={compact} />
          </div>
        );
      case 'moves':
        return <MovePlayer compact={compact} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected
                ? 'bg-reachy-500 shadow-glow-sm'
                : isConnecting
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-400">
            {isConnected
              ? 'Motion Control Active'
              : isConnecting
              ? 'Connecting...'
              : 'Disconnected'}
          </span>
        </div>
        {!compact && <MotorModeSelector compact />}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/30 border border-red-500/30 rounded-lg p-2">{error}</div>
      )}

      {/* Tabs */}
      {showTabs && (
        <div className="flex border-b border-gray-700">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'text-reachy-400 border-reachy-500'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className="py-2">{renderContent()}</div>
    </div>
  );
}
