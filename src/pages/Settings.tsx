// Settings Page

import { useState } from 'react';
import { ROBOT_CONFIG } from '../config/api';
import { VolumeControl } from '../components/settings/VolumeControl';
import { MotorModeSelector } from '../components/motion';
import { useApiKeysStore } from '../stores/apiKeysStore';

function ApiKeyInput({
  label,
  value,
  onChange,
  placeholder,
  fromEnv,
}: {
  label: string;
  value: string | null;
  onChange: (key: string) => void;
  placeholder: string;
  fromEnv: boolean;
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [showKey, setShowKey] = useState(false);
  const isSet = !!value;

  const handleSave = () => {
    if (inputValue.trim()) {
      onChange(inputValue.trim());
    }
  };

  // If key is from environment variable, show read-only display
  if (fromEnv) {
    const maskedValue = value ? `${value.slice(0, 8)}...${value.slice(-4)}` : '';
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        <div className="flex gap-2 items-center">
          <div className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 font-mono text-sm">
            {showKey ? value : maskedValue}
          </div>
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="px-3 py-2 text-gray-400 hover:text-gray-200"
            title={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? '🙈' : '👁️'}
          </button>
          <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded-md border border-green-700">
            .env
          </span>
        </div>
        <span className="text-xs text-gray-500">
          Set via environment variable (edit .env file to change)
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
          >
            {showKey ? '🙈' : '👁️'}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={!inputValue.trim() || inputValue === value}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
      {isSet ? (
        <span className="text-xs text-green-400">Key saved (localStorage)</span>
      ) : (
        <span className="text-xs text-gray-500">
          Add to .env file for secure storage, or enter here for quick testing
        </span>
      )}
    </div>
  );
}

export function Settings() {
  const {
    anthropicKey,
    openaiKey,
    googleKey,
    anthropicFromEnv,
    openaiFromEnv,
    googleFromEnv,
    setAnthropicKey,
    setOpenaiKey,
    setGoogleKey,
  } = useApiKeysStore();

  const envKeyCount = [anthropicFromEnv, openaiFromEnv, googleFromEnv].filter(Boolean).length;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400">Configure your dashboard and robot connection</p>
        </div>

        {/* API Keys Section */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">API Keys</h3>
            {envKeyCount > 0 && (
              <span className="text-xs text-gray-400">
                {envKeyCount} key{envKeyCount > 1 ? 's' : ''} from .env
              </span>
            )}
          </div>
          <div className="space-y-4">
            <ApiKeyInput
              label="Anthropic (Claude)"
              value={anthropicKey}
              onChange={setAnthropicKey}
              placeholder="sk-ant-..."
              fromEnv={anthropicFromEnv}
            />
            <ApiKeyInput
              label="OpenAI"
              value={openaiKey}
              onChange={setOpenaiKey}
              placeholder="sk-proj-..."
              fromEnv={openaiFromEnv}
            />
            <ApiKeyInput
              label="Google (AI Studio)"
              value={googleKey}
              onChange={setGoogleKey}
              placeholder="AIzaSy..."
              fromEnv={googleFromEnv}
            />
          </div>
          <div className="mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400">
              <strong className="text-gray-300">Security tip:</strong> Store API keys in the{' '}
              <code className="px-1 py-0.5 bg-gray-800 rounded text-green-400">.env</code> file
              (never committed to git) rather than entering them here. Keys entered in the browser
              are stored in localStorage.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Settings */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Connection</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Robot IP Address
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  defaultValue={ROBOT_CONFIG.host}
                  placeholder="192.168.0.11"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Port
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  defaultValue={ROBOT_CONFIG.port}
                  placeholder="8000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  mDNS Hostname
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  defaultValue={ROBOT_CONFIG.mdnsHost}
                  placeholder="reachy-mini.local"
                />
              </div>
              <button className="px-4 py-2 bg-reachy-500 text-white rounded-xl hover:bg-reachy-400 shadow-glow-sm transition-all">
                Save & Reconnect
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Dashboard Version</span>
                <span className="text-white">1.0.0-dev</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Robot API</span>
                <span className="text-white">{`http://${ROBOT_CONFIG.host}:${ROBOT_CONFIG.port}`}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">WebSocket</span>
                <span className="text-white">{`ws://${ROBOT_CONFIG.host}:${ROBOT_CONFIG.port}`}</span>
              </div>
            </div>
          </div>

          {/* Volume Controls */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Audio</h3>
            <VolumeControl />
          </div>

          {/* Motor Settings */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Motor Control Mode</h3>
            <MotorModeSelector />
          </div>
        </div>
      </div>
    </div>
  );
}
