// Conversation Module - Main chat interface with Reggie
import { useState, useRef, useEffect } from 'react';
import { useConversationStore, useIsApiKeySet } from '../../stores/conversationStore';
import { ChatMessage } from './ChatMessage';

export function ConversationModule() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isApiKeySet = useIsApiKeySet();
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    clearError,
  } = useConversationStore();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [isApiKeySet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  if (!isApiKeySet) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-gray-300 p-8">
        <div className="text-6xl mb-6">🔑</div>
        <h2 className="text-2xl font-semibold text-white mb-3">API Key Required</h2>
        <p className="text-center max-w-md mb-6">
          To chat with Reggie, you need to set up your Anthropic API key.
          Add it to your <code className="px-2 py-1 bg-gray-800 rounded text-green-400">.env</code> file
          or configure it in Settings.
        </p>
        <a
          href="/settings"
          className="px-6 py-3 bg-reachy-500 hover:bg-reachy-400 text-white font-medium rounded-xl transition-colors shadow-glow-sm hover:shadow-glow"
        >
          Go to Settings
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-900">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="Reggie"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h2 className="text-lg font-semibold text-white">Chat with Reggie</h2>
              <p className="text-sm text-gray-400">Powered by Claude</p>
            </div>
          </div>
          <button
            onClick={clearMessages}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            Clear Chat
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 mt-4 px-4 py-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center justify-between">
            <span className="text-red-200">{error}</span>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="text-7xl mb-4 animate-wiggle">👋</div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                Hello! I'm Reggie!
              </h3>
              <p className="text-center max-w-md text-gray-400">
                I'm your friendly Reachy Mini robot. Ask me to move, dance, express
                emotions, or just chat! Try saying:
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-reachy-400">"Wake up and do a happy dance!"</p>
                <p className="text-reachy-400">"What do you see?"</p>
                <p className="text-reachy-400">"Look to the left"</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message to Reggie..."
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-reachy-500 hover:bg-reachy-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-xl transition-all shadow-glow-sm hover:shadow-glow flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span className="hidden sm:inline">Thinking...</span>
                </>
              ) : (
                <>
                  Send
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
