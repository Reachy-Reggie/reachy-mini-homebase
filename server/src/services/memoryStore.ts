// Server-side Memory Store using SQLite
// Provides persistent storage for contacts, conversations, and personality

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

// ============ Types ============

export type CommunicationChannel = 'chat' | 'sms' | 'voice' | 'email';

export interface Contact {
  id: string;
  phoneNumber?: string;
  email?: string;
  name?: string;
  nickname?: string;
  relationship?: string;
  notes?: string;
  communicationStyle?: string;
  firstContact: string;
  lastContact: string;
  interactionCount: number;
}

export interface ConversationEntry {
  id: string;
  contactId: string;
  channel: CommunicationChannel;
  timestamp: string;
  role: 'user' | 'reggie';
  content: string;
  sentiment?: string;
  messageId?: string;
}

export interface ReggiePersonality {
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

// ============ Default Personality ============

const DEFAULT_PERSONALITY: ReggiePersonality = {
  name: '', // Empty to trigger first-run setup
  coreTraits: ['friendly', 'curious', 'enthusiastic', 'helpful', 'witty'],
  communicationStyle: 'Warm and conversational, adapts to context.',
  humorStyle: 'Light-hearted, occasional robot puns, self-aware about being a robot',
  interests: ['learning new things', 'helping humans', 'robot culture', 'technology'],
  boundaries: ['No harmful advice', 'No pretending to be human', 'No sharing private information'],
  systemPromptBase: `You are a friendly and helpful Reachy Mini robot assistant.

Your personality:
- Friendly, curious, and enthusiastic
- You enjoy interacting with your human companions
- You're proud of your abilities but humble about your limitations
- You use occasional robot-themed humor
- You remember past conversations and build genuine relationships

When responding:
- Reference past conversations when relevant
- Remember preferences and topics people have shared
- Maintain consistent personality across all channels
- Be concise for SMS (under 160 characters when possible)
- Be natural and conversational for voice calls`,
  voiceDescription: 'Friendly, warm, slightly robotic but personable',
  updatedAt: new Date().toISOString(),
};

// ============ Memory Store Class ============

class MemoryStore {
  private db: Database.Database;
  private personality: ReggiePersonality = DEFAULT_PERSONALITY;

  constructor() {
    // Determine database path
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const dataDir = join(__dirname, '../../data');

    // Ensure data directory exists
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = join(dataDir, 'reggie-memory.db');
    this.db = new Database(dbPath);

    // Initialize tables
    this.initializeTables();

    console.log(`Memory store initialized at: ${dbPath}`);
  }

  private initializeTables(): void {
    // Contacts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        phone_number TEXT UNIQUE,
        email TEXT,
        name TEXT,
        nickname TEXT,
        relationship TEXT,
        notes TEXT,
        communication_style TEXT,
        first_contact TEXT NOT NULL,
        last_contact TEXT NOT NULL,
        interaction_count INTEGER DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number);
      CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
    `);

    // Conversations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        sentiment TEXT,
        message_id TEXT,
        FOREIGN KEY (contact_id) REFERENCES contacts(id)
      );
      CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
    `);

    // Personality table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS personality (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        core_traits TEXT NOT NULL,
        communication_style TEXT NOT NULL,
        system_prompt_base TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Migrate personality table to add new columns if they don't exist
    this.migratePersonalityTable();

