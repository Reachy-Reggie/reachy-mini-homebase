// Reachy Mini Homebase - Main App Component

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout
import { MainLayout } from './components/layout/MainLayout';

// Pages
import { Chat } from './pages/Chat';
import { Camera } from './pages/Camera';
import { Dashboard } from './pages/Dashboard';
import { Applications } from './pages/Applications';
import { Display } from './pages/Display';
import { Telemetry } from './pages/Telemetry';
import { Settings } from './pages/Settings';
import { Memory } from './pages/Memory';

// Components
import { FirstRunSetup } from './components/setup/FirstRunSetup';

// Services and stores
import { daemonApi } from './services/daemonApi';
import { memoryApi } from './services/memoryApi';
import { useRobotStore } from './stores/robotStore';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// App-level daemon status initialization
function useDaemonStatusInit() {
  const setDaemonState = useRobotStore((state) => state.setDaemonState);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await daemonApi.getStatus();
        setDaemonState(status.state);
      } catch (err) {
        console.error('Failed to fetch daemon status:', err);
      }
    };

    // Fetch immediately on mount
    fetchStatus();

    // Poll every 5 seconds
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);
  }, [setDaemonState]);
}

function AppContent() {
  // Initialize daemon status on app load
  useDaemonStatusInit();

  // First-run setup state
  const [showSetup, setShowSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Check if first-run setup is needed (personality name is empty)
  useEffect(() => {
    const checkFirstRun = async () => {
      try {
        const personality = await memoryApi.getPersonality();
        // Show setup if name is empty or undefined
        if (!personality.name || personality.name.trim() === '') {
          setShowSetup(true);
        }
      } catch (err) {
        // If we can't reach the server, don't block the app
        console.error('Could not check personality:', err);
      } finally {
        setCheckingSetup(false);
      }
    };

    checkFirstRun();
  }, []);

  const handleSetupComplete = () => {
    setShowSetup(false);
  };

  // Show loading while checking (brief flash is fine)
  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {showSetup && <FirstRunSetup onComplete={handleSetupComplete} />}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Chat />} />
            <Route path="camera" element={<Camera />} />
            <Route path="control" element={<Dashboard />} />
            <Route path="applications" element={<Applications />} />
            <Route path="display" element={<Display />} />
            <Route path="telemetry" element={<Telemetry />} />
            <Route path="settings" element={<Settings />} />
            <Route path="memory" element={<Memory />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
