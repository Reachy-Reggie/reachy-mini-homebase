// Dashboard Page - Main Control Center

import { useRobotState } from '../hooks/useRobotState';
import { DaemonToggle } from '../components/robot/DaemonToggle';
import { RobotStatePanel } from '../components/robot/RobotStatePanel';
import { MotionControlPanel } from '../components/motion';

// Note: Daemon status polling is handled at the app level (App.tsx)

export function Dashboard() {
  const { isConnecting, error } = useRobotState();

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Control your Reachy Mini robot</p>
        </div>
        <DaemonToggle />
      </div>

      {/* Connection Error Banner */}
      {error && (
        <div className="alert-error flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <strong className="text-red-200">Connection Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Connecting Banner */}
      {isConnecting && (
        <div className="alert-info flex items-center gap-3">
          <span className="animate-spin text-xl">⏳</span>
          <span>Connecting to Reachy Mini...</span>
        </div>
      )}

      {/* Control Panels - Stacked Layout */}
      <div className="space-y-6">
        {/* Motion Control Panel */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🎮</span> Motion Control
          </h2>
          <MotionControlPanel />
        </div>

        {/* Robot State Panel */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🤖</span> Robot State
          </h2>
          <RobotStatePanel />
        </div>
      </div>
    </div>
  );
}
