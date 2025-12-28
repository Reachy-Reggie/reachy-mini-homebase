// Conversation Timeline Component
// Displays conversation history grouped by date with channel indicators

import type { ApiConversationEntry, CommunicationChannel } from '../../types/memory';

interface ConversationTimelineProps {
  conversations: ApiConversationEntry[];
}

export function ConversationTimeline({ conversations }: ConversationTimelineProps) {
  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No conversations found
      </div>
    );
  }

  // Group conversations by date
  const groupedByDate = conversations.reduce((acc, conv) => {
    const date = new Date(conv.timestamp).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(conv);
    return acc;
  }, {} as Record<string, ApiConversationEntry[]>);

  // Sort dates (most recent first) - conversations are already DESC from server
  const sortedDates = Object.keys(groupedByDate);

  const getChannelBadge = (channel: CommunicationChannel) => {
    const badges: Record<CommunicationChannel, { icon: string; color: string; label: string }> = {
      sms: { icon: '&#128172;', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'SMS' },
      voice: { icon: '&#128222;', color: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Voice' },
      chat: { icon: '&#128187;', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', label: 'Chat' },
      email: { icon: '&#9993;', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', label: 'Email' },
    };
    return badges[channel] || badges.chat;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          {/* Date Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px flex-1 bg-gray-700" />
            <span className="text-sm text-gray-500 font-medium">{formatDateHeader(date)}</span>
            <div className="h-px flex-1 bg-gray-700" />
          </div>

          {/* Messages for this date */}
          <div className="space-y-3">
            {groupedByDate[date].map((conv) => {
              const badge = getChannelBadge(conv.channel);
              const isReggie = conv.role === 'reggie';

              return (
                <div
                  key={conv.id}
                  className={`flex ${isReggie ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] ${
                      isReggie
                        ? 'bg-gray-700/50 rounded-tr-xl rounded-br-xl rounded-bl-xl'
                        : 'bg-reachy-500/20 rounded-tl-xl rounded-bl-xl rounded-br-xl'
                    } p-3`}
                  >
                    {/* Header: Channel badge + time */}
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${badge.color}`}
                      >
                        <span dangerouslySetInnerHTML={{ __html: badge.icon }} />
                        {badge.label}
                      </span>
                      <span className="text-xs text-gray-500">{formatTime(conv.timestamp)}</span>
                    </div>

                    {/* Message content */}
                    <p className={`text-sm ${isReggie ? 'text-gray-200' : 'text-white'} whitespace-pre-wrap`}>
                      {conv.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
