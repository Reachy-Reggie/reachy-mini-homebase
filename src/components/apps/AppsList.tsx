// Apps List Component
// Displays and manages all apps

import { useState, useEffect, useCallback } from 'react';
import { appsApi } from '../../services/appsApi';
import { AppCard } from './AppCard';
import type { AppInfo, AppStatus } from '../../types/apps';

type FilterTab = 'all' | 'installed' | 'available';

export function AppsList() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [currentApp, setCurrentApp] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('installed');

  // Fetch apps and current status
  const fetchData = useCallback(async () => {
    try {
      const [allApps, status] = await Promise.all([
        appsApi.listAll(),
        appsApi.getCurrentStatus(),
      ]);
      setApps(allApps);
      setCurrentApp(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load apps');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll for current app status
    const interval = setInterval(async () => {
      try {
        const status = await appsApi.getCurrentStatus();
        setCurrentApp(status);
      } catch {
        // Ignore polling errors
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStart = async (appName: string) => {
    setActionLoading(appName);
    try {
      const status = await appsApi.start(appName);
      setCurrentApp(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start app');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async () => {
    if (!currentApp) return;
    setActionLoading(currentApp.info.name);
    try {
      await appsApi.stop();
      setCurrentApp(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop app');
    } finally {
      setActionLoading(null);
    }
  };

  const handleInstall = async (app: AppInfo) => {
    setActionLoading(app.name);
    try {
      const { job_id } = await appsApi.install(app);
      // Poll job status until complete
      let status = await appsApi.getJobStatus(job_id);
      while (status.status === 'pending' || status.status === 'in_progress') {
        await new Promise((r) => setTimeout(r, 1000));
        status = await appsApi.getJobStatus(job_id);
      }
      if (status.status === 'failed') {
        throw new Error('Installation failed');
      }
      await fetchData(); // Refresh app list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install app');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (appName: string) => {
    if (!confirm(`Are you sure you want to remove "${appName}"?`)) return;
    setActionLoading(appName);
    try {
      const { job_id } = await appsApi.remove(appName);
      // Poll job status until complete
      let status = await appsApi.getJobStatus(job_id);
      while (status.status === 'pending' || status.status === 'in_progress') {
        await new Promise((r) => setTimeout(r, 1000));
        status = await appsApi.getJobStatus(job_id);
      }
      await fetchData(); // Refresh app list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove app');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter apps based on active tab
  const filteredApps = apps.filter((app) => {
    switch (activeFilter) {
      case 'installed':
        return app.source_kind === 'installed';
      case 'available':
        return app.source_kind !== 'installed';
      default:
        return true;
    }
  });

  const installedCount = apps.filter((a) => a.source_kind === 'installed').length;
  const availableCount = apps.filter((a) => a.source_kind !== 'installed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-reachy-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current App Banner */}
      {currentApp && (
        <div className="p-4 bg-reachy-500/10 border border-reachy-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-reachy-500 animate-pulse shadow-glow-sm" />
              <div>
                <span className="font-medium text-reachy-400">Running:</span>
                <span className="ml-2 text-reachy-300">{currentApp.info.name}</span>
                <span className="ml-2 text-sm text-reachy-400/70 capitalize">
                  ({currentApp.state})
                </span>
              </div>
            </div>
            <button
              onClick={handleStop}
              disabled={actionLoading !== null}
              className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-400 disabled:opacity-50 transition-colors"
            >
              Stop App
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-400 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveFilter('installed')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeFilter === 'installed'
              ? 'text-reachy-400 border-reachy-500'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          Installed ({installedCount})
        </button>
        <button
          onClick={() => setActiveFilter('available')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeFilter === 'available'
              ? 'text-reachy-400 border-reachy-500'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          Available ({availableCount})
        </button>
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeFilter === 'all'
              ? 'text-reachy-400 border-reachy-500'
              : 'text-gray-500 border-transparent hover:text-gray-300'
          }`}
        >
          All ({apps.length})
        </button>
        <button
          onClick={fetchData}
          className="ml-auto px-3 py-1 text-sm text-gray-500 hover:text-gray-300"
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      {/* Apps Grid */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {activeFilter === 'installed'
            ? 'No apps installed yet'
            : activeFilter === 'available'
            ? 'No additional apps available'
            : 'No apps found'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredApps.map((app) => (
            <AppCard
              key={`${app.source_kind}-${app.name}`}
              app={app}
              isRunning={currentApp?.info.name === app.name}
              runningState={currentApp?.info.name === app.name ? currentApp.state : undefined}
              onStart={() => handleStart(app.name)}
              onStop={handleStop}
              onInstall={() => handleInstall(app)}
              onRemove={() => handleRemove(app.name)}
              isLoading={actionLoading === app.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
