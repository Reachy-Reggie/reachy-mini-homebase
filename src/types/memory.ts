// TypeScript types for Reggie's Unified Memory System
// Enables consistent personality and context across all channels

// ============ Channel Types ============

export type CommunicationChannel = 'chat' | 'sms' | 'voice' | 'email';

// ============ Contact Types ============

export interface Contact {
  id: string;
  phoneNumber?: string;
  email?: string;
  name?: string;
  nickname?: string;
  relationship?: string; // e.g., "owner", "friend", "colleague"
  notes?: string; // Free-form notes about the person
  preferences?: ContactPreferences;
  firstContact: string; // ISO timestamp
  lastContact: string; // ISO timestamp
  interactionCount: number;
}

export interface ContactPreferences {
  preferredName?: string;
  communicationStyle?: 'formal' | 'casual' | 'friendly';
  topics?: string[]; // Topics they're interested in
  timezone?: string;
}

// ============ Conversation Types ============

export interface ConversationEntry {
  id: string;
  contactId: string;
  channel: CommunicationChannel;
  timestamp: string; // ISO timestamp
  role: 'user' | 'reggie';
  content: string;
  metadata?: ConversationMetadata;
}

export interface ConversationMetadata {
  sentiment?: 'positive' | 'neutral' | 'negative';
  topics?: string[];
  toolsUsed?: string[];
  messageId?: string; // Twilio SID, email ID, etc.
}

export interface ConversationSummary {
  id: string;
  contactId: string;
  channel: CommunicationChannel;
  startTime: string;
  endTime: string;
  summary: string; // AI-generated summary of the conversation
  keyPoints?: string[];
  actionItems?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
}

// ============ Reggie's Personality ============

export interface PersonalityTraits {
  name: string;
  coreTraits: string[]; // e.g., ["friendly", "curious", "helpful"]
  communicationStyle: string;
  humorStyle?: string;
  interests?: string[];
  boundaries?: string[]; // Things Reggie won't do/say
}

export interface ReggiePersonality {
  traits: PersonalityTraits;
  systemPromptBase: string;
  voiceDescription?: string; // For ElevenLabs voice selection
  updatedAt: string;
}

// ============ Memory Context ============

export interface MemoryContext {
  contact?: Contact;
  recentConversations: ConversationEntry[];
  conversationSummaries: ConversationSummary[];
  personality: ReggiePersonality;
}

// ============ Memory Store State ============

export interface MemoryState {
  contacts: Map<string, Contact>;
  conversations: ConversationEntry[];
  summaries: ConversationSummary[];
  personality: ReggiePersonality;
}

// ============ Memory Query Types ============

export interface MemoryQuery {
  contactId?: string;
  phoneNumber?: string;
  email?: string;
  channel?: CommunicationChannel;
  limit?: number;
  since?: string; // ISO timestamp
}

// ============ Memory Store Operations ============

export interface MemoryStore {
  // Contact operations
  getContact(query: { id?: string; phoneNumber?: string; email?: string }): Contact | null;
  upsertContact(contact: Partial<Contact> & { phoneNumber?: string; email?: string }): Contact;

  // Conversation operations
  addConversation(entry: Omit<ConversationEntry, 'id'>): ConversationEntry;
  getConversations(query: MemoryQuery): ConversationEntry[];

  // Summary operations
  addSummary(summary: Omit<ConversationSummary, 'id'>): ConversationSummary;
  getSummaries(query: MemoryQuery): ConversationSummary[];

  // Personality operations
  getPersonality(): ReggiePersonality;
  updatePersonality(updates: Partial<PersonalityTraits>): ReggiePersonality;

  // Context building
  buildContext(query: MemoryQuery): MemoryContext;

  // Persistence
  save(): Promise<void>;
  load(): Promise<void>;
}

// ============ API Types (matches server) ============

// Flat personality structure used by the server API
export interface ApiPersonality {
  name: string;
  coreTraits: string[];
  communicationStyle: string;
  humorStyle?: string;
  interests?: string[];
  boundaries?: string[];
  systemPromptBase: string;
  voiceDescription?: string;
  // ElevenLabs voice settings
  elevenLabsVoiceId?: string;
  elevenLabsVoiceName?: string;
  ttsEnabled?: boolean;
  updatedAt?: string;
}

// ElevenLabs voice type
export interface ElevenLabsVoice {
  voiceId: string;
  name: string;
  category: string;
  description: string;
  labels: Record<string, string>;
  previewUrl: string | null;
}

// Contact with stats from server
export interface ContactWithStats {
  contact: Contact;
  conversations: ConversationEntry[];
  stats: {
    totalMessages: number;
    channelBreakdown: Record<CommunicationChannel, number>;
    firstContact: string;
    lastContact: string;
  };
}

// Conversation entry for API (simpler than local)
export interface ApiConversationEntry {
  id: string;
  contactId: string;
  channel: CommunicationChannel;
  timestamp: string;
  role: 'user' | 'reggie';
  content: string;
  sentiment?: string;
  messageId?: string;
}

// API query options
export interface ContactsQuery {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ConversationsQuery {
  contactId?: string;
  channel?: CommunicationChannel;
  since?: string;
  limit?: number;
}
