// Memory API Routes
// Provides API endpoints for personality, contacts, conversations, and voices

import { Router, Request, Response } from 'express';
import { memoryStore, ReggiePersonality, CommunicationChannel } from '../services/memoryStore.js';
import { CONFIG } from '../config.js';

export const memoryRouter = Router();

// ============ ElevenLabs Voice Endpoints ============

// GET /api/memory/voices - Get available ElevenLabs voices
memoryRouter.get('/voices', async (req: Request, res: Response) => {
  try {
    const apiKey = CONFIG.elevenLabs.apiKey;

    if (!apiKey) {
      return res.status(400).json({
        error: 'ElevenLabs API key not configured',
        voices: [],
      });
    }

    // Fetch voices from ElevenLabs API
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Memory API] ElevenLabs API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Failed to fetch voices from ElevenLabs',
        details: errorText,
      });
    }

    const data = await response.json() as {
      voices: Array<{
        voice_id: string;
        name: string;
        category?: string;
        description?: string;
        labels?: Record<string, string>;
        preview_url?: string;
      }>;
    };

    // Transform to simpler format
    const voices = data.voices.map((voice: {
      voice_id: string;
      name: string;
      category?: string;
      description?: string;
      labels?: Record<string, string>;
      preview_url?: string;
    }) => ({
      voiceId: voice.voice_id,
      name: voice.name,
      category: voice.category || 'custom',
      description: voice.description || '',
      labels: voice.labels || {},
      previewUrl: voice.preview_url || null,
    }));

    res.json({ voices });
  } catch (error) {
    console.error('[Memory API] Error fetching voices:', error);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

// POST /api/memory/tts - Generate TTS audio
memoryRouter.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing required field: text' });
    }

    const apiKey = CONFIG.elevenLabs.apiKey;
    if (!apiKey) {
      return res.status(400).json({ error: 'ElevenLabs API key not configured' });
    }

    // Get voice ID from request or personality settings
    const personality = memoryStore.getPersonality();
    const selectedVoiceId = voiceId || personality.elevenLabsVoiceId;

    if (!selectedVoiceId) {
      return res.status(400).json({ error: 'No voice selected. Please select a voice in Personality settings.' });
    }

    // Call ElevenLabs TTS API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Memory API] ElevenLabs TTS error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Failed to generate speech',
        details: errorText,
      });
    }

    // Return audio as MP3
    const audioBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('[Memory API] Error generating TTS:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

// ============ Personality Endpoints ============

// GET /api/memory/personality - Get current personality
memoryRouter.get('/personality', (req: Request, res: Response) => {
  try {
    const personality = memoryStore.getPersonality();
    res.json(personality);
  } catch (error) {
    console.error('[Memory API] Error getting personality:', error);
    res.status(500).json({ error: 'Failed to get personality' });
  }
});

// POST /api/memory/personality - Update personality
memoryRouter.post('/personality', (req: Request, res: Response) => {
  try {
    const updates: Partial<ReggiePersonality> = req.body;
    const personality = memoryStore.updatePersonality(updates);
    res.json({ success: true, personality });
  } catch (error) {
    console.error('[Memory API] Error updating personality:', error);
    res.status(500).json({ error: 'Failed to update personality' });
  }
});

// POST /api/memory/personality/reset - Reset personality to defaults
memoryRouter.post('/personality/reset', (req: Request, res: Response) => {
  try {
    const personality = memoryStore.resetPersonality();
    res.json({ success: true, personality });
  } catch (error) {
    console.error('[Memory API] Error resetting personality:', error);
    res.status(500).json({ error: 'Failed to reset personality' });
  }
});

// ============ Contacts Endpoints ============

// GET /api/memory/contacts - List all contacts with search and pagination
memoryRouter.get('/contacts', (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    const result = memoryStore.getAllContacts({ search, limit, offset });
    res.json(result);
  } catch (error) {
    console.error('[Memory API] Error getting contacts:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

// GET /api/memory/contacts/:id - Get single contact with stats and conversations
memoryRouter.get('/contacts/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = memoryStore.getContactWithStats(id);

    if (!result) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('[Memory API] Error getting contact:', error);
    res.status(500).json({ error: 'Failed to get contact' });
  }
});

// PUT /api/memory/contacts/:id - Update contact info
memoryRouter.put('/contacts/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const contact = memoryStore.updateContact(id, updates);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ success: true, contact });
  } catch (error) {
    console.error('[Memory API] Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// ============ Conversations Endpoints ============

// GET /api/memory/conversations - Get conversations with filters
memoryRouter.get('/conversations', (req: Request, res: Response) => {
  try {
    const contactId = req.query.contactId as string | undefined;
    const channel = req.query.channel as CommunicationChannel | undefined;
    const since = req.query.since as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const conversations = memoryStore.getConversations({
      contactId,
      channel,
      since,
      limit,
    });

    res.json({ conversations, total: conversations.length });
  } catch (error) {
    console.error('[Memory API] Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// POST /api/memory/conversations - Add a new conversation entry
memoryRouter.post('/conversations', (req: Request, res: Response) => {
  try {
    const { contactId, channel, role, content, sentiment } = req.body;

    if (!contactId || !channel || !role || !content) {
      return res.status(400).json({
        error: 'Missing required fields: contactId, channel, role, content',
      });
    }

    // Ensure contact exists (create if needed for chat)
    const contact = memoryStore.getOrCreateContact(channel, contactId);

    const entry = memoryStore.addConversation({
      contactId: contact.id,
      channel,
      timestamp: new Date().toISOString(),
      role,
      content,
      sentiment,
    });

    res.json({ success: true, conversation: entry });
  } catch (error) {
    console.error('[Memory API] Error adding conversation:', error);
    res.status(500).json({ error: 'Failed to add conversation' });
  }
});

// ============ Stats Endpoint ============

// GET /api/memory/stats - Get memory statistics
memoryRouter.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = memoryStore.getStats();
    res.json(stats);
  } catch (error) {
    console.error('[Memory API] Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});
