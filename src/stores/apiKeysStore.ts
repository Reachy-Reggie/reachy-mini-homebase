// API Keys Store for Reggie Homebase
// Manages API keys for various AI providers
// Priority: Environment variables > localStorage

import { create } from 'zustand';

// Helper to get key with env var priority
function getKey(envVar: string, localStorageKey: string): string | null {
  // Environment variables take priority (set at build time via .env)
  const envValue = import.meta.env[envVar];
  if (envValue) {
    return envValue;
  }
  // Fall back to localStorage for runtime configuration
  return localStorage.getItem(localStorageKey);
}

// Check if a key comes from environment variables
function isFromEnv(envVar: string): boolean {
  return !!import.meta.env[envVar];
}

interface ApiKeysState {
  anthropicKey: string | null;
  openaiKey: string | null;
  googleKey: string | null;

  // Twilio credentials
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioPhoneNumber: string | null;

  // ElevenLabs credentials
  elevenLabsApiKey: string | null;
  elevenLabsAgentId: string | null;

  // Track source of each key
  anthropicFromEnv: boolean;
  openaiFromEnv: boolean;
  googleFromEnv: boolean;
  twilioFromEnv: boolean;
  elevenLabsFromEnv: boolean;

  // Actions
  setAnthropicKey: (key: string) => void;
  setOpenaiKey: (key: string) => void;
  setGoogleKey: (key: string) => void;
  setTwilioCredentials: (accountSid: string, authToken: string, phoneNumber: string) => void;
  setElevenLabsCredentials: (apiKey: string, agentId: string) => void;
  clearAllKeys: () => void;
  refreshFromEnv: () => void;

  // Helpers
  isTwilioConfigured: () => boolean;
  isElevenLabsConfigured: () => boolean;
}

