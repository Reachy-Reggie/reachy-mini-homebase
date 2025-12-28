// Display Page - Reachy-controllable external display

export function Display() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-7xl mb-6 animate-bounce-soft">🤖</div>
        <h1 className="text-3xl font-bold text-white mb-4">Display Page</h1>
        <p className="text-gray-400 max-w-md mx-auto">
          This page will show content controlled by Reachy Mini.
          <br />
          Faces, status messages, media, and more.
        </p>
        <p className="text-sm text-gray-500 mt-8">Coming in Phase 5</p>
      </div>
    </div>
  );
}
