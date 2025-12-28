// ElevenLabs Service
// Provides configuration helpers for ElevenLabs integration
//
// Note: The actual Twilio-ElevenLabs audio bridging is now handled
// by ElevenLabs' registerCall API. This service just provides helpers.

import { CONFIG, isElevenLabsConfigured } from '../config.js';

class ElevenLabsService {
  isConfigured(): boolean {
    return isElevenLabsConfigured();
  }

  getAgentId(): string {
    return CONFIG.elevenLabs.agentId;
  }

  getApiKey(): string {
    return CONFIG.elevenLabs.apiKey;
  }
}

// Export singleton instance
export const elevenLabsService = new ElevenLabsService();
