// Server Configuration

import { config } from 'dotenv';

// Load environment variables
config();

export const CONFIG = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // Owner (gets interactive voice, receives notifications)
  ownerPhoneNumber: process.env.OWNER_PHONE_NUMBER || '+15037547138',

  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },

  // Anthropic
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },

  // ElevenLabs
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    agentId: process.env.ELEVENLABS_AGENT_ID || '',
    voiceId: process.env.ELEVENLABS_VOICE_ID || '',
  },

  // Email (optional)
  email: {
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpSecure: process.env.SMTP_SECURE === 'true',
    fromAddress: process.env.EMAIL_FROM || '',
    toAddress: process.env.EMAIL_TO || '',
    // Support multiple recipients as comma-separated list
    toAddresses: (process.env.EMAIL_TO || '').split(',').map(e => e.trim()).filter(Boolean),
  },

  // URLs
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || '',
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:5173',
};

// Validate required configuration
export function validateConfig(): { valid: boolean; missing: string[] } {
  const required = [
    { key: 'TWILIO_ACCOUNT_SID', value: CONFIG.twilio.accountSid },
    { key: 'TWILIO_AUTH_TOKEN', value: CONFIG.twilio.authToken },
    { key: 'TWILIO_PHONE_NUMBER', value: CONFIG.twilio.phoneNumber },
    { key: 'ANTHROPIC_API_KEY', value: CONFIG.anthropic.apiKey },
  ];

  const missing = required.filter((r) => !r.value).map((r) => r.key);

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function isTwilioConfigured(): boolean {
  return !!(
    CONFIG.twilio.accountSid &&
    CONFIG.twilio.authToken &&
    CONFIG.twilio.phoneNumber
  );
}

export function isElevenLabsConfigured(): boolean {
  return !!(CONFIG.elevenLabs.apiKey && CONFIG.elevenLabs.agentId);
}

export function isEmailConfigured(): boolean {
  return !!(CONFIG.email.smtpHost && CONFIG.email.toAddress);
}