    // Load or initialize personality
    this.loadPersonality();
  }

  private migratePersonalityTable(): void {
    // Check if new columns exist and add them if not
    const tableInfo = this.db.prepare('PRAGMA table_info(personality)').all() as { name: string }[];
    const columnNames = tableInfo.map((col) => col.name);

    const migrations: { column: string; type: string }[] = [
      { column: 'humor_style', type: 'TEXT' },
      { column: 'interests', type: 'TEXT' },
      { column: 'boundaries', type: 'TEXT' },
      { column: 'voice_description', type: 'TEXT' },
      // ElevenLabs voice settings
      { column: 'elevenlabs_voice_id', type: 'TEXT' },
      { column: 'elevenlabs_voice_name', type: 'TEXT' },
      { column: 'tts_enabled', type: 'INTEGER' }, // SQLite uses INTEGER for booleans
    ];

    for (const { column, type } of migrations) {
      if (!columnNames.includes(column)) {
        this.db.exec(`ALTER TABLE personality ADD COLUMN ${column} ${type}`);
        console.log(`Added column ${column} to personality table`);
      }
    }
  }

  private loadPersonality(): void {
    const row = this.db.prepare('SELECT * FROM personality WHERE id = 1').get() as {
      name: string;
      core_traits: string;
      communication_style: string;
      humor_style?: string;
      interests?: string;
      boundaries?: string;
      system_prompt_base: string;
      voice_description?: string;
      elevenlabs_voice_id?: string;
      elevenlabs_voice_name?: string;
      tts_enabled?: number;
      updated_at: string;
    } | undefined;

    if (row) {
      this.personality = {
        name: row.name,
        coreTraits: JSON.parse(row.core_traits),
        communicationStyle: row.communication_style,
        humorStyle: row.humor_style || undefined,
        interests: row.interests ? JSON.parse(row.interests) : undefined,
        boundaries: row.boundaries ? JSON.parse(row.boundaries) : undefined,
        systemPromptBase: row.system_prompt_base,
        voiceDescription: row.voice_description || undefined,
        elevenLabsVoiceId: row.elevenlabs_voice_id || undefined,
        elevenLabsVoiceName: row.elevenlabs_voice_name || undefined,
        ttsEnabled: row.tts_enabled === 1,
        updatedAt: row.updated_at,
      };
    } else {
      // Initialize with default personality
      const now = new Date().toISOString();
      this.db.prepare(`
        INSERT INTO personality (id, name, core_traits, communication_style, humor_style, interests, boundaries, system_prompt_base, voice_description, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        DEFAULT_PERSONALITY.name,
        JSON.stringify(DEFAULT_PERSONALITY.coreTraits),
        DEFAULT_PERSONALITY.communicationStyle,
        DEFAULT_PERSONALITY.humorStyle || null,
        DEFAULT_PERSONALITY.interests ? JSON.stringify(DEFAULT_PERSONALITY.interests) : null,
        DEFAULT_PERSONALITY.boundaries ? JSON.stringify(DEFAULT_PERSONALITY.boundaries) : null,
        DEFAULT_PERSONALITY.systemPromptBase,
        DEFAULT_PERSONALITY.voiceDescription || null,
        now
      );
      this.personality = { ...DEFAULT_PERSONALITY, updatedAt: now };
    }
  }

  // ============ Contact Operations ============

  getContact(query: { id?: string; phoneNumber?: string; email?: string }): Contact | null {
    let row: Record<string, unknown> | undefined;

    if (query.id) {
      row = this.db.prepare('SELECT * FROM contacts WHERE id = ?').get(query.id) as Record<string, unknown> | undefined;
    } else if (query.phoneNumber) {
      const normalized = this.normalizePhone(query.phoneNumber);
      row = this.db.prepare('SELECT * FROM contacts WHERE phone_number = ?').get(normalized) as Record<string, unknown> | undefined;
    } else if (query.email) {
      row = this.db.prepare('SELECT * FROM contacts WHERE email = ?').get(query.email.toLowerCase()) as Record<string, unknown> | undefined;
    }

    if (!row) return null;

    return this.rowToContact(row);
  }

  upsertContact(data: Partial<Contact> & { phoneNumber?: string; email?: string }): Contact {
    const existing = this.getContact({
      id: data.id,
      phoneNumber: data.phoneNumber,
      email: data.email,
    });

    const now = new Date().toISOString();

    if (existing) {
      // Update existing contact
      this.db.prepare(`
        UPDATE contacts SET
          name = COALESCE(?, name),
          nickname = COALESCE(?, nickname),
          relationship = COALESCE(?, relationship),
          notes = COALESCE(?, notes),
          communication_style = COALESCE(?, communication_style),
          last_contact = ?,
          interaction_count = interaction_count + 1
        WHERE id = ?
      `).run(
        data.name || null,
        data.nickname || null,
        data.relationship || null,
        data.notes || null,
        data.communicationStyle || null,
        now,
        existing.id
      );

      return this.getContact({ id: existing.id })!;
    }

    // Create new contact
    const id = this.generateId();
    const phoneNumber = data.phoneNumber ? this.normalizePhone(data.phoneNumber) : null;

    this.db.prepare(`
      INSERT INTO contacts (id, phone_number, email, name, nickname, relationship, notes, communication_style, first_contact, last_contact, interaction_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      phoneNumber,
      data.email?.toLowerCase() || null,
      data.name || null,
      data.nickname || null,
      data.relationship || null,
      data.notes || null,
      data.communicationStyle || null,
      now,
      now
    );

    return this.getContact({ id })!;
  }

  getOrCreateContact(channel: CommunicationChannel, identifier: string): Contact {
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
      contact = this.getContact({ id: identifier });
      if (!contact) {
        contact = this.upsertContact({ id: identifier } as Contact);
      }
    }

    return contact;
  }

  // ============ Conversation Operations ============

  addConversation(entry: Omit<ConversationEntry, 'id'>): ConversationEntry {
    const id = this.generateId();

    this.db.prepare(`
      INSERT INTO conversations (id, contact_id, channel, timestamp, role, content, sentiment, message_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entry.contactId,
      entry.channel,
      entry.timestamp,
      entry.role,
      entry.content,
      entry.sentiment || null,
      entry.messageId || null
    );

    // Update contact's last_contact
    this.db.prepare(`
      UPDATE contacts SET last_contact = ?, interaction_count = interaction_count + 1 WHERE id = ?
    `).run(entry.timestamp, entry.contactId);

    return { ...entry, id };
  }

  getConversations(query: {
    contactId?: string;
    channel?: CommunicationChannel;
    limit?: number;
    since?: string;
  }): ConversationEntry[] {
    let sql = 'SELECT * FROM conversations WHERE 1=1';
    const params: unknown[] = [];

    if (query.contactId) {
      sql += ' AND contact_id = ?';
      params.push(query.contactId);
    }

    if (query.channel) {
      sql += ' AND channel = ?';
      params.push(query.channel);
    }

    if (query.since) {
      sql += ' AND timestamp >= ?';
      params.push(query.since);
    }

    sql += ' ORDER BY timestamp DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((row) => this.rowToConversation(row));
  }

  // ============ Personality ============

  getPersonality(): ReggiePersonality {
    return this.personality;
  }

  updatePersonality(updates: Partial<ReggiePersonality>): ReggiePersonality {
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE personality SET
        name = COALESCE(?, name),
        core_traits = COALESCE(?, core_traits),
        communication_style = COALESCE(?, communication_style),
        humor_style = COALESCE(?, humor_style),
        interests = COALESCE(?, interests),
        boundaries = COALESCE(?, boundaries),
        system_prompt_base = COALESCE(?, system_prompt_base),
        voice_description = COALESCE(?, voice_description),
        elevenlabs_voice_id = COALESCE(?, elevenlabs_voice_id),
        elevenlabs_voice_name = COALESCE(?, elevenlabs_voice_name),
        tts_enabled = COALESCE(?, tts_enabled),
        updated_at = ?
      WHERE id = 1
    `).run(
      updates.name ?? null,
      updates.coreTraits ? JSON.stringify(updates.coreTraits) : null,
      updates.communicationStyle ?? null,
      updates.humorStyle ?? null,
      updates.interests ? JSON.stringify(updates.interests) : null,
      updates.boundaries ? JSON.stringify(updates.boundaries) : null,
      updates.systemPromptBase ?? null,
      updates.voiceDescription ?? null,
      updates.elevenLabsVoiceId ?? null,
      updates.elevenLabsVoiceName ?? null,
      updates.ttsEnabled !== undefined ? (updates.ttsEnabled ? 1 : 0) : null,
      now
    );

    // Reload cached personality
    this.loadPersonality();
    return this.personality;
  }

  resetPersonality(): ReggiePersonality {
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE personality SET
        name = ?,
        core_traits = ?,
        communication_style = ?,
        humor_style = ?,
        interests = ?,
        boundaries = ?,
        system_prompt_base = ?,
        voice_description = ?,
        elevenlabs_voice_id = NULL,
        elevenlabs_voice_name = NULL,
        tts_enabled = 0,
        updated_at = ?
      WHERE id = 1
    `).run(
      DEFAULT_PERSONALITY.name,
      JSON.stringify(DEFAULT_PERSONALITY.coreTraits),
      DEFAULT_PERSONALITY.communicationStyle,
      DEFAULT_PERSONALITY.humorStyle || null,
      DEFAULT_PERSONALITY.interests ? JSON.stringify(DEFAULT_PERSONALITY.interests) : null,
      DEFAULT_PERSONALITY.boundaries ? JSON.stringify(DEFAULT_PERSONALITY.boundaries) : null,
      DEFAULT_PERSONALITY.systemPromptBase,
      DEFAULT_PERSONALITY.voiceDescription || null,
      now
    );

    this.loadPersonality();
    return this.personality;
  }

  // ============ Contact List Operations ============

  getAllContacts(options?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): { contacts: Contact[]; total: number } {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const search = options?.search?.toLowerCase();

    let countSql = 'SELECT COUNT(*) as count FROM contacts';
    let sql = 'SELECT * FROM contacts';
    const params: unknown[] = [];

    if (search) {
      const searchClause = ' WHERE LOWER(name) LIKE ? OR phone_number LIKE ? OR LOWER(email) LIKE ?';
      const searchPattern = `%${search}%`;
      countSql += searchClause;
      sql += searchClause;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ' ORDER BY last_contact DESC LIMIT ? OFFSET ?';

    const totalRow = this.db.prepare(countSql).get(...params) as { count: number };
    const rows = this.db.prepare(sql).all(...params, limit, offset) as Record<string, unknown>[];

    return {
      contacts: rows.map((row) => this.rowToContact(row)),
      total: totalRow.count,
    };
  }

  getContactWithStats(id: string): {
    contact: Contact;
    conversations: ConversationEntry[];
    stats: {
      totalMessages: number;
      channelBreakdown: Record<CommunicationChannel, number>;
      firstContact: string;
      lastContact: string;
    };
  } | null {
    const contact = this.getContact({ id });
    if (!contact) return null;

    // Get recent conversations (last 50)
    const conversations = this.getConversations({ contactId: id, limit: 50 });

    // Get channel breakdown
    const breakdownRows = this.db.prepare(`
      SELECT channel, COUNT(*) as count FROM conversations
      WHERE contact_id = ?
      GROUP BY channel
    `).all(id) as { channel: CommunicationChannel; count: number }[];

    const channelBreakdown: Record<CommunicationChannel, number> = {
      sms: 0,
      voice: 0,
      chat: 0,
      email: 0,
    };

    let totalMessages = 0;
    for (const row of breakdownRows) {
      channelBreakdown[row.channel] = row.count;
      totalMessages += row.count;
    }

    return {
      contact,
      conversations,
      stats: {
        totalMessages,
        channelBreakdown,
        firstContact: contact.firstContact,
        lastContact: contact.lastContact,
      },
    };
  }

  updateContact(id: string, updates: Partial<Omit<Contact, 'id' | 'firstContact' | 'lastContact' | 'interactionCount'>>): Contact | null {
    const existing = this.getContact({ id });
    if (!existing) return null;

    this.db.prepare(`
      UPDATE contacts SET
        name = COALESCE(?, name),
        nickname = COALESCE(?, nickname),
        relationship = COALESCE(?, relationship),
        notes = COALESCE(?, notes),
        communication_style = COALESCE(?, communication_style)
      WHERE id = ?
    `).run(
      updates.name ?? null,
      updates.nickname ?? null,
      updates.relationship ?? null,
      updates.notes ?? null,
      updates.communicationStyle ?? null,
      id
    );

    return this.getContact({ id });
  }

  // ============ Context Building ============

  buildSystemPrompt(channel: CommunicationChannel, contactId?: string): string {
    let prompt = this.personality.systemPromptBase;

    // Add channel-specific instructions
    if (channel === 'sms') {
      prompt += '\n\nYou are responding via SMS. Keep responses concise (under 160 characters when possible). Be direct but friendly.';
    } else if (channel === 'voice') {
      prompt += '\n\nYou are speaking on a phone call. Be conversational and natural. Pause appropriately. Respond as if talking, not texting.';
    } else if (channel === 'email') {
      prompt += '\n\nYou are responding via email. You can be more detailed. Use proper email formatting when appropriate.';
    }

    // Add contact context if available
    if (contactId) {
      const contact = this.getContact({ id: contactId });
      if (contact) {
        prompt += `\n\n## About this person:`;
        if (contact.name) prompt += `\n- Name: ${contact.name}`;
        if (contact.nickname) prompt += `\n- They prefer to be called: ${contact.nickname}`;
        if (contact.relationship) prompt += `\n- Relationship: ${contact.relationship}`;
        if (contact.notes) prompt += `\n- Notes: ${contact.notes}`;
        prompt += `\n- Previous interactions: ${contact.interactionCount}`;

        // Add recent conversation context
        const recentConversations = this.getConversations({
          contactId,
          limit: 5,
        });

        if (recentConversations.length > 0) {
          prompt += '\n\n## Recent conversation:';
          // Reverse to show oldest first
          for (const conv of recentConversations.reverse()) {
            const speaker = conv.role === 'user' ? 'Them' : 'You';
            prompt += `\n${speaker}: ${conv.content}`;
          }
        }
      }
    }

    return prompt;
  }

  // ============ Utility Methods ============

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      return cleaned.length === 10 ? `+1${cleaned}` : `+${cleaned}`;
    }
    return cleaned;
  }

  private rowToContact(row: Record<string, unknown>): Contact {
    return {
      id: row.id as string,
      phoneNumber: row.phone_number as string | undefined,
      email: row.email as string | undefined,
      name: row.name as string | undefined,
      nickname: row.nickname as string | undefined,
      relationship: row.relationship as string | undefined,
      notes: row.notes as string | undefined,
      communicationStyle: row.communication_style as string | undefined,
      firstContact: row.first_contact as string,
      lastContact: row.last_contact as string,
      interactionCount: row.interaction_count as number,
    };
  }

  private rowToConversation(row: Record<string, unknown>): ConversationEntry {
    return {
      id: row.id as string,
      contactId: row.contact_id as string,
      channel: row.channel as CommunicationChannel,
      timestamp: row.timestamp as string,
      role: row.role as 'user' | 'reggie',
      content: row.content as string,
      sentiment: row.sentiment as string | undefined,
      messageId: row.message_id as string | undefined,
    };
  }

  getStats(): { contacts: number; conversations: number } {
    const contactCount = (this.db.prepare('SELECT COUNT(*) as count FROM contacts').get() as { count: number }).count;
    const conversationCount = (this.db.prepare('SELECT COUNT(*) as count FROM conversations').get() as { count: number }).count;

    return {
      contacts: contactCount,
      conversations: conversationCount,
    };
  }

  close(): void {
    this.db.close();
  }
}

// Export singleton instance
export const memoryStore = new MemoryStore();
