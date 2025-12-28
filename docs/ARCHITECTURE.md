# System Architecture

Overview of how all Reggie Homebase components work together.

## High-Level Architecture

```
                              ┌─────────────────┐
                              │   Internet      │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │    Twilio    │  │    ngrok     │  │  Claude AI   │
            │  SMS/Voice   │  │   Tunnel     │  │  (Anthropic) │
            └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                   │                 │                  │
                   │    ┌────────────┘                  │
                   │    │                               │
                   ▼    ▼                               │
            ┌─────────────────────────────────────────────────┐
            │              REGGIE HOMEBASE                     │
            │  ┌─────────────────────────────────────────────┐ │
            │  │           Webhook Server (Express)          │ │
            │  │                 Port 3001                   │ │
            │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │ │
            │  │  │   SMS   │ │  Voice  │ │  Robot  │       │◀┼──┘
            │  │  │ Routes  │ │ Routes  │ │ Routes  │       │ │
            │  │  └────┬────┘ └────┬────┘ └────┬────┘       │ │
            │  │       │          │           │             │ │
            │  │       └──────────┼───────────┘             │ │
            │  │                  ▼                         │ │
            │  │         ┌──────────────┐                   │ │
            │  │         │   Services   │                   │ │
            │  │         │ • Claude AI  │                   │ │
            │  │         │ • Memory     │                   │ │
            │  │         │ • Audit Log  │                   │ │
            │  │         └──────────────┘                   │ │
            │  └─────────────────────────────────────────────┘ │
            │                                                   │
            │  ┌─────────────────────────────────────────────┐ │
            │  │           Dashboard (React)                  │ │
            │  │              Port 5173                       │ │
            │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │ │
            │  │  │ Camera  │ │ Motion  │ │ Status  │       │ │
            │  │  │  Feed   │ │Controls │ │ Panels  │       │ │
            │  │  └─────────┘ └─────────┘ └─────────┘       │ │
            │  └─────────────────────────────────────────────┘ │
            └─────────────────────────────────────────────────┘
                                       │
                                       │ SSH
                                       ▼
                              ┌─────────────────┐
                              │   Reachy Mini   │
                              │     Robot       │
                              │  192.168.0.108  │
                              └─────────────────┘
```

## Component Details

### 1. Webhook Server (Express.js)

**Location:** `/home/reggie/reggie-homebase/server/`

**Purpose:** Handles all external webhooks and provides robot control API.

**Key Files:**
```
server/src/
├── index.ts              # Server entry point, WebSocket setup
├── config.ts             # Environment configuration
├── routes/
│   ├── sms.ts           # SMS webhook handlers
│   ├── voice.ts         # Voice call handlers
│   └── robot.ts         # Robot control endpoints
└── services/
    ├── claudeProcessor.ts   # AI message processing
    ├── memoryStore.ts       # Conversation storage
    ├── auditLog.ts          # Security logging
    └── elevenLabsService.ts # Real-time voice (optional)
```

### 2. Dashboard (React + Vite)

**Location:** `/home/reggie/reggie-homebase/src/`

**Purpose:** Web UI for robot control and monitoring.

**Key Files:**
```
src/
├── App.tsx               # Main app component
├── components/
│   ├── camera/
│   │   └── CameraFeed.tsx    # WebRTC camera stream
│   └── robot/
│       ├── MotionControlPanel.tsx
│       ├── HeadPoseSliders.tsx
│       ├── BodyYawControl.tsx
│       ├── AntennaControls.tsx
│       └── VirtualJoystick.tsx
└── services/
    └── cameraRecovery.ts     # Auto-recovery logic
```

### 3. External Services

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **Twilio** | SMS and voice calls | `TWILIO_*` env vars |
| **ngrok** | Public URL tunnel | Static domain |
| **Claude AI** | AI responses | `ANTHROPIC_API_KEY` |
| **ElevenLabs** | Real-time voice (optional) | `ELEVENLABS_*` env vars |

### 4. Reachy Mini Robot

**IP Address:** 192.168.0.108

**Control Method:** SSH via Python script

**Key Components:**
- GStreamer camera pipeline
- WebRTC streaming (webrtcsink)
- Motion control daemon

## Data Flows

### SMS Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│  Twilio  │───▶│  ngrok   │───▶│  Server  │
│  Phone   │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                      │
     ┌────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│                    SMS Processing                         │
