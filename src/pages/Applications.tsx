// Applications Page - Manage and launch robot applications

import { AppsList } from '../components/apps';

export function Applications() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Applications</h1>
          <p className="text-gray-400">Launch and manage robot applications</p>
        </div>

        {/* Apps List */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📦</span> Available Applications
          </h2>
          <AppsList />
        </div>
      </div>
    </div>
  );
}
