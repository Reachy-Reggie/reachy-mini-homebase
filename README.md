# Reggie Homebase

Control center for Reggie - an AI-powered robot assistant built on the Reachy Mini platform.

## What is Reggie?

Reggie is a personal AI assistant that can:
- **Respond to SMS** - Text Reggie's phone number and get AI-powered responses
- **Handle voice calls** - Leave voicemails that get transcribed and answered
- **Control a robot body** - Reachy Mini with camera, head movements, and antennas
- **Run 24/7** - Always-on services with auto-recovery

## Quick Links

| Document | Description |
|----------|-------------|
| [Quick Start](docs/QUICKSTART.md) | Get running in 5 minutes |
| [Architecture](docs/ARCHITECTURE.md) | System overview and data flows |
| [Services](docs/SERVICES.md) | Manage always-on systemd services |
| [Security](docs/SECURITY.md) | Owner-only access and audit logging |
| [API Reference](docs/API_REFERENCE.md) | All webhook endpoints |
| [Dashboard](docs/DASHBOARD.md) | Web UI controls guide |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues and fixes |
| [Camera Troubleshooting](docs/camera_troubleshooting.md) | WebRTC camera issues |
| [Server Setup](server/SETUP.md) | Network and Twilio configuration |

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         REGGIE HOMEBASE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Twilio     │───▶│   Webhook    │───▶│   Claude     │      │
│  │  SMS/Voice   │    │   Server     │    │     AI       │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                                    │
│         │                   ▼                                    │
│         │            ┌──────────────┐                           │
│         │            │    Robot     │                           │
│         │            │   Control    │                           │
│         │            └──────────────┘                           │
│         │                   │                                    │
│         ▼                   ▼                                    │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │    ngrok     │    │  Reachy Mini │                           │
│  │   Tunnel     │    │    Robot     │                           │
│  └──────────────┘    └──────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### Communication
- **SMS Gateway** - Receive and respond to text messages via Twilio
- **Voice Calls** - Owner gets interactive mode; others get voicemail
- **AI Responses** - Claude AI generates contextual responses

### Security
- **Owner-Only Access** - Only configured phone number can interact
- **Signature Validation** - Twilio requests are cryptographically verified
- **Audit Logging** - All actions logged with owner notifications

### Robot Control
- **Live Camera Feed** - WebRTC streaming from Reachy Mini
- **Motion Controls** - Head, body, and antenna movements
- **Auto-Recovery** - Camera and daemon automatically restart on failure

### Always-On Operation
- **Systemd Services** - Runs on boot, auto-restarts on crash
- **Health Monitoring** - `/health` endpoint for status checks
- **ngrok Tunnel** - Static URL for Twilio webhooks

## Project Structure

```
reggie-homebase/
├── src/                    # React frontend (dashboard)
│   ├── components/         # UI components
│   │   ├── camera/        # Camera feed and controls
│   │   └── robot/         # Robot motion controls
│   └── services/          # Frontend services
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/        # API endpoints (sms, voice, robot)
│   │   └── services/      # Business logic
│   └── logs/              # Audit logs
└── docs/                   # Documentation
```

## Requirements

- **Node.js** 18+ (via nvm recommended)
- **Twilio Account** with phone number
- **Anthropic API Key** for Claude AI
- **Reachy Mini** robot (optional, for robot features)
- **ngrok** account with static domain

## Quick Start

```bash
# Clone and install
git clone <repo> reggie-homebase
cd reggie-homebase
npm install
cd server && npm install

# Configure environment
cp server/.env.example server/.env
# Edit .env with your API keys

# Start services (production)
sudo systemctl start reggie-server reggie-ngrok

# Or run in development
cd server && npm run dev
```

See [Quick Start Guide](docs/QUICKSTART.md) for detailed instructions.

## Service Management

```bash
# Check status
systemctl status reggie-server reggie-ngrok

# View logs
journalctl -u reggie-server -f

# Restart services
sudo systemctl restart reggie-server reggie-ngrok
```

See [Services Guide](docs/SERVICES.md) for complete management instructions.

## Configuration

Key environment variables in `server/.env`:

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number |
| `OWNER_PHONE_NUMBER` | Your personal phone (only this can interact) |
| `ANTHROPIC_API_KEY` | Claude AI API key |
| `WEBHOOK_BASE_URL` | Public URL (ngrok domain) |

## Community

Part of the Reachy Mini robot community.

---

*Last updated: December 2024*
