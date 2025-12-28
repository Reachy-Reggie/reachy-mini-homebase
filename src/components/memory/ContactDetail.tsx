// Contact Detail Component
// Shows contact info and unified conversation timeline across all channels

import { useState, useEffect } from 'react';
import { memoryApi } from '../../services/memoryApi';
import { ConversationTimeline } from './ConversationTimeline';
import type { Contact, ContactWithStats, CommunicationChannel } from '../../types/memory';

interface ContactDetailProps {
  contactId: string;
  onBack: () => void;
}

export function ContactDetail({ contactId, onBack }: ContactDetailProps) {
  const [data, setData] = useState<ContactWithStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedContact, setEditedContact] = useState<Partial<Contact>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [channelFilter, setChannelFilter] = useState<CommunicationChannel | 'all'>('all');

  useEffect(() => {
    loadContact();
  }, [contactId]);

  const loadContact = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await memoryApi.getContact(contactId);
      setData(result);
      setEditedContact({
        name: result.contact.name || '',
        nickname: result.contact.nickname || '',
        relationship: result.contact.relationship || '',
        notes: result.contact.notes || '',
      });
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contact');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof Contact, value: string) => {
    setEditedContact((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setError(null);
    try {
      await memoryApi.updateContact(contactId, {
        name: editedContact.name || undefined,
        nickname: editedContact.nickname || undefined,
        relationship: editedContact.relationship || undefined,
        notes: editedContact.notes || undefined,
      });
      setHasChanges(false);
      loadContact(); // Refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setIsSaving(false);
    }
  };

  const getContactDisplayName = () => {
    if (!data) return 'Contact';
    const c = data.contact;
    return c.name || c.phoneNumber || c.email || c.id;
  };

  const getChannelIcon = (channel: CommunicationChannel) => {
    switch (channel) {
      case 'sms': return '&#128172;'; // 💬
      case 'voice': return '&#128222;'; // 📞
      case 'chat': return '&#128187;'; // 💻
      case 'email': return '&#9993;'; // ✉
      default: return '&#128172;';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin text-2xl">&#9881;</div>
        <span className="ml-3 text-gray-400">Loading contact...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <span>&larr;</span> Back
        </button>
        <div className="px-4 py-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          {error || 'Contact not found'}
        </div>
      </div>
    );
  }

  const { contact, stats } = data;
  const filteredConversations = channelFilter === 'all'
    ? data.conversations
    : data.conversations.filter((c) => c.channel === channelFilter);

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-xl font-semibold text-white">{getContactDisplayName()}</h3>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-lg">
        {/* Left: Identifiers */}
        <div className="space-y-2">
          {contact.phoneNumber && (
            <p className="text-gray-400">
              <span className="text-gray-500">Phone:</span> {contact.phoneNumber}
            </p>
          )}
          {contact.email && (
            <p className="text-gray-400">
              <span className="text-gray-500">Email:</span> {contact.email}
            </p>
          )}
          <p className="text-gray-400">
            <span className="text-gray-500">First contact:</span> {new Date(stats.firstContact).toLocaleDateString()}
          </p>
          <p className="text-gray-400">
            <span className="text-gray-500">Last contact:</span> {new Date(stats.lastContact).toLocaleDateString()}
          </p>
        </div>

        {/* Right: Channel Stats */}
        <div className="space-y-2">
          <p className="text-gray-400">
            <span className="text-gray-500">Total messages:</span> {stats.totalMessages}
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.channelBreakdown).map(([channel, count]) => (
              count > 0 && (
                <span
                  key={channel}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-sm text-gray-300"
                >
                  <span dangerouslySetInnerHTML={{ __html: getChannelIcon(channel as CommunicationChannel) }} />
                  {count}
                </span>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Editable Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300">Name</label>
          <input
            type="text"
            value={editedContact.name || ''}
            onChange={(e) => updateField('name', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-reachy-500"
            placeholder="Contact name"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300">Nickname</label>
          <input
            type="text"
            value={editedContact.nickname || ''}
            onChange={(e) => updateField('nickname', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-reachy-500"
            placeholder="Preferred name"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300">Relationship</label>
          <input
            type="text"
            value={editedContact.relationship || ''}
            onChange={(e) => updateField('relationship', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-reachy-500"
            placeholder="e.g., friend, family, colleague"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium text-gray-300">Notes</label>
          <textarea
            value={editedContact.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-reachy-500 resize-none"
            placeholder="Notes about this person..."
          />
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-reachy-500 hover:bg-reachy-400 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Conversation Timeline */}
      <div className="space-y-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-white">Conversation History</h4>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as CommunicationChannel | 'all')}
            className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-reachy-500"
          >
            <option value="all">All Channels</option>
            <option value="sms">SMS</option>
            <option value="voice">Voice</option>
            <option value="chat">Chat</option>
            <option value="email">Email</option>
          </select>
        </div>

        <ConversationTimeline conversations={filteredConversations} />
      </div>
    </div>
  );
}
