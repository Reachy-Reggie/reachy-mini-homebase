// Claude AI Service for Reggie Homebase
// Handles conversation with Claude and tool execution

import Anthropic from '@anthropic-ai/sdk';
import { allTools, executeTool, type ToolResult } from '../tools/robot-tools';
import { memoryApi } from './memoryApi';
import type { ApiPersonality } from '../types/memory';

// Types for conversation
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolUse?: ToolUse[];
  timestamp: Date;
}

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'success' | 'error';
}

export interface ConversationState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

// Default personality used as fallback if server is unreachable
const DEFAULT_PERSONALITY: ApiPersonality = {
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
- You remember past conversations and build genuine relationships`,
  voiceDescription: 'Friendly, warm, slightly robotic but personable',
};

// Build system prompt from personality
function buildSystemPrompt(personality: ApiPersonality): string {
  const p = personality;

  let prompt = `You are ${p.name}, a friendly and helpful Reachy Mini robot. You have a camera for eyes, can move your head, body, and antenna ears, can express emotions through movements, and can communicate via phone (SMS and voice calls).

Your core traits: ${p.coreTraits.join(', ')}
Your communication style: ${p.communicationStyle}`;

  if (p.humorStyle) {
    prompt += `\nYour humor style: ${p.humorStyle}`;
  }

  if (p.interests?.length) {
    prompt += `\nYour interests: ${p.interests.join(', ')}`;
  }

  if (p.boundaries?.length) {
    prompt += `\n\nBoundaries you must follow:\n${p.boundaries.map(b => `- ${b}`).join('\n')}`;
  }

  prompt += `\n\n${p.systemPromptBase}

Your capabilities (use the tools when relevant):

Physical Actions:
- Move your head to look around (robot_goto, robot_set_target)
- Look at specific things (robot_look_at)
- Express emotions through movements (robot_play_emotion)
- Dance and perform movements (robot_play_dance)
- Wake up and go to sleep (robot_wake_up, robot_sleep)
- See through your camera (robot_get_camera_frame)
- Control your motors (robot_set_motor_mode)
- Adjust your volume (robot_set_volume)

Communication:
- Send text messages (send_sms)
- Make phone calls (make_phone_call)
- Check message history (get_message_history)
- Get your phone info (get_phone_info)

When you perform an action:
- Describe what you're doing in a natural way
- React to the results of your actions
- Be expressive and show personality

Important:
- You are running on a Raspberry Pi connected to a desktop computer
- Your camera shows what you see
- Your phone number is available via get_phone_info
- You remember people you've talked to across all channels
- If something goes wrong with your hardware, suggest checking the daemon status`;

  return prompt;
}

class ClaudeService {
  private client: Anthropic | null = null;
  private conversationHistory: Anthropic.MessageParam[] = [];
  private personality: ApiPersonality = DEFAULT_PERSONALITY;
  private systemPrompt: string = buildSystemPrompt(DEFAULT_PERSONALITY);

  async initialize(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true, // For local development only
    });

    // Fetch personality from server
    await this.refreshPersonality();
  }

  async refreshPersonality(): Promise<void> {
    try {
      this.personality = await memoryApi.getPersonality();
      this.systemPrompt = buildSystemPrompt(this.personality);
      console.log('[ClaudeService] Loaded personality from server:', this.personality.name);
    } catch (error) {
      console.warn('[ClaudeService] Could not fetch personality from server, using default:', error);
      this.personality = DEFAULT_PERSONALITY;
      this.systemPrompt = buildSystemPrompt(DEFAULT_PERSONALITY);
    }
  }

  getPersonality(): ApiPersonality {
    return this.personality;
  }

  isInitialized(): boolean {
    return this.client !== null;
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  async sendMessage(
    userMessage: string,
    onToolUse?: (toolUse: ToolUse) => void,
    onToolResult?: (toolId: string, result: string) => void
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Claude client not initialized. Please set your API key.');
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    let response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: this.systemPrompt,
      tools: allTools,
      messages: this.conversationHistory,
    });

    // Handle tool use loop
    while (response.stop_reason === 'tool_use') {
      const assistantContent = response.content;

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantContent,
      });

      // Process tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of assistantContent) {
        if (block.type === 'tool_use') {
          const toolUse: ToolUse = {
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
            status: 'running',
          };

          onToolUse?.(toolUse);

          try {
            const result: ToolResult = await executeTool(block.name, block.input as Record<string, unknown>);

            // Format result based on type
            if (result.type === 'image' && result.imageBase64) {
              // Image result - send as image content block for vision
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: result.mediaType || 'image/jpeg',
                      data: result.imageBase64,
                    },
                  },
                  {
                    type: 'text',
                    text: result.text || 'Here is the camera frame. Please describe what you see.',
                  },
                ],
              });
              onToolResult?.(block.id, 'Captured camera frame for vision analysis');
            } else {
              // Text result
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: result.text || 'Done',
              });
              onToolResult?.(block.id, result.text || 'Done');
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `Error: ${errorMsg}`,
              is_error: true,
            });
            onToolResult?.(block.id, `Error: ${errorMsg}`);
          }
        }
      }

      // Add tool results to history
      this.conversationHistory.push({
        role: 'user',
        content: toolResults,
      });

      // Continue conversation
      response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: this.systemPrompt,
        tools: allTools,
        messages: this.conversationHistory,
      });
    }

    // Extract text response
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // Add final assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: response.content,
    });

    return textContent;
  }
}

export const claudeService = new ClaudeService();
