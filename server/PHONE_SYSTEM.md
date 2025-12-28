# Reggie Phone System Documentation

## Overview

Reggie's phone system handles incoming calls via Twilio webhooks, with two distinct modes:

1. **Owner Mode** - Real-time AI conversation using ElevenLabs Conversational AI
2. **Guest Mode** - Voicemail with ElevenLabs TTS greeting, transcription, and notifications

## Phone Numbers

| Number | Purpose |
|--------|---------|
| `TWILIO_PHONE_NUMBER` | Reggie's Twilio number (receives calls) |
| `OWNER_PHONE_NUMBER` | Owner number (gets real-time conversation) |

## Architecture

```
Incoming Call
     │
     ▼
┌─────────────────┐
│  Twilio Webhook │ POST /voice/incoming
└────────┬────────┘
         │
         ▼
    Is Owner?
    ┌───┴───┐
    │       │
   YES      NO
    │       │
    ▼       ▼
┌────────┐ ┌──────────────┐
│ElevenLabs│ │ElevenLabs TTS│
│Real-time │ │  Greeting    │
│  Convo   │ │    +         │
└────────┘ │  Voicemail   │
           └──────┬───────┘
                  │
                  ▼
           ┌──────────────┐
           │ Transcription │
           │   Callback    │
           └──────┬───────┘
                  │
          ┌───────┴───────┐
          ▼               ▼
    ┌──────────┐   ┌──────────┐
    │SMS to    │   │Email to  │
    │Owner     │   │Recipients│
    └──────────┘   └──────────┘
```

## Configuration

### Environment Variables (.env)

```env
# Twilio
TWILIO_ACCOUNT_SID=AC_your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Owner (gets real-time voice, receives notifications)
OWNER_PHONE_NUMBER=+1XXXXXXXXXX

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=agent_your_agent_id_here
ELEVENLABS_VOICE_ID=your_voice_id_here

# Email (voicemail transcription notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_SECURE=false
EMAIL_FROM=your_email@gmail.com
EMAIL_TO=recipient1@example.com,recipient2@example.com

# Webhook (ngrok URL)
WEBHOOK_BASE_URL=https://your-subdomain.ngrok-free.dev
```

### Twilio Console Configuration

Set these webhook URLs in the Twilio Console for your phone number:

- **Voice Webhook**: `https://<ngrok-url>/voice/incoming` (POST)
- **SMS Webhook**: `https://<ngrok-url>/sms/incoming` (POST)

## Voice Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/voice/incoming` | POST | Main webhook for incoming calls |
| `/voice/voicemail-greeting` | GET | Serves ElevenLabs TTS greeting audio |
| `/voice/handle-recording` | POST | Owner voicemail recording callback |
| `/voice/handle-recording-guest` | POST | Guest voicemail recording callback |
| `/voice/transcription` | POST | Owner voicemail transcription (auto-responds via SMS) |
| `/voice/transcription-guest` | POST | Guest voicemail transcription (notifies owner) |
| `/voice/status` | POST | Call status updates |
| `/voice/fallback` | POST | Error fallback |

## Call Flows

### Owner Call Flow (OWNER_PHONE_NUMBER)

1. Twilio sends webhook to `/voice/incoming`
2. Server detects owner number
3. Calls ElevenLabs `register-call` API with voice override
4. Returns TwiML with WebSocket stream to ElevenLabs
5. Real-time AI conversation begins

### Guest Call Flow (any other number)

1. Twilio sends webhook to `/voice/incoming`
2. Server detects non-owner number
3. Sends SMS notification to owner about incoming call
4. Generates/caches ElevenLabs TTS greeting
5. Returns TwiML to play greeting and record voicemail
6. When recording completes, Twilio calls `/voice/handle-recording-guest`
7. When transcription completes, Twilio calls `/voice/transcription-guest`
8. Server sends:
   - SMS to owner with voicemail preview
   - Email to configured recipients with full transcription

## Voice Configuration

The voice ID is resolved in this order:
1. `memoryStore.getPersonality().elevenLabsVoiceId` (from SQLite database)
2. `CONFIG.elevenLabs.voiceId` (from .env ELEVENLABS_VOICE_ID)

Current voice: Configured via `ELEVENLABS_VOICE_ID` environment variable

## Error Handling

### Owner Calls
- If ElevenLabs `register-call` fails, falls back to Twilio voicemail mode

### Guest Calls
- Wrapped in try/catch with fallback TwiML
- If ElevenLabs TTS fails, falls back to Twilio "alice" voice
- Voicemail always available even if greeting fails

### Express Middleware
- `trust proxy` enabled for ngrok/reverse proxy compatibility
- Rate limiting configured to work with X-Forwarded-For headers

## Key Files

| File | Purpose |
|------|---------|
| `src/routes/voice.ts` | Voice webhook handlers |
| `src/services/emailService.ts` | Email notifications |
| `src/services/auditLog.ts` | Security logging and notifications |
| `src/config.ts` | Environment configuration |
| `src/index.ts` | Express app setup |

## Troubleshooting

### "Application error has occurred"
- Check server logs for unhandled exceptions
- Verify ngrok tunnel is running
- Confirm `trust proxy` is set in Express

### Wrong voice playing
- Check `ELEVENLABS_VOICE_ID` in .env
- Verify voice ID in database: `SELECT elevenlabs_voice_id FROM personality`

### No email notifications
- Verify `SMTP_PASS` is set (Gmail app password)
- Check `EMAIL_TO` has correct recipients

### Real-time conversation not working
- Verify ElevenLabs agent is configured
- Check `ELEVENLABS_AGENT_ID` matches dashboard
- Review ElevenLabs conversation logs

## Testing

### Test Owner Call
```bash
# Call TWILIO_PHONE_NUMBER from OWNER_PHONE_NUMBER
# Expected: Real-time AI conversation
# Logs: "[Voice] Owner calling - interactive mode"
```

### Test Guest Call
```bash
# Call TWILIO_PHONE_NUMBER from any other number
# Expected: ElevenLabs voice greeting, then voicemail
# Logs: "[Voice] Guest greeting: url=..., ready=true"
```

### Test Email
```python
# Quick SMTP test
python3 -c "
import smtplib
server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login('your_email@gmail.com', 'your_app_password')
print('SMTP OK')
"
```

## Recent Fixes (2024-12-28)

1. **Guest voicemail error** - Added try/catch around guest flow
2. **Rate limiter error** - Added `app.set('trust proxy', 1)` for ngrok
3. **Voice fallback** - Added `CONFIG.elevenLabs.voiceId` fallback
4. **Multiple email recipients** - Updated `sendVoicemailEmail()` to support comma-separated list
