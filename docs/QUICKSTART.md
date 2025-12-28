# Quick Start Guide

Get Reggie Homebase running in 5 minutes.

## Prerequisites

- [x] Ubuntu/Debian Linux
- [x] Node.js 18+ (nvm recommended)
- [x] Twilio account with phone number
- [x] Anthropic API key
- [x] ngrok account with static domain

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <repo-url> reggie-homebase
cd reggie-homebase

# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
```

## Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your credentials
nano .env
```

Required variables:

```bash
# Twilio (from twilio.com/console)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Your phone number (only this can interact)
OWNER_PHONE_NUMBER=+1XXXXXXXXXX

# Anthropic (from console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-...

# ngrok domain (from dashboard.ngrok.com)
WEBHOOK_BASE_URL=https://your-domain.ngrok-free.dev

# Server settings
PORT=3001
NODE_ENV=production
```

## Step 3: Build the Server

```bash
cd /home/reggie/reggie-homebase/server
npm run build
```

## Step 4: Install Systemd Services

```bash
# Copy service files
sudo cp reggie-server.service /etc/systemd/system/
sudo cp reggie-ngrok.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable on boot
sudo systemctl enable reggie-server reggie-ngrok

# Start now
sudo systemctl start reggie-server reggie-ngrok
```

## Step 5: Verify

```bash
# Check services are running
systemctl status reggie-server reggie-ngrok

# Test local health
curl http://localhost:3001/health

# Test public URL
curl https://your-domain.ngrok-free.dev/health
```

## Step 6: Configure Twilio Webhooks

In [Twilio Console](https://console.twilio.com):

1. Go to **Phone Numbers** → Your number
2. Set **SMS Webhook**: `https://your-domain.ngrok-free.dev/sms/incoming`
3. Set **Voice Webhook**: `https://your-domain.ngrok-free.dev/voice/incoming`
4. Save

## Step 7: Test It!

### Test SMS

Send a text message to your Twilio number from your owner phone.

Expected: AI response back via SMS.

### Test Voice

Call your Twilio number from your owner phone.

Expected: Interactive voicemail or ElevenLabs conversation.

### Test Dashboard

Open in browser: http://localhost:5173

Expected: Camera feed and robot controls.

## Troubleshooting

### Services won't start

```bash
# Check logs
journalctl -u reggie-server -n 50

# Common fix: rebuild
cd /home/reggie/reggie-homebase/server
npm run build
sudo systemctl restart reggie-server
```

### SMS not working

1. Verify Twilio webhook URL is correct
2. Check ngrok is running: `systemctl status reggie-ngrok`
3. Test public URL: `curl https://your-domain.ngrok-free.dev/health`

### Camera not connecting

See [Camera Troubleshooting](camera_troubleshooting.md)

## Next Steps

- Read [Architecture](ARCHITECTURE.md) to understand the system
- Review [Security](SECURITY.md) for access control
- Learn [Service Management](SERVICES.md) for daily operations

---

*Need help? Check [Troubleshooting](TROUBLESHOOTING.md)*
