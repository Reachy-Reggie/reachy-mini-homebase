# Reggie Twilio Webhook Server

This server handles incoming SMS and voice calls for Reggie via Twilio webhooks.

## Quick Start

### 1. Start the Server
```bash
cd ~/reggie-homebase/server
npm install   # First time only
npm run dev
```

### 2. Start ngrok (in another terminal)
```bash
ngrok http 3001
```

### 3. Configure Twilio Webhooks

Go to https://console.twilio.com → Phone Numbers → +16122559398

Set webhooks to your ngrok URL:
- **Voice**: `https://YOUR-NGROK-URL/voice/incoming` (POST)
- **SMS**: `https://YOUR-NGROK-URL/sms/incoming` (POST)

## Features

### SMS
- Auto-responds to incoming texts using Claude AI
- Maintains conversation memory per contact
- Consistent Reggie personality

### Voice
- **Owner calls** (+15037547138): Gets interactive voicemail with SMS response
- **Other callers**: Gets voicemail, owner notified via SMS
- **ElevenLabs mode** (optional): Real-time AI voice conversation

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+16122559398
ANTHROPIC_API_KEY=sk-ant-xxxxx
OWNER_PHONE_NUMBER=+15037547138

# Optional - for real-time voice
ELEVENLABS_API_KEY=xxxxx
ELEVENLABS_AGENT_ID=xxxxx

# Set after starting ngrok
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok-free.dev
```

## Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/sms/incoming` | POST | Receive incoming SMS |
| `/sms/status` | POST | SMS delivery status |
| `/voice/incoming` | POST | Handle incoming calls |
| `/voice/handle-recording` | POST | Process voicemail |
| `/voice/transcription` | POST | Process transcription |
| `/voice/status` | POST | Call status updates |

## Architecture

```
Twilio Cloud
     │
     ▼ (HTTPS webhooks)
   ngrok
     │
     ▼ (localhost:3001)
Webhook Server
     │
     ├── Claude AI (response generation)
     ├── SQLite (conversation memory)
     └── ElevenLabs (optional real-time voice)
```

## Troubleshooting

### "Application Error" on incoming calls
- Server not running → `npm run dev`
- ngrok not running → `ngrok http 3001`
- Wrong webhook URL in Twilio → Update to current ngrok URL

### No response to texts
- Check server logs for errors
- Verify Anthropic API key is valid
- Test webhook: `curl -X POST http://localhost:3001/sms/incoming -d "From=+15551234567&Body=test"`

### ngrok URL changed
Free ngrok URLs change on restart. Update:
1. `WEBHOOK_BASE_URL` in `.env`
2. Webhooks in Twilio console

## Development

```bash
npm run dev     # Start with hot reload
npm run build   # Compile TypeScript
npm start       # Run compiled version
```
