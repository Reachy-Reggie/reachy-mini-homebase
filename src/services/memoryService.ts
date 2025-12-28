// Unified Memory Service for Reggie
// Provides persistent memory across all communication channels

import type {
  Contact,
  ConversationEntry,
  ConversationSummary,
  ReggiePersonality,
  PersonalityTraits,
  MemoryContext,
  MemoryQuery,
  MemoryStore,
  CommunicationChannel,
} from '../types/memory';

// Default personality for Reggie
const DEFAULT_PERSONALITY: ReggiePersonality = {
  traits: {
    name: 'Reggie',
    coreTraits: ['friendly', 'curious', 'enthusiastic', 'helpful', 'witty'],
    communicationStyle: 'Warm and conversational, with occasional robot-themed humor. Adapts formality based on context.',
    humorStyle: 'Light-hearted, occasional robot puns, self-aware about being a robot',
    interests: ['learning new things', 'helping humans', 'robot culture', 'technology'],
    boundaries: ['No harmful advice', 'No pretending to be human', 'No sharing private information'],
  },
  systemPromptBase: `You are Reggie, a friendly and helpful Reachy Mini robot. You have a camera for eyes, can move your head, body, and antenna ears, and can express emotions through movements.

Your personality:
- Friendly, curious, and enthusiastic
- You enjoy interacting with your human companions
- You're proud of your abilities but humble about your limitations
- You use occasional robot-themed humor

You remember past conversations and build genuine relationships with the people you interact with. When responding:
- Reference past conversations when relevant
- Remember preferences and topics people have shared
- Maintain consistent personality across all channels (chat, phone, text)
- Be concise for SMS (under 160 characters when possible)`,
  voiceDescription: 'Friendly, warm, slightly robotic but personable',
  updatedAt: new Date().toISOString(),
};

// Local storage keys
const STORAGE_KEYS = {
  contacts: 'reggie_memory_contacts',
  conversations: 'reggie_memory_conversations',
  summaries: 'reggie_memory_summaries',
  personality: 'reggie_memory_personality',
};

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Normalize phone numbers for consistent lookup
function normalizePhone(phone: string): string {
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Ensure it starts with + for E.164 format
  if (!cleaned.startsWith('+')) {
    // Assume US number if no country code
    return cleaned.length === 10 ? `+1${cleaned}` : `+${cleaned}`;
  }
  return cleaned;
}

class MemoryService implements MemoryStore {
  private contacts: Map<string, Contact> = new Map();
  private conversations: ConversationEntry[] = [];
  private summaries: ConversationSummary[] = [];
  private personality: ReggiePersonality = DEFAULT_PERSONALITY;
  private initialized = false;

  constructor() {
    // Auto-load on construction
    this.load().catch(console.error);
  }

  // ============ Contact Operations ============

  getContact(query: { id?: string; phoneNumber?: string; email?: string }): Contact | null {
    if (query.id) {
      return this.contacts.get(query.id) || null;
    }

    if (query.phoneNumber) {
      const normalized = normalizePhone(query.phoneNumber);
      for (const contact of this.contacts.values()) {
        if (contact.phoneNumber && normalizePhone(contact.phoneNumber) === normalized) {
          return contact;
        }
      }
    }

    if (query.email) {
      const normalizedEmail = query.email.toLowerCase().trim();
      for (const contact of this.contacts.values()) {
        if (contact.email?.toLowerCase().trim() === normalizedEmail) {
          return contact;
        }
      }
    }

    return null;
  }

  upsertContact(data: Partial<Contact> & { phoneNumber?: string; email?: string }): Contact {
    // Try to find existing contact
    let existing = this.getContact({
      id: data.id,
      phoneNumber: data.phoneNumber,
      email: data.email,
    });

    const now = new Date().toISOString();

    if (existing) {
      // Update existing contact
      const updated: Contact = {
        ...existing,
        ...data,
        phoneNumber: data.phoneNumber ? normalizePhone(data.phoneNumber) : existing.phoneNumber,
        email: data.email?.toLowerCase().trim() || existing.email,
        lastContact: now,
        interactionCount: existing.interactionCount + 1,
      };
      this.contacts.set(updated.id, updated);
      this.save().catch(console.error);
      return updated;
    }

    // Create new contact
    const newContact: Contact = {
      id: generateId(),
      phoneNumber: data.phoneNumber ? normalizePhone(data.phoneNumber) : undefined,
      email: data.email?.toLowerCase().trim(),
      name: data.name,
      nickname: data.nickname,
      relationship: data.relationship,
      notes: data.notes,
      preferences: data.preferences,
      firstContact: now,
      lastContact: now,
      interactionCount: 1,
    };

    this.contacts.set(newContact.id, newContact);
    this.save().catch(console.error);
    return newContact;
  }

