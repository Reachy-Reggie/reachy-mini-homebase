// API Key Input Component - Prompts user to enter their Claude API key
import { useState } from 'react';
import { useApiKeysStore } from '../../stores/apiKeysStore';

export function ApiKeyInput() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const setAnthropicKey = useApiKeysStore((state) => state.setAnthropicKey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      setAnthropicKey(apiKey.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 p-8">
      <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔑</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Connect to Claude
          </h2>
          <p className="text-gray-400">
            To chat with Reggie, you'll need to provide your Anthropic API key.
            This is stored locally in your browser.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Anthropic API Key
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!apiKey.trim()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            Connect
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            How to get an API key:
          </h3>
          <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">console.anthropic.com</a></li>
            <li>Sign in or create an account</li>
            <li>Navigate to API Keys</li>
            <li>Create a new key and copy it here</li>
          </ol>
        </div>

        <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
          <p className="text-xs text-yellow-300">
            ⚠️ Your API key is stored only in your browser's local storage and
            is sent directly to Anthropic. It never touches our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