│                                                          │
│  1. Validate Twilio signature                           │
│  2. Check if sender is owner                            │
│  3. If not owner → reject silently, log, notify         │
│  4. If owner → process with Claude AI                   │
│  5. Store in conversation memory                        │
│  6. Return TwiML response                               │
└──────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Server  │───▶│  Twilio  │───▶│  User    │
│ Response │    │          │    │  Phone   │
└──────────┘    └──────────┘    └──────────┘
```

### Voice Call Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Caller  │───▶│  Twilio  │───▶│  ngrok   │───▶│  Server  │
│          │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                      │
     ┌────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│                   Voice Processing                        │
│                                                          │
│  IF owner:                                               │
│    → ElevenLabs real-time (if configured)               │
│    → Or interactive voicemail with AI response          │
│                                                          │
│  IF not owner:                                           │
│    → Simple voicemail                                    │
│    → Transcribe and store                               │
│    → Notify owner via SMS                               │
└──────────────────────────────────────────────────────────┘
```

### Camera Stream Flow

```
┌──────────────────────────────────────────────────────────┐
│                    Reachy Mini Robot                      │
│                                                          │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐     │
│  │   Camera   │───▶│  GStreamer │───▶│ webrtcsink │     │
│  │            │    │  Pipeline  │    │            │     │
│  └────────────┘    └────────────┘    └─────┬──────┘     │
└────────────────────────────────────────────┼─────────────┘
                                              │
                              WebSocket signaling
                                              │
                                              ▼
┌──────────────────────────────────────────────────────────┐
│                    Dashboard (Browser)                    │
│                                                          │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐     │
│  │ CameraFeed │◀───│   WebRTC   │◀───│ Signaling  │     │
│  │ Component  │    │ Connection │    │  Client    │     │
│  └────────────┘    └────────────┘    └────────────┘     │
│                                                          │
│  Auto-Recovery:                                          │
│  • 5 connection retries                                  │
│  • Automatic daemon restart via /robot/restart-daemon   │
│  • Health monitoring every 5 seconds                    │
└──────────────────────────────────────────────────────────┘
```

### Robot Control Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│Dashboard │───▶│  Server  │───▶│   SSH    │───▶│  Robot   │
│   UI     │    │  /robot  │    │  Script  │    │  Daemon  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘

Commands available:
• POST /robot/restart-daemon  →  sudo systemctl restart reachy-mini-daemon
• POST /robot/start-daemon    →  curl daemon API
• GET  /robot/daemon-status   →  curl daemon status
• GET  /robot/ssh-status      →  Test SSH connection
```

## File Structure

```
/home/reggie/reggie-homebase/
├── README.md                     # Project overview
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md          # This file
│   ├── SERVICES.md              # Systemd management
│   ├── SECURITY.md              # Security features
│   ├── API_REFERENCE.md         # Endpoints
│   ├── DASHBOARD.md             # UI guide
│   ├── QUICKSTART.md            # Getting started
│   ├── TROUBLESHOOTING.md       # Common fixes
│   └── camera_troubleshooting.md
├── src/                          # React frontend
│   ├── App.tsx
│   ├── components/
│   │   ├── camera/
│   │   └── robot/
│   └── services/
├── server/                       # Express backend
│   ├── src/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── routes/
│   │   └── services/
│   ├── dist/                    # Compiled JS
│   ├── logs/                    # Audit logs
│   ├── data/                    # SQLite database
│   ├── .env                     # Configuration
│   ├── reggie-server.service    # Systemd unit
│   └── reggie-ngrok.service     # Systemd unit
├── package.json                  # Frontend deps
└── vite.config.ts               # Vite config
```

## Ports and URLs

| Service | Local URL | Public URL |
|---------|-----------|------------|
| Dashboard | http://localhost:5173 | N/A (local only) |
| Webhook Server | http://localhost:3001 | https://uncontrovertedly-dynastic-imelda.ngrok-free.dev |
| Robot API | http://192.168.0.108:8000 | N/A (local only) |
| Robot Camera | ws://192.168.0.108:8443 | N/A (local only) |

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite (via better-sqlite3) |
| Real-time | WebSockets, WebRTC |
| AI | Claude (Anthropic API) |
| Voice | Twilio, ElevenLabs (optional) |
| Tunnel | ngrok |
| Process Manager | systemd |
| Robot | Python, GStreamer |

---

*See also: [API Reference](API_REFERENCE.md) for endpoint details*
