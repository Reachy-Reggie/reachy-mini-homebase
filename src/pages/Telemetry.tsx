// Telemetry Page - Debug and monitoring view

import { useRobotStore } from '../stores/robotStore';

export function Telemetry() {
  const {
    isConnected,
    headPose,
    headJoints,
    bodyYaw,
    antennasPosition,
    controlMode,
    timestamp,
  } = useRobotStore();

  const formatNumber = (n: number | null | undefined, decimals = 4) => {
    if (n === null || n === undefined) return '—';
    return n.toFixed(decimals);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Telemetry</h1>
        <p className="text-gray-400">Real-time robot data and debugging</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Connection Status */}
        <div className="card">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <span>📡</span> Connection
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={isConnected ? 'text-reachy-400' : 'text-red-400'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Control Mode</span>
              <span className="text-gray-200">{controlMode || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Update</span>
              <span className="font-mono text-xs text-gray-300">
                {timestamp ? new Date(timestamp).toLocaleTimeString() : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Head Pose */}
        <div className="card">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <span>🎯</span> Head Pose
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">X:</span>
              <span className="ml-2 font-mono text-gray-200">{formatNumber(headPose?.x)}</span>
            </div>
            <div>
              <span className="text-gray-500">Roll:</span>
              <span className="ml-2 font-mono text-gray-200">{formatNumber(headPose?.roll)}</span>
            </div>
            <div>
              <span className="text-gray-500">Y:</span>
              <span className="ml-2 font-mono text-gray-200">{formatNumber(headPose?.y)}</span>
            </div>
            <div>
              <span className="text-gray-500">Pitch:</span>
              <span className="ml-2 font-mono text-gray-200">{formatNumber(headPose?.pitch)}</span>
            </div>
            <div>
              <span className="text-gray-500">Z:</span>
              <span className="ml-2 font-mono text-gray-200">{formatNumber(headPose?.z)}</span>
            </div>
            <div>
              <span className="text-gray-500">Yaw:</span>
              <span className="ml-2 font-mono text-gray-200">{formatNumber(headPose?.yaw)}</span>
            </div>
          </div>
        </div>

        {/* Body & Antennas */}
        <div className="card">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <span>🦾</span> Body & Antennas
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Body Yaw</span>
              <span className="font-mono text-gray-200">{formatNumber(bodyYaw)} rad</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Left Antenna</span>
              <span className="font-mono text-gray-200">
                {formatNumber(antennasPosition?.[0])} rad
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Right Antenna</span>
              <span className="font-mono text-gray-200">
                {formatNumber(antennasPosition?.[1])} rad
              </span>
            </div>
          </div>
        </div>

        {/* Head Joints */}
        <div className="card lg:col-span-2 xl:col-span-3">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <span>⚙️</span> Head Joints (7 DOF)
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {headJoints ? (
              headJoints.map((joint, i) => (
                <div key={i} className="text-center bg-gray-700/50 rounded-lg p-2">
                  <div className="text-xs text-gray-500 mb-1">J{i}</div>
                  <div className="font-mono text-sm text-gray-200">{joint.toFixed(3)}</div>
                </div>
              ))
            ) : (
              <div className="col-span-7 text-gray-500 text-center py-4">
                No joint data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Raw JSON */}
      <div className="card">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <span>📋</span> Raw State Data
        </h3>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-auto max-h-64">
          {JSON.stringify(
            {
              isConnected,
              controlMode,
              headPose,
              headJoints,
              bodyYaw,
              antennasPosition,
              timestamp,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
