// Chat Message Component - Displays a single message with tool use
import { type Message } from '../../services/claude';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
          isUser
            ? 'bg-reachy-500'
            : 'bg-gradient-to-br from-blue-500 to-purple-600'
        }`}
      >
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Tool Uses (before text response) */}
        {message.toolUse && message.toolUse.length > 0 && (
          <div className="w-full space-y-2">
            {message.toolUse.map((tool) => (
              <div
                key={tool.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">
                    {tool.status === 'running' && '⏳'}
                    {tool.status === 'success' && '✅'}
                    {tool.status === 'error' && '❌'}
                    {tool.status === 'pending' && '⏳'}
                  </span>
                  <span className="font-mono text-blue-400">{tool.name}</span>
                </div>

                {/* Tool Input */}
                {Object.keys(tool.input).length > 0 && (
                  <div className="text-gray-400 text-xs font-mono mb-2">
                    {JSON.stringify(tool.input, null, 2)}
                  </div>
                )}

                {/* Tool Result */}
                {tool.result && (
                  <div
                    className={`text-xs ${
                      tool.status === 'error' ? 'text-red-400' : 'text-reachy-400'
                    }`}
                  >
                    {tool.result}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Text Content */}
        {message.content && (
          <div
            className={`px-4 py-3 rounded-2xl ${
              isUser
                ? 'bg-reachy-600 text-white'
                : 'bg-gray-800 text-gray-100'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-gray-500">
          {message.timestamp.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
