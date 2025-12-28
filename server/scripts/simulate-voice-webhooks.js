#!/usr/bin/env node
// Simulate Twilio voice webhooks with valid signatures.

import { config } from 'dotenv';
import twilio from 'twilio';

config({ path: './.env' });

const port = process.env.SIM_PORT || process.env.PORT || '3002';
const webhookBaseUrl =
  process.env.WEBHOOK_BASE_URL || `http://localhost:${port}`;
const targetBaseUrl = `http://localhost:${port}`;

const authToken = process.env.TWILIO_AUTH_TOKEN;
const ownerNumber = process.env.OWNER_PHONE_NUMBER || '+15037547138';
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+16122559398';

if (!authToken) {
  console.error('[Sim] Missing TWILIO_AUTH_TOKEN');
  process.exit(1);
}

const {
  getExpectedTwilioSignature,
} = twilio;

async function waitForServer(timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${targetBaseUrl}/health`);
      if (res.ok) {
        return true;
      }
    } catch {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function postForm(path, params) {
  const signature = getExpectedTwilioSignature(
    authToken,
    `${webhookBaseUrl}${path}`,
    params
  );

  const res = await fetch(`${targetBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': signature,
    },
    body: new URLSearchParams(params),
  });

  return {
    status: res.status,
    headers: res.headers,
    text: await res.text(),
  };
}

function logResult(label, ok, details) {
  const status = ok ? 'OK' : 'FAIL';
  console.log(`[Sim] ${status} ${label}${details ? ` - ${details}` : ''}`);
}

const ready = await waitForServer();
if (!ready) {
  console.error('[Sim] Server not reachable on /health');
  process.exit(1);
}

// Owner call (ElevenLabs register-call)
const ownerParams = {
  From: ownerNumber,
  To: twilioNumber,
  CallSid: 'CA_TEST_OWNER',
  CallStatus: 'ringing',
  Direction: 'inbound',
};

const ownerResponse = await postForm('/voice/incoming', ownerParams);
const ownerOk =
  ownerResponse.status === 200 &&
  ownerResponse.text.includes('convai/conversation');
logResult('Owner call TwiML', ownerOk, `status=${ownerResponse.status}`);

// Guest call (voicemail greeting)
const guestNumber = '+15035550000';
const guestParams = {
  From: guestNumber,
  To: twilioNumber,
  CallSid: 'CA_TEST_GUEST',
  CallStatus: 'ringing',
  Direction: 'inbound',
};

const guestResponse = await postForm('/voice/incoming', guestParams);
const guestHasPlay = guestResponse.text.includes('<Play>');
const guestHasRecord = guestResponse.text.includes('/voice/handle-recording-guest');
logResult(
  'Guest call TwiML',
  guestResponse.status === 200 && guestHasRecord,
  `status=${guestResponse.status}, play=${guestHasPlay}`
);

// Greeting audio endpoint
const greetingRes = await fetch(`${targetBaseUrl}/voice/voicemail-greeting`);
const greetingOk =
  greetingRes.status === 200 &&
  (greetingRes.headers.get('content-type') || '').includes('audio/mpeg');
logResult('Greeting audio', greetingOk, `status=${greetingRes.status}`);

// Guest transcription webhook (email + memory)
const transcriptionParams = {
  From: guestNumber,
  CallSid: 'CA_TEST_GUEST',
  TranscriptionStatus: 'completed',
  TranscriptionText: 'Test voicemail transcription for email delivery.',
  TranscriptionSid: 'TR_TEST_GUEST',
};

const transcriptionResponse = await postForm(
  '/voice/transcription-guest',
  transcriptionParams
);
logResult(
  'Guest transcription',
  transcriptionResponse.status === 200,
  `status=${transcriptionResponse.status}`
);
