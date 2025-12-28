// Memory API Service
// Client-side service for communicating with the server's memory API
// This is the single source of truth for Reggie's memory and personality

import type {
  ApiPersonality,
  Contact,
  ContactWithStats,
  ContactsQuery,
  ConversationsQuery,
  ApiConversationEntry,
  CommunicationChannel,
  ElevenLabsVoice,
} from '../types/memory';

// Server API base URL - proxied through Vite to avoid browser CORS/security issues
const API_BASE_URL = '/api/memory';

// ============ Personality API ============

export async function getPersonality(): Promise<ApiPersonality> {
  const response = await fetch(`${API_BASE_URL}/personality`);
  if (!response.ok) {
    throw new Error(`Failed to get personality: ${response.statusText}`);
  }
  return response.json();
}

export async function updatePersonality(
  updates: Partial<ApiPersonality>
): Promise<ApiPersonality> {
  const response = await fetch(`${API_BASE_URL}/personality`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error(`Failed to update personality: ${response.statusText}`);
  }
  const data = await response.json();
  return data.personality;
}

export async function resetPersonality(): Promise<ApiPersonality> {
  const response = await fetch(`${API_BASE_URL}/personality/reset`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to reset personality: ${response.statusText}`);
  }
  const data = await response.json();
  return data.personality;
}

// ============ Contacts API ============

export async function getContacts(
  query?: ContactsQuery
): Promise<{ contacts: Contact[]; total: number }> {
  const params = new URLSearchParams();
  if (query?.search) params.set('search', query.search);
  if (query?.limit) params.set('limit', query.limit.toString());
  if (query?.offset) params.set('offset', query.offset.toString());

  const url = `${API_BASE_URL}/contacts${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get contacts: ${response.statusText}`);
  }
  return response.json();
}

export async function getContact(id: string): Promise<ContactWithStats> {
  const response = await fetch(`${API_BASE_URL}/contacts/${encodeURIComponent(id)}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Contact not found');
    }
    throw new Error(`Failed to get contact: ${response.statusText}`);
  }
  return response.json();
}

export async function updateContact(
  id: string,
  updates: Partial<Pick<Contact, 'name' | 'nickname' | 'relationship' | 'notes'>>
): Promise<Contact> {
  const response = await fetch(`${API_BASE_URL}/contacts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error(`Failed to update contact: ${response.statusText}`);
  }
  const data = await response.json();
  return data.contact;
}

// ============ Conversations API ============

export async function getConversations(
  query?: ConversationsQuery
): Promise<{ conversations: ApiConversationEntry[]; total: number }> {
  const params = new URLSearchParams();
  if (query?.contactId) params.set('contactId', query.contactId);
  if (query?.channel) params.set('channel', query.channel);
  if (query?.since) params.set('since', query.since);
  if (query?.limit) params.set('limit', query.limit.toString());

  const url = `${API_BASE_URL}/conversations${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get conversations: ${response.statusText}`);
  }
  return response.json();
}

export async function addConversation(entry: {
  contactId: string;
  channel: CommunicationChannel;
  role: 'user' | 'reggie';
  content: string;
  sentiment?: string;
}): Promise<ApiConversationEntry> {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    throw new Error(`Failed to add conversation: ${response.statusText}`);
  }
  const data = await response.json();
  return data.conversation;
}

// ============ Stats API ============

export async function getStats(): Promise<{ contacts: number; conversations: number }> {
  const response = await fetch(`${API_BASE_URL}/stats`);
  if (!response.ok) {
    throw new Error(`Failed to get stats: ${response.statusText}`);
  }
  return response.json();
}

// ============ Voice API ============

export async function getVoices(): Promise<ElevenLabsVoice[]> {
  const response = await fetch(`${API_BASE_URL}/voices`);
  if (!response.ok) {
    throw new Error(`Failed to get voices: ${response.statusText}`);
  }
  const data = await response.json();
  return data.voices || [];
}

export async function generateTts(text: string, voiceId?: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Failed to generate speech');
  }
  return response.blob();
}

// ============ Robot API ============

export async function robotSpeak(text: string, voiceId?: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch('/robot/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId }),
  });
  return response.json();
}

export async function setRobotVolume(volume: number): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('/robot/set-volume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ volume }),
  });
  return response.json();
}

// ============ Export all as memoryApi object ============

export const memoryApi = {
  // Personality
  getPersonality,
  updatePersonality,
  resetPersonality,
  // Contacts
  getContacts,
  getContact,
  updateContact,
  // Conversations
  getConversations,
  addConversation,
  // Stats
  getStats,
  // Voice
  getVoices,
  generateTts,
  // Robot
  robotSpeak,
  setRobotVolume,
};

export default memoryApi;
