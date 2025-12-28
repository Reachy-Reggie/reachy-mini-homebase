/// <reference types="vite/client" />

interface ImportMetaEnv {
  // AI Provider API Keys
  readonly VITE_ANTHROPIC_API_KEY: string | undefined;
  readonly VITE_OPENAI_API_KEY: string | undefined;
  readonly VITE_GOOGLE_API_KEY: string | undefined;

  // Robot Connection
  readonly VITE_ROBOT_HOST: string | undefined;
  readonly VITE_ROBOT_PORT: string | undefined;

  // Twilio Configuration
  readonly VITE_TWILIO_ACCOUNT_SID: string | undefined;
  readonly VITE_TWILIO_AUTH_TOKEN: string | undefined;
  readonly VITE_TWILIO_PHONE_NUMBER: string | undefined;

  // ElevenLabs Configuration
  readonly VITE_ELEVENLABS_API_KEY: string | undefined;
  readonly VITE_ELEVENLABS_AGENT_ID: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
