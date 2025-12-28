# API Reference

Complete documentation of all webhook server endpoints.

## Base URLs

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:3001` |
| Public | `https://uncontrovertedly-dynastic-imelda.ngrok-free.dev` |

## Health Check

### GET /health

Check if the server is running.

**Response:**
```json
{
  "status": "ok",
  "service": "reggie-twilio-server",
  "memory": {
    "contacts": 0,
    "conversations": 0
  },
  "timestamp": "2024-12-26T14:00:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:3001/health
```

---

## SMS Endpoints

All SMS endpoints require Twilio signature validation in production.

### POST /sms/incoming

Receive incoming SMS from Twilio.

**Request (form-urlencoded):**
```
From: +15551234567
To: +15550000000
Body: Hello Reggie!
MessageSid: SM...
```

**Response (TwiML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Hey! This is Reggie responding...</Message>
</Response>
```

**Behavior:**
- Owner phone → Process with Claude AI, send response
- Non-owner → Silent rejection (empty TwiML), audit log

### POST /sms/status

Receive SMS delivery status updates.

**Request (form-urlencoded):**
```
MessageSid: SM...
MessageStatus: delivered
To: +15551234567
From: +15550000000
```

**Response:** `200 OK`

### POST /sms/fallback

Fallback when primary webhook fails.

**Response (TwiML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Reggie is experiencing technical difficulties. Please try again later.</Message>
</Response>
```

---

## Voice Endpoints

All voice endpoints require Twilio signature validation in production.

### POST /voice/incoming

Handle incoming voice calls.

**Request (form-urlencoded):**
```
From: +15551234567
To: +15550000000
CallSid: CA...
CallStatus: ringing
```

**Response (TwiML for owner with ElevenLabs):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hey! Connecting you now...</Say>
  <Connect>
    <Stream url="wss://host/voice/media-stream">
      <Parameter name="callSid" value="CA..."/>
      <Parameter name="from" value="+15551234567"/>
    </Stream>
  </Connect>
</Response>
```

**Response (TwiML for non-owner):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! You have reached Reggie. Please leave a message...</Say>
  <Record maxLength="60" playBeep="true" action="/voice/handle-recording-guest"/>
</Response>
```

### POST /voice/handle-recording

Handle owner voicemail recording completion.

**Request (form-urlencoded):**
```
RecordingUrl: https://api.twilio.com/...
RecordingDuration: 15
From: +15551234567
CallSid: CA...
```

**Response (TwiML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for your message! I will process it and send you a response via text message.</Say>
  <Hangup/>
</Response>
```

### POST /voice/transcription

Handle owner voicemail transcription. Sends AI response via SMS.

**Request (form-urlencoded):**
```
TranscriptionText: Hey Reggie, can you...
TranscriptionStatus: completed
From: +15551234567
CallSid: CA...
```

**Response:** `200 OK`

**Side effect:** SMS sent to caller with AI response.

### POST /voice/handle-recording-guest

Handle non-owner voicemail completion.

**Response (TwiML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for your message. It has been delivered. Goodbye!</Say>
  <Hangup/>
</Response>
```

### POST /voice/transcription-guest

Handle non-owner voicemail transcription.

**Side effects:**
- Stores voicemail in memory
- Sends SMS notification to owner

**Response:** `200 OK`

### POST /voice/status

Receive call status updates.

**Response:** `200 OK`

### POST /voice/fallback

Fallback when primary voice webhook fails.

**Response (TwiML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Reggie is experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>
```

### WS /voice/media-stream

WebSocket endpoint for Twilio Media Streams (real-time voice with ElevenLabs).

**Connection:** Initiated by Twilio `<Stream>` TwiML

---

## Robot Endpoints

These endpoints control the Reachy Mini robot via SSH.

### POST /robot/restart-daemon

Restart the reachy-mini-daemon service.

**Request:** None required

**Response:**
```json
{
  "success": true,
  "message": "Daemon restart initiated",
  "stdout": "..."
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Connection refused"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/robot/restart-daemon
```

**Side effect:** Audit log entry, owner notification.

### POST /robot/start-daemon

Start the daemon with wake_up flag.

**Response:**
```json
{
  "success": true,
  "message": "Daemon start initiated"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/robot/start-daemon
```

### GET /robot/ssh-status

Check if SSH connection to robot is working.

**Response:**
```json
{
  "connected": true,
  "hostname": "reachy"
}
```

**Example:**
```bash
curl http://localhost:3001/robot/ssh-status
```

### GET /robot/daemon-status

Get current daemon status from robot.

**Response:**
```json
{
  "success": true,
  "status": {
    "state": "running",
    "uptime": 3600
  }
}
```

**Example:**
```bash
curl http://localhost:3001/robot/daemon-status
```

---

## Authentication

### Twilio Signature Validation

All `/sms/*` and `/voice/*` endpoints validate the `X-Twilio-Signature` header.

**Skipped when:**
- `NODE_ENV=development`
- `WEBHOOK_BASE_URL` not set

### Owner Verification

SMS and voice endpoints check if the sender matches `OWNER_PHONE_NUMBER`.

---

## Error Responses

### 403 Forbidden
```
Forbidden: Invalid signature
```
Cause: Twilio signature validation failed.

### 404 Not Found
```json
{
  "error": "Not found"
}
```
Cause: Unknown endpoint.

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```
Cause: Server exception (check logs).

---

## Rate Limiting

All endpoints: 100 requests per 15 minutes per IP.

**Response when exceeded:**
```
Too many requests, please try again later.
```

---

*See also: [Architecture](ARCHITECTURE.md) for data flow diagrams*
