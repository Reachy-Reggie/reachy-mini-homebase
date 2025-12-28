// Daemon Toggle Component

import { useState } from 'react';
import { useRobotStore } from '../../stores/robotStore';
import { daemonApi } from '../../services/daemonApi';

export function DaemonToggle() {
  const daemonState = useRobotStore((state) => state.daemonState);
  const setDaemonState = useRobotStore((state) => state.setDaemonState);
  const [isLoading, setIsLoading] = useState(false);

  const isRunning = daemonState === 'running';
  const isTransitioning =
    daemonState === 'starting' || daemonState === 'stopping' || isLoading;

  const handleToggle = async () => {
    if (isTransitioning) return;

    setIsLoading(true);
    try {
      if (isRunning) {
        setDaemonState('stopping');
        await daemonApi.stop(false);
        setDaemonState('stopped');
      } else {
        setDaemonState('starting');
        await daemonApi.start(true);
        // Wait a bit for daemon to actually start
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const status = await daemonApi.getStatus();
        setDaemonState(status.state);
      }
    } catch (error) {
      console.error('Failed to toggle daemon:', error);
      // Refresh status
      try {
        const status = await daemonApi.getStatus();
        setDaemonState(status.state);
      } catch {
        setDaemonState('error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isTransitioning}
      className={`
        relative inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium
        transition-all duration-200 border
        ${
          isRunning
            ? 'bg-reachy-500/20 text-reachy-400 border-reachy-500/50 hover:bg-reachy-500/30'
            : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
        }
        ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {/* Status indicator */}
      <div
        className={`w-3 h-3 rounded-full ${
          isRunning ? 'bg-reachy-500 shadow-glow-sm' : 'bg-gray-500'
        }`}
      >
        {isRunning && !isTransitioning && (
          <div className="w-3 h-3 rounded-full bg-reachy-500 animate-ping opacity-75" />
        )}
      </div>

      {/* Label */}
      <span>
        {isLoading
          ? isRunning
            ? 'Stopping...'
            : 'Starting...'
          : daemonState === 'starting'
          ? 'Starting...'
          : daemonState === 'stopping'
          ? 'Stopping...'
          : isRunning
          ? 'Running'
          : 'Start Robot'}
      </span>
    </button>
  );
}