export const useApiKeysStore = create<ApiKeysState>((set, get) => ({
  anthropicKey: getKey('VITE_ANTHROPIC_API_KEY', 'anthropic_api_key'),
  openaiKey: getKey('VITE_OPENAI_API_KEY', 'openai_api_key'),
  googleKey: getKey('VITE_GOOGLE_API_KEY', 'google_api_key'),

  // Twilio credentials
  twilioAccountSid: getKey('VITE_TWILIO_ACCOUNT_SID', 'twilio_account_sid'),
  twilioAuthToken: getKey('VITE_TWILIO_AUTH_TOKEN', 'twilio_auth_token'),
  twilioPhoneNumber: getKey('VITE_TWILIO_PHONE_NUMBER', 'twilio_phone_number'),

  // ElevenLabs credentials
  elevenLabsApiKey: getKey('VITE_ELEVENLABS_API_KEY', 'elevenlabs_api_key'),
  elevenLabsAgentId: getKey('VITE_ELEVENLABS_AGENT_ID', 'elevenlabs_agent_id'),

  anthropicFromEnv: isFromEnv('VITE_ANTHROPIC_API_KEY'),
  openaiFromEnv: isFromEnv('VITE_OPENAI_API_KEY'),
  googleFromEnv: isFromEnv('VITE_GOOGLE_API_KEY'),
  twilioFromEnv: isFromEnv('VITE_TWILIO_ACCOUNT_SID'),
  elevenLabsFromEnv: isFromEnv('VITE_ELEVENLABS_API_KEY'),

  setAnthropicKey: (key: string) => {
    // Only allow localStorage override if not set via env
    if (!isFromEnv('VITE_ANTHROPIC_API_KEY')) {
      localStorage.setItem('anthropic_api_key', key);
      // Backward compatibility
      localStorage.setItem('claude_api_key', key);
      set({ anthropicKey: key, anthropicFromEnv: false });
    }
  },

  setOpenaiKey: (key: string) => {
    if (!isFromEnv('VITE_OPENAI_API_KEY')) {
      localStorage.setItem('openai_api_key', key);
      set({ openaiKey: key, openaiFromEnv: false });
    }
  },

  setGoogleKey: (key: string) => {
    if (!isFromEnv('VITE_GOOGLE_API_KEY')) {
      localStorage.setItem('google_api_key', key);
      set({ googleKey: key, googleFromEnv: false });
    }
  },

  setTwilioCredentials: (accountSid: string, authToken: string, phoneNumber: string) => {
    if (!isFromEnv('VITE_TWILIO_ACCOUNT_SID')) {
      localStorage.setItem('twilio_account_sid', accountSid);
      localStorage.setItem('twilio_auth_token', authToken);
      localStorage.setItem('twilio_phone_number', phoneNumber);
      set({
        twilioAccountSid: accountSid,
        twilioAuthToken: authToken,
        twilioPhoneNumber: phoneNumber,
        twilioFromEnv: false,
      });
    }
  },

  setElevenLabsCredentials: (apiKey: string, agentId: string) => {
    if (!isFromEnv('VITE_ELEVENLABS_API_KEY')) {
      localStorage.setItem('elevenlabs_api_key', apiKey);
      localStorage.setItem('elevenlabs_agent_id', agentId);
      set({
        elevenLabsApiKey: apiKey,
        elevenLabsAgentId: agentId,
        elevenLabsFromEnv: false,
      });
    }
  },

  clearAllKeys: () => {
    localStorage.removeItem('anthropic_api_key');
    localStorage.removeItem('openai_api_key');
    localStorage.removeItem('google_api_key');
    localStorage.removeItem('claude_api_key');
    localStorage.removeItem('twilio_account_sid');
    localStorage.removeItem('twilio_auth_token');
    localStorage.removeItem('twilio_phone_number');
    localStorage.removeItem('elevenlabs_api_key');
    localStorage.removeItem('elevenlabs_agent_id');
    // Re-read from env vars after clearing localStorage
    set({
      anthropicKey: getKey('VITE_ANTHROPIC_API_KEY', 'anthropic_api_key'),
      openaiKey: getKey('VITE_OPENAI_API_KEY', 'openai_api_key'),
      googleKey: getKey('VITE_GOOGLE_API_KEY', 'google_api_key'),
      twilioAccountSid: getKey('VITE_TWILIO_ACCOUNT_SID', 'twilio_account_sid'),
      twilioAuthToken: getKey('VITE_TWILIO_AUTH_TOKEN', 'twilio_auth_token'),
      twilioPhoneNumber: getKey('VITE_TWILIO_PHONE_NUMBER', 'twilio_phone_number'),
      elevenLabsApiKey: getKey('VITE_ELEVENLABS_API_KEY', 'elevenlabs_api_key'),
      elevenLabsAgentId: getKey('VITE_ELEVENLABS_AGENT_ID', 'elevenlabs_agent_id'),
      anthropicFromEnv: isFromEnv('VITE_ANTHROPIC_API_KEY'),
      openaiFromEnv: isFromEnv('VITE_OPENAI_API_KEY'),
      googleFromEnv: isFromEnv('VITE_GOOGLE_API_KEY'),
      twilioFromEnv: isFromEnv('VITE_TWILIO_ACCOUNT_SID'),
      elevenLabsFromEnv: isFromEnv('VITE_ELEVENLABS_API_KEY'),
    });
  },

  refreshFromEnv: () => {
    set({
      anthropicKey: getKey('VITE_ANTHROPIC_API_KEY', 'anthropic_api_key'),
      openaiKey: getKey('VITE_OPENAI_API_KEY', 'openai_api_key'),
      googleKey: getKey('VITE_GOOGLE_API_KEY', 'google_api_key'),
      twilioAccountSid: getKey('VITE_TWILIO_ACCOUNT_SID', 'twilio_account_sid'),
      twilioAuthToken: getKey('VITE_TWILIO_AUTH_TOKEN', 'twilio_auth_token'),
      twilioPhoneNumber: getKey('VITE_TWILIO_PHONE_NUMBER', 'twilio_phone_number'),
      elevenLabsApiKey: getKey('VITE_ELEVENLABS_API_KEY', 'elevenlabs_api_key'),
      elevenLabsAgentId: getKey('VITE_ELEVENLABS_AGENT_ID', 'elevenlabs_agent_id'),
      anthropicFromEnv: isFromEnv('VITE_ANTHROPIC_API_KEY'),
      openaiFromEnv: isFromEnv('VITE_OPENAI_API_KEY'),
      googleFromEnv: isFromEnv('VITE_GOOGLE_API_KEY'),
      twilioFromEnv: isFromEnv('VITE_TWILIO_ACCOUNT_SID'),
      elevenLabsFromEnv: isFromEnv('VITE_ELEVENLABS_API_KEY'),
    });
  },

  isTwilioConfigured: () => {
    const state = get();
    return !!(state.twilioAccountSid && state.twilioAuthToken && state.twilioPhoneNumber);
  },

  isElevenLabsConfigured: () => {
    const state = get();
    return !!(state.elevenLabsApiKey && state.elevenLabsAgentId);
  },
}));
