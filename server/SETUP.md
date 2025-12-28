# Reggie Twilio Webhook Server Setup Guide

This guide helps you set up the webhook server so Twilio can reach it for incoming SMS and voice calls.

## Prerequisites

- Node.js 18+ installed
- Twilio account with credentials
- Static IP from ISP (optional but recommended)

## Quick Start

```bash
cd /home/reggie/reggie-homebase/server

# Install dependencies
npm install

# Start the server in development mode
npm run dev
```

The server will start on port 3001.

## Network Configuration Options

Twilio needs a **public HTTPS URL** to send webhook requests. Choose one option:

### Option 1: Static IP + Port Forwarding (Recommended)

Since you have a static IP from your ISP and an EX920_5A20 router:

1. **Log into your router** at http://192.168.0.1 (or router.asus.com)

2. **Navigate to**: WAN > Virtual Server / Port Forwarding

3. **Add a new rule**:
   - Service Name: `Reggie-Twilio`
   - Protocol: TCP
   - External Port: `3001` (or 443 for HTTPS)
   - Internal IP: `192.168.0.198` (this computer)
   - Internal Port: `3001`
   - Enable: Yes

4. **Save and apply**

5. **Set up HTTPS** (required by Twilio):

   **Option A: Use Caddy (easiest)**
   ```bash
   # Install Caddy
   sudo apt install -y caddy

   # Create Caddyfile
   sudo nano /etc/caddy/Caddyfile
   ```

   Add:
   ```
   YOUR_STATIC_IP:443 {
     reverse_proxy localhost:3001
   }
   ```

   **Option B: Use Let's Encrypt with nginx**
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   # Then configure nginx as reverse proxy
   ```

6. **Update server/.env**:
   ```
   WEBHOOK_BASE_URL=https://YOUR_STATIC_IP
   ```

7. **Configure Twilio** (see below)

### Option 2: ngrok (Easiest for Development)

```bash
# Install ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
  sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && \
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
  sudo tee /etc/apt/sources.list.d/ngrok.list && \
  sudo apt update && sudo apt install ngrok

# Authenticate (get token from ngrok.com)
ngrok config add-authtoken YOUR_NGROK_TOKEN

# Start tunnel
ngrok http 3001
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`) and update:
- `server/.env`: Set `WEBHOOK_BASE_URL=https://abc123.ngrok.io`
- Twilio Console: Update webhook URLs

**Note**: ngrok URLs change each restart unless you have a paid account.

### Option 3: Cloudflare Tunnel

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create reggie-twilio

# Configure and run
cloudflared tunnel route dns reggie-twilio twilio.yourdomain.com
cloudflared tunnel run reggie-twilio
```

## Configuring Twilio Console

1. Go to https://console.twilio.com
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click on your phone number (+16122559398)
4. Configure webhooks:

   **Voice & Fax Section:**
   - A Call Comes In: Webhook
   - URL: `https://YOUR_URL/voice/incoming`
   - HTTP: POST

   **Messaging Section:**
   - A Message Comes In: Webhook
   - URL: `https://YOUR_URL/sms/incoming`
   - HTTP: POST

5. Save changes

## Security Considerations

### Twilio Signature Validation

The server validates Twilio request signatures in production mode. This prevents unauthorized requests. Ensure:

1. `TWILIO_AUTH_TOKEN` is set correctly in `.env`
2. `WEBHOOK_BASE_URL` matches exactly what's configured in Twilio

### Firewall Rules

If using iptables/ufw:

```bash
# Allow Twilio's IP ranges (optional, for extra security)
# See: https://www.twilio.com/docs/sip-trunking/ip-addresses

# Or just allow port 3001 from anywhere (simpler)
sudo ufw allow 3001/tcp
```

### Rate Limiting

The server includes rate limiting (100 requests per 15 minutes per IP). Adjust in `src/index.ts` if needed.

## Testing

### Test SMS

Send a text to +16122559398. You should:
1. See the message logged in the server console
2. Receive an auto-response from Reggie

### Test Voice

Call +16122559398. You should:
1. Hear Reggie's greeting
2. If ElevenLabs is configured: Have a real-time conversation
3. If not: Leave a voicemail and receive an SMS response

### Test Outbound

From the Reggie dashboard, ask Claude to send a text:
> "Send a text to +1234567890 saying hello from Reggie"

## Troubleshooting

### "Invalid signature" errors

- Check `WEBHOOK_BASE_URL` matches exactly (including https://)
- Verify `TWILIO_AUTH_TOKEN` is correct
- In development, signature validation is skipped

### Twilio not reaching server

- Verify port forwarding is configured
- Check firewall allows port 3001
- Test with: `curl https://YOUR_URL/health`
- Check ngrok/cloudflared is running

### Voice calls not working

- ElevenLabs requires configuration for real-time voice
- Without ElevenLabs, calls go to voicemail mode
- Check Twilio logs for TwiML errors

### WebSocket connection issues

- Ensure WSS URL uses same domain as HTTPS
- Check ngrok/cloudflared supports WebSocket
- Look for WebSocket errors in browser console

## Architecture

```
                    Internet
                       │
                       ▼
                   Twilio
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    SMS Webhook   Voice Webhook   Media Stream
    (POST /sms)   (POST /voice)   (WSS /voice)
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ▼
              Reggie Webhook Server
                   (port 3001)
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
     Claude        SQLite DB      ElevenLabs
   (responses)     (memory)      (real-time)
```

## Files Reference

| File | Purpose |
|------|---------|
| `src/index.ts` | Server entry point |
| `src/config.ts` | Configuration loading |
| `src/routes/sms.ts` | SMS webhook handlers |
| `src/routes/voice.ts` | Voice webhook handlers |
| `src/services/memoryStore.ts` | SQLite memory storage |
| `src/services/claudeProcessor.ts` | Claude message processing |
| `src/services/elevenLabsService.ts` | Real-time voice with ElevenLabs |
| `.env` | Environment variables |
| `data/reggie-memory.db` | SQLite database (created automatically) |
