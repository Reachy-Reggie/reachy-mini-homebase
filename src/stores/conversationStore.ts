// Conversation Store for Reggie Homebase
// Manages chat state and Claude interactions

import { create } from 'zustand';
import { claudeService, type Message, type ToolUse } from '../services/claude';
import { useApiKeysStore } from './apiKeysStore';
import { memoryApi } from '../services/memoryApi';
import { ttsService } from '../services/ttsService';

// Contact ID for dashboard chat - a consistent identifier for the local user
const DASHBOARD_CONTACT_ID = 'dashboard-user';

interface ConversationState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper to get Anthropic key from apiKeysStore
const getAnthropicKey = () => useApiKeysStore.getState().anthropicKey;

// Persist conversation to server (fire and forget - don't block UI)
async function persistConversation(role: 'user' | 'reggie', content: string) {
  try {
    await memoryApi.addConversation({
      contactId: DASHBOARD_CONTACT_ID,
      channel: 'chat',
      role,
      content,
    });
  } catch (error) {
    console.warn('[ConversationStore] Failed to persist to server:', error);
    // Don't throw - persistence is best-effort, don't block the UI
  }
}

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,

  sendMessage: async (content: string) => {
    const apiKey = getAnthropicKey();

    if (!apiKey) {
      set({ error: 'Please set your Anthropic API key in Settings or .env file' });
      return;
    }

    // Initialize client if needed (async to fetch personality from server)
    if (!claudeService.isInitialized()) {
      await claudeService.initialize(apiKey);
    }

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    // Persist user message to server (fire and forget)
    persistConversation('user', content);

    // Create placeholder for assistant message
    const assistantMessageId = generateId();
    const toolUses: ToolUse[] = [];

    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          toolUse: toolUses,
          timestamp: new Date(),
        },
      ],
    }));

    try {
      const response = await claudeService.sendMessage(
        content,
        // On tool use
        (toolUse) => {
          toolUses.push(toolUse);
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, toolUse: [...toolUses] }
                : msg
            ),
          }));
        },
        // On tool result
        (toolId, result) => {
          const index = toolUses.findIndex((t) => t.id === toolId);
          if (index !== -1) {
            toolUses[index] = {
              ...toolUses[index],
              result,
              status: result.startsWith('Error') ? 'error' : 'success',
            };
            set((state) => ({
              messages: state.messages.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, toolUse: [...toolUses] }
                  : msg
              ),
            }));
          }
        }
      );

      // Update assistant message with final response
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: response }
            : msg
        ),
        isLoading: false,
      }));

      // Persist assistant response to server (fire and forget)
      persistConversation('reggie', response);

      // Speak the response if TTS is enabled (fire and forget)
      if (ttsService.isEnabled && response) {
        ttsService.speak(response).catch((err) => {
          console.warn('[ConversationStore] TTS failed:', err);
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      set((state) => ({
        messages: state.messages.filter((msg) => msg.id !== assistantMessageId),
        isLoading: false,
        error: errorMsg,
      }));
    }
  },

  clearMessages: () => {
    claudeService.clearHistory();
    set({ messages: [], error: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Selector to check if API key is set (for use in components)
export const useIsApiKeySet = () => {
  const anthropicKey = useApiKeysStore((state) => state.anthropicKey);
  return !!anthropicKey;
};
