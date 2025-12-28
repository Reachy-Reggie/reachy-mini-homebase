// Voice Webhook Routes
// Handles incoming voice calls from Twilio
// Supports both voicemail mode and real-time ElevenLabs mode

import { Router, Request, Response, NextFunction } from 'express';
import twilio from 'twilio';
import { processVoiceTranscription } from '../services/claudeProcessor.js';
import { CONFIG, isElevenLabsConfigured } from '../config.js';
import { auditLog } from '../services/auditLog.js';
import { memoryStore } from '../services/memoryStore.js';
import { sendVoicemailEmail } from '../services/emailService.js';

const router = Router();
const { VoiceResponse } = twilio.twiml;

// Get the robot's name from personality settings
function getRobotName(): string {
  const personality = memoryStore.getPersonality();
  return personality.name || 'your robot assistant';
}

// Generate greeting text with dynamic name
function getVoicemailGreetingText(): string {
  const name = getRobotName();
  return `Hey there! You have reached ${name}. Leave a message after the beep and I will get back to you soon. Press any key when you are done.`;
}
const VOICEMAIL_GREETING_TTL_MS = 6 * 60 * 60 * 1000;

let cachedGreeting:
  | { voiceId: string; text: string; buffer: Buffer; generatedAt: number }
  | null = null;
let greetingPromise: Promise<Buffer | null> | null = null;

