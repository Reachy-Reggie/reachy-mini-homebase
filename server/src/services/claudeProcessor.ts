// Claude Processor for Incoming Messages
// Processes incoming SMS/voice messages with Claude and memory context

import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from '../config.js';
import { memoryStore, type CommunicationChannel } from './memoryStore.js';

interface IncomingMessage {
  from: string;
  body: string;
  channel: CommunicationChannel;
  messageId?: string;
}

interface ProcessResult {
  response: string;
  contactId: string;
}

let claudeClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!claudeClient) {
    claudeClient = new Anthropic({
      apiKey: CONFIG.anthropic.apiKey,
    });
  }
  return claudeClient;
}

export async function processIncomingMessage(
  message: IncomingMessage
): Promise<ProcessResult> {
  const client = getClient();

  // Get or create contact
  const contact = memoryStore.getOrCreateContact(message.channel, message.from);

  // Store incoming message in memory
  memoryStore.addConversation({
    contactId: contact.id,
    channel: message.channel,
    timestamp: new Date().toISOString(),
    role: 'user',
    content: message.body,
    messageId: message.messageId,
  });

  // Build system prompt with context
  const systemPrompt = memoryStore.buildSystemPrompt(message.channel, contact.id);

  try {
    // Adjust max tokens based on channel
    const maxTokens = message.channel === 'sms' ? 100 : 300;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message.body,
        },
      ],
    });

    // Extract text response
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const responseText =
      textContent || "I'm having trouble thinking of a response. Please try again!";

    // Store Reggie's response in memory
    memoryStore.addConversation({
      contactId: contact.id,
      channel: message.channel,
      timestamp: new Date().toISOString(),
      role: 'reggie',
      content: responseText,
    });

    return {
      response: responseText,
      contactId: contact.id,
    };
  } catch (error) {
    console.error('Claude API error:', error);

    // Store error in memory
    memoryStore.addConversation({
      contactId: contact.id,
      channel: message.channel,
      timestamp: new Date().toISOString(),
      role: 'reggie',
      content: '[Error generating response]',
    });

    throw error;
  }
}

// Process voice transcription (from recorded voicemail)
export async function processVoiceTranscription(
  from: string,
  transcription: string,
  callSid: string
): Promise<ProcessResult> {
  return processIncomingMessage({
    from,
    body: transcription,
    channel: 'voice',
    messageId: callSid,
  });
}
