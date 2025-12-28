// Robot State Panel Component

import { useRobotStore } from '../../stores/robotStore';

export function RobotStatePanel() {
  const { headPose, bodyYaw, antennasPosition, controlMode, isConnected } =
    useRobotStore();

  const formatDegrees = (radians: number | null | undefined) => {
    if (radians === null || radians === undefined) return '—';
    return `${((radians * 180) / Math.PI).toFixed(1)}°`;
  };

  const formatMm = (meters: number | null | undefined) => {
    if (meters === null || meters === undefined) return '—';
    return `${(meters * 1000).toFixed(1)} mm`;
  };

  if (!isConnected) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2 animate-bounce-soft">🔌</div>
        <p>Not connected to robot</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Mode */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400">Control Mode</span>
        <span
          className={`px-3 py-1 rounded-lg text-sm font-medium ${
            controlMode === 'enabled'
              ? 'bg-reachy-500/20 text-reachy-400'
              : controlMode === 'disabled'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}
        >
          {controlMode || 'Unknown'}
        </span>
      </div>

      {/* Head Position */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">Head Position</h4>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="text-gray-500 text-xs">X</div>
            <div className="font-mono text-gray-200">{formatMm(headPose?.x)}</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="text-gray-500 text-xs">Y</div>
            <div className="font-mono text-gray-200">{formatMm(headPose?.y)}</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="text-gray-500 text-xs">Z</div>
            <div className="font-mono text-gray-200">{formatMm(headPose?.z)}</div>
          </div>
        </div>
      </div>

      {/* Head Orientation */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">Head Orientation</h4>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="text-gray-500 text-xs">Roll</div>
            <div className="font-mono text-gray-200">{formatDegrees(headPose?.roll)}</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="text-gray-500 text-xs">Pitch</div>
            <div className="font-mono text-gray-200">{formatDegrees(headPose?.pitch)}</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="text-gray-500 text-xs">Yaw</div>
            <div className="font-mono text-gray-200">{formatDegrees(headPose?.yaw)}</div>
          </div>
        </div>
      </div>

      {/* Body & Antennas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-700/50 rounded-lg p-2 text-center">
          <div className="text-gray-500 text-xs">Body Yaw</div>
          <div className="font-mono text-sm text-gray-200">{formatDegrees(bodyYaw)}</div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-2 text-center">
          <div className="text-gray-500 text-xs">L Antenna</div>
          <div className="font-mono text-sm text-gray-200">
            {formatDegrees(antennasPosition?.[0])}
          </div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-2 text-center">
          <div className="text-gray-500 text-xs">R Antenna</div>
          <div className="font-mono text-sm text-gray-200">
            {formatDegrees(antennasPosition?.[1])}
          </div>
        </div>
      </div>
    </div>
  );
}
