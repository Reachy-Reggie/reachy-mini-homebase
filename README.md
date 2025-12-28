# Reachy Mini Homebase

Control center for your Reachy Mini robot - an AI-powered robot assistant.

> **Note:** This application runs on a separate Linux computer on the same network as your Reachy Mini robot, not on the robot itself. It communicates with the robot over your local network.

## What is Reachy Mini Homebase?

A complete dashboard and phone system for your Reachy Mini robot:
- **Respond to SMS** - Text your robot's phone number and get AI-powered responses
- **Handle voice calls** - Real-time AI conversations for owner, voicemail for others
- **Control the robot body** - Camera, head movements, and antenna controls
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
│                      REACHY MINI HOMEBASE                        │
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
- **Voice Calls** - Owner gets real-time AI conversation; others get voicemail
- **AI Responses** - Claude AI generates contextual responses with your robot's personality

### Security
- **Owner-Only Access** - Only configured phone number can interact
- **Signature Validation** - Twilio requests are cryptographically verified
- **Audit Logging** - All actions logged with owner notifications

### Robot Control
- **Live Camera Feed** - WebRTC streaming from Reachy Mini
- **Motion Controls** - Head, body, and antenna movements
- **Auto-Recovery** - Camera and daemon automatically restart on failure

### Personalization
- **Custom Name** - Give your robot a unique name on first launch
- **Personality Traits** - Configure how your robot communicates
- **Voice Selection** - Choose from ElevenLabs voices

### Always-On Operation
- **Systemd Services** - Runs on boot, auto-restarts on crash
- **Health Monitoring** - `/health` endpoint for status checks
- **ngrok Tunnel** - Static URL for Twilio webhooks

## Project Structure

```
reachy-mini-homebase/
├── src/                    # React frontend (dashboard)
│   ├── components/         # UI components
│   │   ├── camera/        # Camera feed and controls
│   │   ├── setup/         # First-run setup wizard
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

### Hardware
- **Linux computer** (Ubuntu recommended) on the same network as your robot
- **Reachy Mini** robot (optional - dashboard works without robot for phone features)

### Software & Accounts
- **Node.js** 18+ (via nvm recommended)
- **Twilio Account** with phone number
- **Anthropic API Key** for Claude AI
- **ngrok** account with static domain

## Quick Start

```bash
# Clone and install
git clone https://github.com/Reachy-Reggie/reachy-mini-homebase.git
cd reachy-mini-homebase
npm install
cd server && npm install

# Configure environment
cp server/.env.example server/.env
# Edit .env with your API keys

# Start services (production)
sudo systemctl start reachy-homebase reachy-ngrok

# Or run in development
cd server && npm run dev
```

See [Quick Start Guide](docs/QUICKSTART.md) for detailed instructions.

## Service Management

```bash
# Check status
systemctl status reachy-homebase reachy-ngrok

# View logs
journalctl -u reachy-homebase -f

# Restart services
sudo systemctl restart reachy-homebase reachy-ngrok
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

## First-Time Setup

When you first access the dashboard, you'll be prompted to:
1. Give your robot a name
2. Choose personality traits
3. Configure your robot's communication style

You can change these anytime in the Settings page.

## Community

Part of the Reachy Mini robot community. Contributions welcome!

---

*Built for Reachy Mini robots*
