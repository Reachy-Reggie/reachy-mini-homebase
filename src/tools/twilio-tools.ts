// Twilio Tools for Claude
// Defines tools that Claude can use for SMS and voice communication

import type Anthropic from '@anthropic-ai/sdk';
import { twilioService, type TwilioVoice } from '../services/twilioService';
import { memoryService } from '../services/memoryService';
import type { ToolResult } from './robot-tools';

// ============ Tool Definitions ============

export const twilioTools: Anthropic.Tool[] = [
  {
    name: 'send_sms',
    description: 'Send an SMS text message to a phone number. Use this when asked to text someone, send a message, or respond to a text. The message will be sent from Reggie\'s phone number.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: {
          type: 'string',
          description: 'The phone number to send the SMS to. Can be in any format (e.g., +1234567890, (123) 456-7890, 123-456-7890). Will be automatically formatted to E.164.',
        },
        message: {
          type: 'string',
          description: 'The text message content to send. Keep it concise - SMS messages over 160 characters may be split.',
        },
      },
      required: ['to', 'message'],
    },
  },
  {
    name: 'make_phone_call',
    description: 'Initiate an outbound phone call to speak a message. The call will play a text-to-speech message when answered. Use this when asked to call someone or leave a voice message.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: {
          type: 'string',
          description: 'The phone number to call. Can be in any format - will be automatically formatted.',
        },
        message: {
          type: 'string',
          description: 'The message to speak when the call is answered. This will be converted to speech.',
        },
        voice: {
          type: 'string',
          description: 'The voice to use for text-to-speech. Options: alice (default, natural female), man (male), woman (female), Polly.Amy (British female), Polly.Brian (British male), Polly.Joanna (US female), Polly.Matthew (US male)',
          enum: ['alice', 'man', 'woman', 'Polly.Amy', 'Polly.Brian', 'Polly.Joanna', 'Polly.Matthew'],
        },
      },
      required: ['to', 'message'],
    },
  },
  {
    name: 'get_message_history',
    description: 'Get recent SMS messages sent or received by Reggie. Use this to check message history or see what messages have been exchanged with a specific number.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone_number: {
          type: 'string',
          description: 'Optional: Filter to show only messages with this phone number.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of messages to retrieve (default: 10, max: 50).',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_phone_info',
    description: 'Get information about Reggie\'s phone capabilities and phone number. Use this when asked about Reggie\'s phone number or communication capabilities.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

// ============ Tool Execution ============

export async function executeTwilioTool(
  name: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'send_sms': {
        const to = input.to as string;
        const message = input.message as string;

        if (!to) {
          return { type: 'text', text: 'Error: Phone number is required.' };
        }

        if (!message) {
          return { type: 'text', text: 'Error: Message content is required.' };
        }

        const result = await twilioService.sendSMS({ to, body: message });

        if (result.success) {
          // Store conversation in memory
          const contact = memoryService.getOrCreateContactForChannel('sms', to);
          memoryService.addConversation({
            contactId: contact.id,
            channel: 'sms',
            timestamp: new Date().toISOString(),
            role: 'reggie',
            content: message,
            metadata: {
              messageId: result.sid,
            },
          });

          return {
            type: 'text',
            text: `SMS sent successfully to ${to}!\nMessage SID: ${result.sid}\nStatus: ${result.status}`,
          };
        } else {
          return {
            type: 'text',
            text: `Failed to send SMS: ${result.error}`,
          };
        }
      }

      case 'make_phone_call': {
        const to = input.to as string;
        const message = input.message as string;
        const voice = (input.voice as TwilioVoice) || 'alice';

        if (!to) {
          return { type: 'text', text: 'Error: Phone number is required.' };
        }

        if (!message) {
          return { type: 'text', text: 'Error: Message to speak is required.' };
        }

        const result = await twilioService.makeCall({ to, message, voice });

        if (result.success) {
          // Store in memory
          const contact = memoryService.getOrCreateContactForChannel('voice', to);
          memoryService.addConversation({
            contactId: contact.id,
            channel: 'voice',
            timestamp: new Date().toISOString(),
            role: 'reggie',
            content: `[Outbound call] ${message}`,
            metadata: {
              messageId: result.sid,
            },
          });

          return {
            type: 'text',
            text: `Phone call initiated to ${to}!\nCall SID: ${result.sid}\nStatus: ${result.status}\nThe message will be spoken when they answer.`,
          };
        } else {
          return {
            type: 'text',
            text: `Failed to make call: ${result.error}`,
          };
        }
      }

      case 'get_message_history': {
        const phoneNumber = input.phone_number as string | undefined;
        const limit = Math.min(Math.max(1, (input.limit as number) || 10), 50);

        const result = await twilioService.getMessages({
          to: phoneNumber,
          limit,
        });

        if (result.success && result.messages) {
          if (result.messages.length === 0) {
            return {
              type: 'text',
              text: phoneNumber
                ? `No messages found with ${phoneNumber}.`
                : 'No messages found.',
            };
          }

          const formattedMessages = result.messages
            .map((msg) => {
              const direction = msg.direction.includes('outbound') ? '→' : '←';
              const other = msg.direction.includes('outbound') ? msg.to : msg.from;
              const time = new Date(msg.dateCreated).toLocaleString();
              return `${direction} ${other} (${time}): ${msg.body}`;
            })
            .join('\n');

          return {
            type: 'text',
            text: `Recent messages:\n${formattedMessages}`,
          };
        } else {
          return {
            type: 'text',
            text: `Failed to get message history: ${result.error}`,
          };
        }
      }

      case 'get_phone_info': {
        const isConfigured = twilioService.isConfigured();
        const phoneNumber = twilioService.getPhoneNumber();
        const memoryStats = memoryService.getStats();

        if (!isConfigured) {
          return {
            type: 'text',
            text: 'Phone capabilities are not configured. Twilio credentials are missing.',
          };
        }

        return {
          type: 'text',
          text: `Reggie's Phone Capabilities:
- Phone Number: ${phoneNumber}
- SMS: Enabled (send and receive text messages)
- Voice: Enabled (make and receive calls)
- Memory: ${memoryStats.contacts} contacts, ${memoryStats.conversations} conversation entries

You can:
- Send text messages with send_sms
- Make phone calls with make_phone_call
- View message history with get_message_history`,
        };
      }

      default:
        return { type: 'text', text: `Unknown Twilio tool: ${name}` };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { type: 'text', text: `Error executing ${name}: ${errorMsg}` };
  }
}

// ============ Helper to check if a tool is a Twilio tool ============

export function isTwilioTool(name: string): boolean {
  return twilioTools.some((tool) => tool.name === name);
}