async function fetchVoicemailGreeting(voiceId: string): Promise<Buffer> {
  const greetingText = getVoicemailGreetingText();
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': CONFIG.elevenLabs.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: greetingText,
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
    throw new Error(`ElevenLabs TTS error (${response.status}): ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}

async function getVoicemailGreetingBuffer(): Promise<Buffer | null> {
  if (!isElevenLabsConfigured()) {
    return null;
  }

  // Use personality voice ID with fallback to config
  const voiceId = memoryStore.getPersonality().elevenLabsVoiceId || CONFIG.elevenLabs.voiceId;
  if (!voiceId) {
    console.warn('[Voice] No ElevenLabs voice ID configured - falling back to Twilio voice');
    return null;
  }

  const now = Date.now();
  if (
    cachedGreeting &&
    cachedGreeting.voiceId === voiceId &&
    cachedGreeting.text === VOICEMAIL_GREETING_TEXT &&
    now - cachedGreeting.generatedAt < VOICEMAIL_GREETING_TTL_MS
  ) {
    return cachedGreeting.buffer;
  }

  if (!greetingPromise) {
    greetingPromise = (async () => {
      try {
        return await fetchVoicemailGreeting(voiceId);
      } finally {
        greetingPromise = null;
      }
    })();
  }

  const buffer = await greetingPromise;
  if (buffer) {
    cachedGreeting = {
      voiceId,
      text: VOICEMAIL_GREETING_TEXT,
      buffer,
      generatedAt: now,
    };
  }

  return buffer;
}

async function warmVoicemailGreeting(): Promise<boolean> {
  try {
    const buffer = await getVoicemailGreetingBuffer();
    return !!buffer;
  } catch (error) {
    console.error('[Voice] Failed to warm voicemail greeting:', error);
    return false;
  }
}

function getVoicemailGreetingUrl(): string | null {
  if (!CONFIG.webhookBaseUrl) {
    return null;
  }
  return `${CONFIG.webhookBaseUrl}/voice/voicemail-greeting`;
}

// Middleware to validate Twilio request signature
const validateTwilioRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip validation in development mode
  if (CONFIG.isDevelopment && !CONFIG.webhookBaseUrl) {
    console.log('[Dev Mode] Skipping Twilio signature validation');
    next();
    return;
  }

  const twilioSignature = req.headers['x-twilio-signature'] as string;
  const url = `${CONFIG.webhookBaseUrl}${req.originalUrl}`;

  const isValid = twilio.validateRequest(
    CONFIG.twilio.authToken,
    twilioSignature,
    url,
    req.body
  );

  if (isValid) {
    next();
  } else {
    console.warn('Invalid Twilio signature from:', req.ip);
    res.status(403).send('Forbidden: Invalid signature');
  }
};

// Check if caller is the owner (gets interactive voice)
function isOwner(from: string): boolean {
  // Normalize phone numbers for comparison
  const normalize = (phone: string) => phone.replace(/[^\d+]/g, '');
  return normalize(from) === normalize(CONFIG.ownerPhoneNumber);
}

// Type for Twilio voice webhook body
interface TwilioVoiceWebhook {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
}

interface TwilioRecordingWebhook {
  CallSid: string;
  RecordingUrl: string;
  RecordingSid: string;
  RecordingStatus: string;
  RecordingDuration: string;
  From: string;
}

interface TwilioTranscriptionWebhook {
  TranscriptionSid: string;
  TranscriptionText: string;
  TranscriptionStatus: string;
  TranscriptionUrl: string;
  RecordingSid: string;
  CallSid: string;
  From: string;
}

// Incoming voice call webhook
router.post(
  '/incoming',
  validateTwilioRequest,
  async (req: Request, res: Response): Promise<void> => {
    const { From, CallSid } = req.body as TwilioVoiceWebhook;

    console.log(`[Voice] Incoming call from ${From} (${CallSid})`);

    const twiml = new VoiceResponse();

    // Check if caller is the owner
    if (isOwner(From)) {
      console.log(`[Voice] Owner calling - interactive mode for ${CallSid}`);

      // Log owner call
      await auditLog(
        'voice_received',
        { from: From, callSid: CallSid, mode: 'owner' },
        'voice'
      );

      // Check if ElevenLabs is configured for real-time voice
      if (isElevenLabsConfigured()) {
        console.log(`[Voice] Using ElevenLabs real-time mode for ${CallSid}`);

        try {
          // Use ElevenLabs registerCall REST API directly (SDK returns undefined)
          const { To } = req.body as TwilioVoiceWebhook;
          console.log(`[Voice] Calling ElevenLabs registerCall REST API with agentId: ${CONFIG.elevenLabs.agentId}, from: ${From}, to: ${To}`);

          // Get voice ID from personality or config
          const voiceId = memoryStore.getPersonality().elevenLabsVoiceId || CONFIG.elevenLabs.voiceId;

          const requestBody: Record<string, unknown> = {
            agent_id: CONFIG.elevenLabs.agentId,
            from_number: From,
            to_number: To,
            direction: 'inbound',
          };

          // Add voice override if configured
          if (voiceId) {
            requestBody.conversation_initiation_client_data = {
              conversation_config_override: {
                tts: {
                  voice_id: voiceId,
                },
              },
            };
            console.log(`[Voice] Using voice ID: ${voiceId}`);
          }

          const response = await fetch('https://api.elevenlabs.io/v1/convai/twilio/register-call', {
            method: 'POST',
            headers: {
              'xi-api-key': CONFIG.elevenLabs.apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Voice] ElevenLabs API error (${response.status}): ${errorText}`);
            throw new Error(`ElevenLabs API returned ${response.status}: ${errorText}`);
          }

          const twimlResponse = await response.text();

          // Enhanced logging for debugging
          console.log(`[Voice] ElevenLabs registerCall for ${CallSid}:`);
          console.log(`[Voice]   - Status: ${response.status}`);
          console.log(`[Voice]   - Response length: ${twimlResponse.length}`);
          console.log(`[Voice]   - Response preview: ${twimlResponse.substring(0, 300)}`);

          if (!twimlResponse || twimlResponse.length === 0) {
            console.error(`[Voice] Empty TwiML response from ElevenLabs`);
            throw new Error('Empty TwiML response from ElevenLabs');
          }

          // Return TwiML directly from ElevenLabs
          res.type('application/xml');
          res.send(twimlResponse);
          return;
        } catch (error) {
          console.error(`[Voice] ElevenLabs registerCall failed for ${CallSid}:`, error);
          // Fall through to voicemail mode
        }
      }

      // Voicemail mode (either ElevenLabs not configured, or registerCall failed)
      console.log(`[Voice] Using voicemail mode for owner ${CallSid}`);

      twiml.say(
        { voice: 'alice' },
        `Hey! This is ${getRobotName()}. Leave me a message and I will respond via text. ` +
          'Press any key when done.'
      );

      twiml.record({
        maxLength: 120,
        playBeep: true,
        action: '/voice/handle-recording',
        transcribe: true,
        transcribeCallback: '/voice/transcription',
        timeout: 5,
        finishOnKey: '0123456789#*',
      });

      twiml.say({ voice: 'alice' }, 'No message received. Goodbye!');
    } else {
      // Non-owner caller - simple voicemail, no auto-response
      console.log(`[Voice] Non-owner caller - voicemail only for ${CallSid}`);

      try {
        // Log non-owner call (may trigger notification)
        await auditLog(
          'voice_rejected',
          { from: From, callSid: CallSid, reason: 'not_owner' },
          'voice'
        );

        const greetingUrl = getVoicemailGreetingUrl();
        const greetingReady =
          greetingUrl && isElevenLabsConfigured()
            ? await warmVoicemailGreeting()
            : false;

        console.log(`[Voice] Guest greeting: url=${greetingUrl}, ready=${greetingReady}`);

        if (greetingUrl && greetingReady) {
          twiml.play(greetingUrl);
        } else {
          twiml.say({ voice: 'alice' }, VOICEMAIL_GREETING_TEXT);
        }

        // Record but use different callback that doesn't auto-respond
        twiml.record({
          maxLength: 60,
          playBeep: true,
          action: '/voice/handle-recording-guest',
          transcribe: true,
          transcribeCallback: '/voice/transcription-guest',
          timeout: 5,
          finishOnKey: '0123456789#*',
        });

        twiml.say({ voice: 'alice' }, 'No message received. Goodbye!');
      } catch (error) {
        console.error(`[Voice] Guest voicemail error for ${CallSid}:`, error);

        // Fallback - simple voicemail with Twilio voice
        twiml.say(
          { voice: 'alice' },
          `Hey there! You have reached ${getRobotName()}. Please leave a message after the beep.`
        );
        twiml.record({
          maxLength: 60,
          playBeep: true,
          action: '/voice/handle-recording-guest',
          transcribe: true,
          transcribeCallback: '/voice/transcription-guest',
          timeout: 5,
        });
        twiml.say({ voice: 'alice' }, 'Goodbye!');
      }
    }

    res.type('text/xml');
    res.send(twiml.toString());
  }
);