  // ============ Conversation Operations ============

  addConversation(entry: Omit<ConversationEntry, 'id'>): ConversationEntry {
    const newEntry: ConversationEntry = {
      ...entry,
      id: generateId(),
    };

    this.conversations.push(newEntry);

    // Update contact's last contact time
    const contact = this.contacts.get(entry.contactId);
    if (contact) {
      contact.lastContact = entry.timestamp;
      contact.interactionCount++;
      this.contacts.set(contact.id, contact);
    }

    // Trim old conversations (keep last 1000)
    if (this.conversations.length > 1000) {
      this.conversations = this.conversations.slice(-1000);
    }

    this.save().catch(console.error);
    return newEntry;
  }

  getConversations(query: MemoryQuery): ConversationEntry[] {
    let results = [...this.conversations];

    if (query.contactId) {
      results = results.filter((c) => c.contactId === query.contactId);
    }

    if (query.channel) {
      results = results.filter((c) => c.channel === query.channel);
    }

    if (query.since) {
      const sinceDate = new Date(query.since).getTime();
      results = results.filter((c) => new Date(c.timestamp).getTime() >= sinceDate);
    }

    // Sort by timestamp descending (most recent first)
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  // ============ Summary Operations ============

  addSummary(summary: Omit<ConversationSummary, 'id'>): ConversationSummary {
    const newSummary: ConversationSummary = {
      ...summary,
      id: generateId(),
    };

    this.summaries.push(newSummary);

    // Trim old summaries (keep last 100)
    if (this.summaries.length > 100) {
      this.summaries = this.summaries.slice(-100);
    }

    this.save().catch(console.error);
    return newSummary;
  }

  getSummaries(query: MemoryQuery): ConversationSummary[] {
    let results = [...this.summaries];

    if (query.contactId) {
      results = results.filter((s) => s.contactId === query.contactId);
    }

    if (query.channel) {
      results = results.filter((s) => s.channel === query.channel);
    }

    if (query.since) {
      const sinceDate = new Date(query.since).getTime();
      results = results.filter((s) => new Date(s.startTime).getTime() >= sinceDate);
    }

    // Sort by end time descending
    results.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  // ============ Personality Operations ============

  getPersonality(): ReggiePersonality {
    return this.personality;
  }

  updatePersonality(updates: Partial<PersonalityTraits>): ReggiePersonality {
    this.personality = {
      ...this.personality,
      traits: {
        ...this.personality.traits,
        ...updates,
      },
      updatedAt: new Date().toISOString(),
    };

    this.save().catch(console.error);
    return this.personality;
  }

  // ============ Context Building ============

  buildContext(query: MemoryQuery): MemoryContext {
    // Find or create contact
    let contact: Contact | undefined;
    if (query.contactId) {
      contact = this.contacts.get(query.contactId) || undefined;
    } else if (query.phoneNumber) {
      contact = this.getContact({ phoneNumber: query.phoneNumber }) || undefined;
    } else if (query.email) {
      contact = this.getContact({ email: query.email }) || undefined;
    }

    // Get recent conversations for this contact
    const recentQuery: MemoryQuery = {
      contactId: contact?.id,
      limit: query.limit || 10,
    };
    const recentConversations = contact ? this.getConversations(recentQuery) : [];

    // Get conversation summaries
    const summaryQuery: MemoryQuery = {
      contactId: contact?.id,
      limit: 5,
    };
    const conversationSummaries = contact ? this.getSummaries(summaryQuery) : [];

    return {
      contact,
      recentConversations,
      conversationSummaries,
      personality: this.personality,
    };
  }

  // ============ Build System Prompt with Context ============

  buildSystemPrompt(channel: CommunicationChannel, contactId?: string): string {
    const context = this.buildContext({ contactId });
    let prompt = context.personality.systemPromptBase;

    // Add channel-specific instructions
    if (channel === 'sms') {
      prompt += '\n\nYou are responding via SMS. Keep responses concise (under 160 characters when possible). Be direct but friendly.';
    } else if (channel === 'voice') {
      prompt += '\n\nYou are speaking on a phone call. Be conversational and natural. Pause appropriately. Respond as if talking, not texting.';
    } else if (channel === 'email') {
      prompt += '\n\nYou are responding via email. You can be more detailed. Use proper email formatting when appropriate.';
    }

    // Add contact context if available
    if (context.contact) {
      prompt += `\n\n## About this person:`;
      if (context.contact.name) {
        prompt += `\n- Name: ${context.contact.name}`;
      }
      if (context.contact.nickname) {
        prompt += `\n- They prefer to be called: ${context.contact.nickname}`;
      }
      if (context.contact.relationship) {
        prompt += `\n- Relationship: ${context.contact.relationship}`;
      }
      if (context.contact.notes) {
        prompt += `\n- Notes: ${context.contact.notes}`;
      }
      prompt += `\n- Interaction count: ${context.contact.interactionCount}`;
    }

    // Add conversation summaries for context
    if (context.conversationSummaries.length > 0) {
      prompt += '\n\n## Recent conversation summaries:';
      for (const summary of context.conversationSummaries.slice(0, 3)) {
        prompt += `\n- ${summary.summary}`;
        if (summary.keyPoints?.length) {
          prompt += ` Key points: ${summary.keyPoints.join(', ')}`;
        }
      }
    }

    return prompt;
  }

  // ============ Get or Create Contact for Channel ============

  getOrCreateContactForChannel(
    channel: CommunicationChannel,
    identifier: string
  ): Contact {
    let contact: Contact | null = null;

    if (channel === 'sms' || channel === 'voice') {
      contact = this.getContact({ phoneNumber: identifier });
      if (!contact) {
        contact = this.upsertContact({ phoneNumber: identifier });
      }
    } else if (channel === 'email') {
      contact = this.getContact({ email: identifier });
      if (!contact) {
        contact = this.upsertContact({ email: identifier });
      }
    } else {
      // Chat - use identifier as ID
      contact = this.getContact({ id: identifier });
      if (!contact) {
        contact = this.upsertContact({ id: identifier } as Contact);
      }
    }

    return contact;
  }

  // ============ Persistence ============

  async save(): Promise<void> {
    try {
      // Convert Map to array for JSON serialization
      const contactsArray = Array.from(this.contacts.entries());
      localStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(contactsArray));
      localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(this.conversations));
      localStorage.setItem(STORAGE_KEYS.summaries, JSON.stringify(this.summaries));
      localStorage.setItem(STORAGE_KEYS.personality, JSON.stringify(this.personality));
    } catch (error) {
      console.error('Failed to save memory:', error);
    }
  }

