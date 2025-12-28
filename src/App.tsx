// Reggie Homebase - Main App Component

import { useEffect } from 'react';
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

// Services and stores
import { daemonApi } from './services/daemonApi';
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

  return (
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
