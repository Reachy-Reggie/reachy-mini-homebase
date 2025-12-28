// App Card Component
// Displays a single app with actions

import type { AppInfo, AppState } from '../../types/apps';

interface AppCardProps {
  app: AppInfo;
  isRunning?: boolean;
  runningState?: AppState;
  onStart?: () => void;
  onStop?: () => void;
  onInstall?: () => void;
  onRemove?: () => void;
  isLoading?: boolean;
}

export function AppCard({
  app,
  isRunning = false,
  runningState,
  onStart,
  onStop,
  onInstall,
  onRemove,
  isLoading = false,
}: AppCardProps) {
  const isInstalled = app.source_kind === 'installed';
  const canStart = isInstalled && !isRunning && onStart;
  const canStop = isRunning && onStop;
  const canInstall = !isInstalled && onInstall;
  const canRemove = isInstalled && !isRunning && onRemove;

  const getStateColor = (state?: AppState) => {
    switch (state) {
      case 'running':
        return 'bg-reachy-500 shadow-glow-sm';
      case 'starting':
      case 'stopping':
        return 'bg-yellow-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      case 'done':
        return 'bg-gray-500';
      default:
        return 'bg-gray-600';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'hf_space':
        return 'HuggingFace';
      case 'dashboard_selection':
        return 'Featured';
      case 'installed':
        return 'Installed';
      case 'local':
        return 'Local';
      default:
        return source;
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all ${
        isRunning
          ? 'border-reachy-500/50 bg-reachy-500/10'
          : isInstalled
          ? 'border-gray-600 bg-gray-800'
          : 'border-gray-700 bg-gray-800/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{app.name}</h3>
          <span
            className={`inline-block text-xs px-2 py-0.5 rounded-full ${
              isInstalled
                ? 'bg-reachy-500/20 text-reachy-400'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {getSourceLabel(app.source_kind)}
          </span>
        </div>
        {isRunning && (
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${getStateColor(runningState)}`} />
            <span className="text-xs text-gray-400 capitalize">{runningState}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {app.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{app.description}</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canStart && (
          <button
            onClick={onStart}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium bg-reachy-500 text-white rounded-lg hover:bg-reachy-400 disabled:opacity-50 transition-colors shadow-glow-sm"
          >
            Start
          </button>
        )}

        {canStop && (
          <button
            onClick={onStop}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-400 disabled:opacity-50 transition-colors"
          >
            Stop
          </button>
        )}

        {canInstall && (
          <button
            onClick={onInstall}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-400 disabled:opacity-50 transition-colors"
          >
            Install
          </button>
        )}

        {canRemove && (
          <button
            onClick={onRemove}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-medium text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-colors"
          >
            Remove
          </button>
        )}

        {app.url && (
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm text-gray-400 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
          >
            View Source
          </a>
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center rounded-xl">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-reachy-500" />
        </div>
      )}
    </div>
  );
}
