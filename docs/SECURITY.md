# Security Features

Reggie implements multiple layers of security to ensure only authorized users can interact with the system.

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL TRAFFIC                          │
│                                                              │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐            │
│  │  Anyone  │     │  Twilio  │     │  Owner   │            │
│  │  (Web)   │     │ Webhooks │     │  Phone   │            │
│  └────┬─────┘     └────┬─────┘     └────┬─────┘            │
│       │                │                │                   │
│       ▼                ▼                ▼                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              SECURITY LAYER                          │   │
│  │  • Signature validation (Twilio requests)           │   │
│  │  • Owner phone check (SMS/Voice)                    │   │
│  │  • Audit logging (all actions)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                │                │                   │
│       ▼                ▼                ▼                   │
│    BLOCKED         BLOCKED          ALLOWED                │
│                   (non-owner)                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    LOCAL NETWORK                             │
│                                                              │
│  ┌──────────┐     ┌──────────┐                             │
│  │ Dashboard│     │  Robot   │        TRUSTED              │
│  │   (Web)  │     │ Control  │        (no auth)            │
│  └──────────┘     └──────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

## Owner-Only Access Control

### How It Works

Only the configured owner phone number can interact via SMS or voice:

```typescript
// In server/src/routes/sms.ts and voice.ts
function isOwner(from: string): boolean {
  const normalize = (phone: string) => phone.replace(/[^\d+]/g, '');
  return normalize(from) === normalize(CONFIG.ownerPhoneNumber);
}
```

### Configuration

Set in `server/.env`:

```bash
OWNER_PHONE_NUMBER=+1XXXXXXXXXX
```

**Format:** Must include country code (e.g., `+1` for US)

### Behavior

| Caller | SMS | Voice |
|--------|-----|-------|
| Owner | Processed by Claude AI, response sent | Interactive mode (ElevenLabs) or voicemail with response |
| Non-owner | Silently rejected, no response | Voicemail only, owner notified |

### Why Silent Rejection?

Non-owner SMS receives no response to:
- Not reveal the system is filtering
- Prevent enumeration attacks
- Reduce spam engagement

## Twilio Signature Validation

### What It Protects Against

- Spoofed webhook requests
- Replay attacks
- Man-in-the-middle attacks

### How It Works

Every Twilio webhook includes an `X-Twilio-Signature` header. The server validates this signature using the auth token:

```typescript
const isValid = twilio.validateRequest(
  CONFIG.twilio.authToken,
  twilioSignature,
  url,
  req.body
);
```

### Endpoints Protected

All Twilio webhook endpoints validate signatures:
- `/sms/incoming`, `/sms/status`, `/sms/fallback`
- `/voice/incoming`, `/voice/handle-recording`, `/voice/transcription`
- `/voice/handle-recording-guest`, `/voice/transcription-guest`
- `/voice/status`, `/voice/fallback`

### Development Mode

Signature validation is **skipped** when:
- `NODE_ENV=development`
- `WEBHOOK_BASE_URL` is not set

This allows local testing without ngrok.

## Audit Logging

### Overview

All security-sensitive actions are logged to `server/logs/audit.log`.

### Log Location

```bash
/home/reggie/reggie-homebase/server/logs/audit.log
```

### Log Format

Each line is a JSON object:

```json
{
  "timestamp": "2024-12-26T14:30:00.000Z",
  "action": "sms_rejected",
  "source": "sms",
  "details": {
    "from": "+15551234567",
    "body": "Hey there...",
    "messageId": "SM123..."
  },
  "notified": true
}
```

### Logged Actions

| Action | Trigger | Notifies Owner |
|--------|---------|----------------|
| `sms_received` | Owner sent SMS | No |
| `sms_rejected` | Non-owner tried to SMS | Yes |
| `sms_sent` | Outbound SMS sent | Yes |
| `voice_received` | Owner called | No |
| `voice_rejected` | Non-owner called | Yes |
| `robot_restart` | Daemon restarted | Yes |
| `security_alert` | Generic security event | Yes |

### Viewing Logs

```bash
# View recent entries
tail -20 /home/reggie/reggie-homebase/server/logs/audit.log

# Watch live
tail -f /home/reggie/reggie-homebase/server/logs/audit.log

# Parse with jq
cat /home/reggie/reggie-homebase/server/logs/audit.log | jq .

# Filter by action
cat /home/reggie/reggie-homebase/server/logs/audit.log | jq 'select(.action == "sms_rejected")'
```

### Owner Notifications

When certain actions occur, the owner receives an SMS notification:

```
🚫 [14:30:00] SMS blocked from +15551234567
🚫 [14:31:00] Call blocked from +15559876543
📤 [14:32:00] SMS sent to +15551234567
🤖 [14:33:00] Robot daemon restarted via web
```

### Notification Cooldown

To prevent notification spam, each action type has a **5-minute cooldown**:

- First `sms_rejected` → notification sent
- Second `sms_rejected` within 5 minutes → logged but no notification
- After 5 minutes → notification sent again

## Local Network Trust

### What's Trusted

All requests from the local network (192.168.x.x) are trusted:
- Dashboard access
- Robot control endpoints
- No authentication required

### CORS Configuration

```typescript
// Allowed origins
origin.includes('localhost') ||
origin.includes('127.0.0.1') ||
origin.match(/^https?:\/\/192\.168\.\d+\.\d+/)
```

### Why Trust Local Network?

- Dashboard is not exposed to internet
- Robot control requires physical presence
- Simplifies development and testing

## Rate Limiting

All endpoints have rate limiting to prevent abuse:

```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});
```

## Security Checklist

- [x] Owner phone number configured in `.env`
- [x] Twilio signature validation enabled (production)
- [x] Audit logging active
- [x] Owner notifications enabled
- [x] Rate limiting configured
- [x] CORS restricted to local network
- [ ] Regular audit log review

## Future Considerations

- **Email verification** - When email is implemented
- **Web UI authentication** - If remote dashboard access needed
- **API keys** - For programmatic access
- **2FA** - For sensitive operations

---

*See also: [API Reference](API_REFERENCE.md) for endpoint details*