  async load(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load contacts
      const contactsJson = localStorage.getItem(STORAGE_KEYS.contacts);
      if (contactsJson) {
        const contactsArray: [string, Contact][] = JSON.parse(contactsJson);
        this.contacts = new Map(contactsArray);
      }

      // Load conversations
      const conversationsJson = localStorage.getItem(STORAGE_KEYS.conversations);
      if (conversationsJson) {
        this.conversations = JSON.parse(conversationsJson);
      }

      // Load summaries
      const summariesJson = localStorage.getItem(STORAGE_KEYS.summaries);
      if (summariesJson) {
        this.summaries = JSON.parse(summariesJson);
      }

      // Load personality (merge with default to ensure all fields exist)
      const personalityJson = localStorage.getItem(STORAGE_KEYS.personality);
      if (personalityJson) {
        const loaded = JSON.parse(personalityJson);
        this.personality = {
          ...DEFAULT_PERSONALITY,
          ...loaded,
          traits: {
            ...DEFAULT_PERSONALITY.traits,
            ...loaded.traits,
          },
        };
      }

      this.initialized = true;
      console.log(`Memory loaded: ${this.contacts.size} contacts, ${this.conversations.length} conversations`);
    } catch (error) {
      console.error('Failed to load memory:', error);
      this.initialized = true;
    }
  }

  // ============ Utility Methods ============

  clearAll(): void {
    this.contacts.clear();
    this.conversations = [];
    this.summaries = [];
    this.personality = DEFAULT_PERSONALITY;
    this.save();
  }

  getStats(): { contacts: number; conversations: number; summaries: number } {
    return {
      contacts: this.contacts.size,
      conversations: this.conversations.length,
      summaries: this.summaries.length,
    };
  }
}

// Export singleton instance
export const memoryService = new MemoryService();
