// TTS Service
// Handles text-to-speech playback in the browser using ElevenLabs

import { memoryApi } from './memoryApi';

class TTSService {
  private audio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private _isSpeaking = false;
  private _isEnabled = false;
  private queue: string[] = [];
  private isProcessing = false;

  constructor() {
    // Check if we're in browser
    if (typeof window !== 'undefined') {
      this.loadSettings();
    }
  }

  private async loadSettings() {
    try {
      const personality = await memoryApi.getPersonality();
      this._isEnabled = personality.ttsEnabled ?? false;
    } catch (error) {
      console.warn('[TTS] Failed to load settings:', error);
    }
  }

  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  setEnabled(enabled: boolean): void {
    this._isEnabled = enabled;
  }

  async refreshSettings(): Promise<void> {
    await this.loadSettings();
  }

  /**
   * Speak the given text using ElevenLabs TTS
   */
  async speak(text: string): Promise<void> {
    if (!this._isEnabled) {
      return;
    }

    // Add to queue
    this.queue.push(text);

    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const text = this.queue.shift()!;
      await this.playText(text);
    }

    this.isProcessing = false;
  }

  private async playText(text: string): Promise<void> {
    // Clean up any previous audio
    this.cleanup();

    try {
      this._isSpeaking = true;

      // Get audio from TTS API
      const blob = await memoryApi.generateTts(text);
      const url = URL.createObjectURL(blob);
      this.currentUrl = url;

      // Create and play audio
      this.audio = new Audio(url);

      // Wait for audio to finish
      await new Promise<void>((resolve, reject) => {
        if (!this.audio) {
          resolve();
          return;
        }

        this.audio.onended = () => {
          this._isSpeaking = false;
          resolve();
        };

        this.audio.onerror = (e) => {
          this._isSpeaking = false;
          console.error('[TTS] Audio playback error:', e);
          reject(new Error('Audio playback failed'));
        };

        this.audio.play().catch((err) => {
          this._isSpeaking = false;
          console.error('[TTS] Failed to play audio:', err);
          reject(err);
        });
      });
    } catch (error) {
      this._isSpeaking = false;
      console.error('[TTS] Failed to generate or play speech:', error);
      throw error;
    } finally {
      // Clean up URL
      if (this.currentUrl) {
        URL.revokeObjectURL(this.currentUrl);
        this.currentUrl = null;
      }
    }
  }

  /**
   * Stop the current audio playback
   */
  stop(): void {
    this.queue = []; // Clear queue
    this.cleanup();
    this._isSpeaking = false;
  }

  private cleanup(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }

    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
  }

  /**
   * Play a preview of a voice
   */
  async previewVoice(voiceId: string, text?: string): Promise<void> {
    // Stop any current playback
    this.stop();

    const previewText = text || 'Hello! I am your friendly robot assistant.';

    try {
      this._isSpeaking = true;
      const blob = await memoryApi.generateTts(previewText, voiceId);
      const url = URL.createObjectURL(blob);
      this.currentUrl = url;

      this.audio = new Audio(url);

      await new Promise<void>((resolve, reject) => {
        if (!this.audio) {
          resolve();
          return;
        }

        this.audio.onended = () => {
          this._isSpeaking = false;
          resolve();
        };

        this.audio.onerror = () => {
          this._isSpeaking = false;
          reject(new Error('Preview playback failed'));
        };

        this.audio.play().catch(reject);
      });
    } catch (error) {
      this._isSpeaking = false;
      throw error;
    } finally {
      if (this.currentUrl) {
        URL.revokeObjectURL(this.currentUrl);
        this.currentUrl = null;
      }
    }
  }
}

// Export singleton instance
export const ttsService = new TTSService();
export default ttsService;
