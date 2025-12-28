// Camera Page - Dedicated view for Reggie's camera feed

import { CameraFeed } from '../components/camera/CameraFeed';

export function Camera() {
  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Camera</h1>
        <p className="text-gray-400">Watch Reggie's view in real-time</p>
      </div>

      {/* Camera Feed - Full size */}
      <div className="flex-1 card flex flex-col">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>📷</span> Reggie's View
        </h2>
        <div className="flex-1 min-h-0">
          <CameraFeed className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
