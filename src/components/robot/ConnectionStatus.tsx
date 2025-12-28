// Connection Status Indicator Component

import { useRobotStore } from '../../stores/robotStore';

export function ConnectionStatus() {
  const isConnected = useRobotStore((state) => state.isConnected);
  const daemonState = useRobotStore((state) => state.daemonState);

  const getStatusColor = () => {
    if (!isConnected) return 'bg-red-500';
    if (daemonState === 'running') return 'bg-reachy-500 shadow-glow-sm';
    if (daemonState === 'starting' || daemonState === 'stopping' || daemonState === 'draining')
      return 'bg-yellow-500';
    if (daemonState === 'error') return 'bg-red-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (daemonState === 'running') return 'Connected';
    if (daemonState === 'starting') return 'Starting...';
    if (daemonState === 'stopping') return 'Stopping...';
    if (daemonState === 'draining') return 'Draining...';
    if (daemonState === 'stopped') return 'Stopped';
    if (daemonState === 'error') return 'Error';
    return 'Unknown';
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`}>
        {(isConnected && daemonState === 'running') && (
          <div className="w-2.5 h-2.5 rounded-full bg-reachy-500 animate-ping opacity-75" />
        )}
      </div>
      <span className="text-sm text-gray-400">{getStatusText()}</span>
    </div>
  );
}