// Serve ElevenLabs voicemail greeting audio
router.get('/voicemail-greeting', async (req: Request, res: Response): Promise<void> => {
  try {
    const buffer = await getVoicemailGreetingBuffer();
    if (!buffer) {
      res.status(404).send('Voicemail greeting not configured');
      return;
    }

    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (error) {
    console.error('[Voice] Failed to generate voicemail greeting:', error);
    res.status(500).send('Failed to generate voicemail greeting');
  }
});

// Handle recording completion
router.post(
  '/handle-recording',
  validateTwilioRequest,
  async (req: Request, res: Response): Promise<void> => {
    const { RecordingUrl, RecordingDuration, From, CallSid } =
      req.body as TwilioRecordingWebhook;

    console.log(
      `[Voice] Recording received from ${From}: ${RecordingUrl} (${RecordingDuration}s)`
    );

    const twiml = new VoiceResponse();

    twiml.say(
      { voice: 'alice' },
      'Thank you for your message! ' +
        'I will process it and send you a response via text message. ' +
        'Goodbye!'
    );

    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  }
);

// Handle transcription callback
router.post(
  '/transcription',
  validateTwilioRequest,
  async (req: Request, res: Response): Promise<void> => {
    const { TranscriptionText, TranscriptionStatus, From, CallSid } =
      req.body as TwilioTranscriptionWebhook;

    console.log(
      `[Voice] Transcription from ${From} (${TranscriptionStatus}): ${TranscriptionText}`
    );

    if (TranscriptionStatus === 'completed' && TranscriptionText) {
      try {
        // Process transcription with Claude
        const result = await processVoiceTranscription(
          From,
          TranscriptionText,
          CallSid
        );

        console.log(`[Voice] Response generated for ${From}: ${result.response}`);

        // Send response via SMS
        const client = twilio(
          CONFIG.twilio.accountSid,
          CONFIG.twilio.authToken
        );

        await client.messages.create({
          to: From,
          from: CONFIG.twilio.phoneNumber,
          body: `${getRobotName()} here! Re your voicemail: ${result.response}`,
        });

        console.log(`[Voice] SMS response sent to ${From}`);

        // Log outbound SMS
        await auditLog(
          'sms_sent',
          { to: From, source: 'voice_transcription', callSid: CallSid },
          'voice'
        );
      } catch (error) {
        console.error('[Voice] Error processing transcription:', error);
      }
    }

    res.sendStatus(200);
  }
);

// ============ Guest Voicemail Handlers (no auto-response) ============

// Handle guest recording completion
router.post(
  '/handle-recording-guest',
  validateTwilioRequest,
  async (req: Request, res: Response): Promise<void> => {
    const { RecordingUrl, RecordingDuration, From, CallSid } =
      req.body as TwilioRecordingWebhook;

    console.log(
      `[Voice] Guest recording from ${From}: ${RecordingUrl} (${RecordingDuration}s)`
    );

    const twiml = new VoiceResponse();
    twiml.say(
      { voice: 'alice' },
      'Thank you for your message. It has been delivered. Goodbye!'
    );
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  }
);

// Handle guest transcription - store for owner but don't auto-respond
router.post(
  '/transcription-guest',
  validateTwilioRequest,
  async (req: Request, res: Response): Promise<void> => {
    const { TranscriptionText, TranscriptionStatus, From, CallSid } =
      req.body as TwilioTranscriptionWebhook;

    console.log(
      `[Voice] Guest transcription from ${From} (${TranscriptionStatus}): ${TranscriptionText}`
    );

    if (TranscriptionStatus === 'completed' && TranscriptionText) {
      // Get or create contact
      const contact = memoryStore.getOrCreateContact('voice', From);

      // Store the voicemail in memory for owner to review
      memoryStore.addConversation({
        contactId: contact.id,
        channel: 'voice',
        timestamp: new Date().toISOString(),
        role: 'user',
        content: `[Voicemail from ${From}]: ${TranscriptionText}`,
        messageId: CallSid,
      });

      console.log(`[Voice] Guest voicemail stored for contact ${contact.id}`);

      // Email the transcription to owner (if configured)
      await sendVoicemailEmail({
        fromNumber: From,
        transcription: TranscriptionText,
        callSid: CallSid,
      });

      // Notify owner via SMS about the new voicemail
      try {
        const client = twilio(
          CONFIG.twilio.accountSid,
          CONFIG.twilio.authToken
        );

        await client.messages.create({
          to: CONFIG.ownerPhoneNumber,
          from: CONFIG.twilio.phoneNumber,
          body: `New voicemail from ${From}: "${TranscriptionText.substring(0, 100)}${TranscriptionText.length > 100 ? '...' : ''}"`,
        });

        console.log(`[Voice] Owner notified of guest voicemail`);
      } catch (error) {
        console.error('[Voice] Failed to notify owner:', error);
      }
    }

    res.sendStatus(200);
  }
);

// Call status callback
router.post(
  '/status',
  validateTwilioRequest,
  (req: Request, res: Response): void => {
    const { CallSid, CallStatus, From } = req.body as TwilioVoiceWebhook;
    console.log(`[Voice Status] ${CallSid} from ${From}: ${CallStatus}`);
    res.sendStatus(200);
  }
);

// Fallback webhook
router.post(
  '/fallback',
  validateTwilioRequest,
  (req: Request, res: Response): void => {
    console.error('[Voice Fallback] Triggered - check primary webhook');

    const twiml = new VoiceResponse();
    twiml.say(
      { voice: 'alice' },
      `${getRobotName()} is experiencing technical difficulties. Please try again later.`
    );
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  }
);

export { router as voiceRouter };
