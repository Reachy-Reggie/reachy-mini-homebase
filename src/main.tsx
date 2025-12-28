import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Note: StrictMode removed to prevent WebSocket double-connection issues in development
// StrictMode intentionally double-mounts components, which causes "WebSocket closed before established" errors
createRoot(document.getElementById('root')!).render(<App />)
