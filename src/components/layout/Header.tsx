// Header Component

import { NavLink } from 'react-router-dom';
import { ConnectionStatus } from '../robot/ConnectionStatus';

export function Header() {
  const navItems = [
    { to: '/', label: 'Chat', icon: '💬' },
    { to: '/camera', label: 'Camera', icon: '📷' },
    { to: '/control', label: 'Control', icon: '🎮' },
    { to: '/applications', label: 'Apps', icon: '📦' },
    { to: '/memory', label: 'Personality', icon: '🧠' },
    { to: '/telemetry', label: 'Telemetry', icon: '📊' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <header className="bg-gradient-to-r from-gray-800 via-gray-800 to-gray-800/95 border-b border-gray-700/50 sticky top-0 z-50 backdrop-blur-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <img
                src="/favicon.png"
                alt="Reachy Mini"
                className="w-10 h-10 rounded-xl object-cover transition-transform duration-200 group-hover:scale-110"
              />
              <div className="absolute inset-0 rounded-xl bg-reachy-500/0 group-hover:bg-reachy-500/20 transition-colors duration-200" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">
              Reachy Mini Homebase
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'bg-reachy-500/15 text-reachy-400 border-b-2 border-reachy-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50 hover:scale-105'
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Connection Status */}
          <ConnectionStatus />
        </div>
      </div>
    </header>
  );
}
