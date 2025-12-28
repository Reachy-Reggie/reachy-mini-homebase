# Dashboard User Guide

The Reggie Dashboard provides a web interface for monitoring and controlling the Reachy Mini robot.

## Accessing the Dashboard

**URL:** http://localhost:5173 (or http://192.168.0.198:5173 from local network)

**Note:** Dashboard is local network only - not exposed to the internet.

## Starting the Dashboard

### Production Mode

The dashboard runs via Vite dev server:

```bash
cd /home/reggie/reggie-homebase
npm run dev
```

### Development Mode

Same command - Vite provides hot module replacement.

## Interface Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    REGGIE DASHBOARD                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────┐  ┌─────────────────┐  │
│  │                                  │  │  Robot State    │  │
│  │         CAMERA FEED              │  │                 │  │
│  │                                  │  │  • Connection   │  │
│  │    [Live WebRTC Stream]          │  │  • Daemon       │  │
│  │                                  │  │  • Battery      │  │
│  │                                  │  │                 │  │
│  └──────────────────────────────────┘  └─────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  MOTION CONTROLS                      │   │
│  │                                                       │   │
│  │  Head Pose    Body Yaw    Antennas    Joystick       │   │
│  │  [Sliders]    [Slider]    [Toggles]   [Virtual]      │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌────────────────────┐  ┌─────────────────────────────┐   │
│  │   Daemon Toggle    │  │     Connection Status        │   │
│  │   [Start/Stop]     │  │     [Connected/Error]        │   │
│  └────────────────────┘  └─────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Camera Feed

### Status Indicators

| Status | Meaning |
|--------|---------|
| **Connecting...** | Establishing WebRTC connection |
| **Connected** | Live stream active |
| **Waiting for producer...** | GStreamer pipeline not ready |
| **Retrying (1/5)...** | Connection failed, retrying |
| **Auto-recovery...** | Restarting daemon |
| **Error** | Connection failed |

### Auto-Recovery

When the camera fails to connect:

1. **5 retries** - Attempts to reconnect every 3 seconds
2. **Auto-recovery** - If retries fail, restarts the robot daemon
3. **Wait 10 seconds** - For daemon to fully initialize
4. **Reconnect** - Attempts camera connection again

### Manual Recovery

If auto-recovery fails, click **"Repair Camera"** button:
- Restarts robot daemon via SSH
- Waits for initialization
- Reconnects camera

### Health Monitoring

Every 5 seconds, the dashboard checks:
- WebRTC connection state
- Video track health
- Signaling connection

If unhealthy, triggers recovery automatically.

## Motion Controls

### Head Pose Sliders

Control the robot head orientation:

| Axis | Range | Description |
|------|-------|-------------|
| Roll | -45° to +45° | Tilt left/right |
| Pitch | -45° to +45° | Look up/down |
| Yaw | -45° to +45° | Turn left/right |

### Body Yaw Control

Single slider to rotate the robot body left/right.

### Antenna Controls

Toggle controls for left and right antennas:
- **Up** - Antenna raised
- **Down** - Antenna lowered
- **Wave** - Animated wave motion

### Virtual Joystick

Touch/mouse joystick for intuitive control:
- **Forward/Back** - Move head up/down
- **Left/Right** - Turn head left/right

## Daemon Toggle

Start or stop the robot daemon:

| Button | Action |
|--------|--------|
| **Start** | `POST /robot/start-daemon` |
| **Stop** | Stops motion daemon |

**Warning:** Stopping daemon will disable all robot motion and camera.

## Connection Status Panel

Shows current connection states:

| Indicator | Meaning |
|-----------|---------|
| **Backend** | Connection to localhost:3001 |
| **Robot SSH** | SSH connection to robot |
| **Daemon** | Robot daemon running state |
| **Camera** | WebRTC stream state |

## Volume Control

Adjust robot speaker volume (if enabled).

## Keyboard Shortcuts

Currently none - all controls are mouse/touch based.

## Troubleshooting

### Camera Shows Black

1. Check daemon is running (green indicator)
2. Click "Repair Camera" button
3. See [Camera Troubleshooting](camera_troubleshooting.md)

### Controls Not Responding

1. Check "Backend" connection indicator
2. Check "Robot SSH" connection indicator
3. Verify robot is powered on

### Dashboard Won't Load

```bash
# Check Vite dev server
cd /home/reggie/reggie-homebase
npm run dev

# Should show: Local: http://localhost:5173
```

### Slow/Choppy Video

- Reduce network traffic
- Check robot WiFi signal
- Use wired Ethernet if possible

---

*See also: [Camera Troubleshooting](camera_troubleshooting.md) for detailed camera issues*
