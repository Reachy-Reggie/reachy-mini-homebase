# Reachy Mini Camera Streaming Troubleshooting Guide

## Overview

This document details the camera streaming architecture for Reachy Mini and comprehensive troubleshooting steps for when the camera feed doesn't work in the dashboard.

---

## Field Investigation Log (2025-12-23)

This section captures a real troubleshooting session so future debugging can reuse the exact findings and steps.

### Observed Symptoms (Dashboard)

- State WebSocket failed: `ws://192.168.0.11:8000/api/state/ws/full?frequency=30` connection error.
- Camera signaling connected to `ws://192.168.0.11:8443`, but producer list was empty.

Console excerpts:
```
useWebSocket.ts:93 WebSocket connection to 'ws://192.168.0.11:8000/api/state/ws/full?frequency=30' failed
[Camera] WebSocket connected!
[Camera] Received message type: list
[Camera] Available producers: []
[Camera] No "reachymini" producer found
```

### Robot Status (v1.2.3, before update)

Repeated `/api/daemon/status` showed:
```
"state": "running"
"stream_enabled": true
"backend_status": {
  "ready": false,
  "last_alive": null,
  "control_loop_stats": { "mean_control_loop_frequency": ~49 Hz }
}
```

Interpretation:
- The daemon was running and stream was enabled, but `backend_status.ready` never flipped and `last_alive` stayed null.
- Per the code path in this doc, WebRTC pipeline never starts unless `backend.ready` is true, so producers remain empty.

### Actions Tried (v1.2.3)

1. Start daemon when `not_initialized`
```
curl -X POST "http://localhost:8000/api/daemon/start?wake_up=true"
```
Result: daemon moved to `running` but `backend_status.ready` stayed false.

2. Verify serial device and permissions
```
ls -la /dev/ttyAMA3
```
Result: `/dev/ttyAMA3` exists, `root:dialout`. Service user `pollen` is in `dialout`.

3. Logs (filtered)
```
journalctl -u reachy-mini-daemon -n 200 --no-pager | grep -i "error\|fail\|exception\|backend\|motor"
```
Result: only INFO lines (PID gains set, signaling server pings); no errors surfaced.

4. WebRTC producer check
- Signaling server reachable.
- Producer list empty -> pipeline not started.

### Update Performed (v1.2.4 via web GUI)

After the web GUI update to `1.2.4`, the daemon started in an error state:
```
"state": "error"
"backend_status": {
  "ready": false,
  "motor_control_mode": "disabled",
  "last_alive": null,
  "control_loop_stats": {}
}
```

Interpretation:
- This is a regression vs the previous state (control loop stats were present in v1.2.3).
- The camera cannot stream because the backend never initializes.

### Important Notes

- `launcher.sh` includes `--no-autostart`, so `state: "not_initialized"` is expected until `/api/daemon/start` is called.
- Running `curl` from a different machine against `localhost` will fail; use the robot IP or SSH into the robot first.

### Next Steps (when resuming)

- Capture full error output:
  - `sudo systemctl status reachy-mini-daemon --no-pager -l`
  - `journalctl -u reachy-mini-daemon -n 200 --no-pager`
- Confirm runtime package path/version:
```
/venvs/mini_daemon/bin/python - <<'PY'
import reachy_mini, importlib.metadata as md
print("file:", reachy_mini.__file__)
print("version:", md.version("reachy_mini"))
PY
```
- If v1.2.4 is broken, consider rolling back to v1.2.3 (known "ready flag" issue) or testing v1.2.5rc2.
- Once backend is ready, re-check producer list; the camera will only connect when a `reachymini` producer appears.

## Architecture

### How Camera Streaming Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DASHBOARD (Browser)                          │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  CameraFeed.tsx                                                  │ │
│  │  - Connects to ws://ROBOT_IP:8443 (signaling server)            │ │
│  │  - Requests producer list                                        │ │
│  │  - Looks for producer with meta.name === "reachymini"           │ │
│  │  - Initiates WebRTC session with producer                       │ │
│  │  - Receives H.264 video stream                                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                         WebSocket (port 8443)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         REACHY MINI ROBOT                            │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Signaling Server (port 8443)                                    │ │
│  │  - Part of GStreamer webrtcsink                                  │ │
│  │  - Manages WebRTC session negotiation                            │ │
│  │  - Returns list of available producers                           │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                    │                                  │
│                         (if backend ready)                            │
│                                    │                                  │
│                                    ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  GStreamer WebRTC Pipeline                                       │ │
│  │  libcamerasrc → v4l2h264enc → webrtcsink                        │ │
│  │  - Captures from Raspberry Pi camera                             │ │
│  │  - Encodes to H.264                                              │ │
│  │  - Streams via WebRTC                                            │ │
│  │  - Registers as producer "reachymini"                            │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                    │                                  │
│                         (depends on)                                  │
│                                    │                                  │
│                                    ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Motor Backend                                                    │ │
│  │  - Must be ready before WebRTC starts                            │ │
│  │  - Controls head, antennas, body                                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Files on Robot

| Path | Purpose |
|------|---------|
| `/venvs/src/reachy_mini/src/reachy_mini/daemon/daemon.py` | Main daemon logic |
| `/venvs/src/reachy_mini/src/reachy_mini/media/webrtc_daemon.py` | GStreamer WebRTC pipeline |
| `/venvs/src/reachy_mini/src/reachy_mini/media/camera_gstreamer.py` | Camera capture |

### Key Files in Dashboard

| Path | Purpose |
|------|---------|
| `src/components/camera/CameraFeed.tsx` | WebRTC client component |
| `src/config/api.ts` | Robot IP configuration |

---

## Common Error: "No reachymini producer found"

### Symptom

Dashboard shows: `Camera stream not available - ensure daemon started with --stream`

Browser console shows:
```
[Camera] Available producers: []
[Camera] No "reachymini" producer found
```

### Root Cause

The GStreamer WebRTC pipeline is not running. This happens because:

1. **The daemon runs with `--no-autostart`** - Backend doesn't start automatically
2. **WebRTC depends on backend readiness** - Pipeline only starts after `backend.ready = true`
3. **Backend not ready** - Motor backend failed to initialize

### Critical Code Path

From `/venvs/src/reachy_mini/src/reachy_mini/daemon/daemon.py`:

```python
# WebRTC is created in __init__ (signaling server starts here)
if wireless_version:
    self._webrtc = GstWebRTC(log_level)

# But pipeline only starts in daemon.start() AFTER backend is ready
async def start(self, ...):
    # ... backend setup ...

    if not self.backend.ready.wait(timeout=2.0):
        # ERROR - backend not ready, WebRTC won't start
        return DaemonState.ERROR

    # Only reaches here if backend ready
    if self._webrtc:
        self._webrtc.start()  # GStreamer pipeline starts here
```

---

## Diagnostic Steps

### Step 1: Check Dashboard Console

Open browser developer tools (F12) and look for camera-related messages:

```
[Camera] Starting connection to: ws://192.168.0.11:8443
[Camera] WebSocket connected!
[Camera] Received message type: list
[Camera] Available producers: []        ← Problem: empty list
```

### Step 2: Verify Signaling Server Running

From your local machine:
```bash
python3 -c "
import asyncio
import websockets
import json

async def check():
    async with websockets.connect('ws://192.168.0.11:8443') as ws:
        msg = await ws.recv()
        print('Connected! Welcome:', json.loads(msg))

asyncio.run(check())
"
```

Expected: Should connect successfully (signaling server is running)

### Step 3: Check Producers List

```bash
python3 -c "
import asyncio, websockets, json
async def check():
    async with websockets.connect('ws://192.168.0.11:8443') as ws:
        await ws.recv()  # welcome
        await ws.send(json.dumps({'type':'setPeerStatus','roles':['listener'],'meta':{}}))
        await ws.send(json.dumps({'type':'list'}))
        for _ in range(2):
            msg = await ws.recv()
            data = json.loads(msg)
            if data.get('type') == 'list':
                print('Producers:', data.get('producers', []))
asyncio.run(check())
"
```

- **Empty list `[]`**: GStreamer pipeline not running
- **Contains `reachymini`**: Pipeline running, check browser WebRTC

### Step 4: SSH to Robot and Check Daemon Status

```bash
ssh pollen@192.168.0.11
# or
ssh pollen@reachy-mini.local

curl -s http://localhost:8000/api/daemon/status | python3 -m json.tool
```

**Key fields to check:**

| Field | Good Value | Problem Value |
|-------|------------|---------------|
| `state` | `"running"` | `"not_initialized"`, `"error"` |
| `backend_status.ready` | `true` | `false` or `null` |
| `backend_status.last_alive` | timestamp | `null` |
| `stream_enabled` | `true` | `false` |

### Step 5: Check GStreamer Process

```bash
ps aux | grep -i gst
```

- **GStreamer process visible**: Pipeline running
- **Only grep visible**: Pipeline NOT running

### Step 6: Check Daemon Logs

```bash
# Recent logs
journalctl -u reachy-mini-daemon -n 100 --no-pager | grep -v "HTTP/1.1"

# Filter for errors
journalctl -u reachy-mini-daemon -n 200 | grep -i "error\|fail\|exception"

# Filter for streaming/camera
journalctl -u reachy-mini-daemon -n 200 | grep -i "webrtc\|gst\|camera\|stream"
```

### Step 7: Check GStreamer Plugins

```bash
# Check webrtcsink plugin
gst-inspect-1.0 webrtcsink

# Check camera source
gst-inspect-1.0 libcamerasrc
```

Both should show detailed plugin information, not errors.

### Step 8: Check Camera Hardware

```bash
# List video devices
ls -la /dev/video*

# Check libcamera detection
libcamera-hello --list-cameras
```

### Step 9: Check Serial Port (for motors)

```bash
# List serial devices
ls -la /dev/ttyACM* /dev/ttyUSB* 2>/dev/null

# List USB devices
lsusb
```

---

## Fixes

### Fix 1: Start the Daemon Backend

If daemon shows `state: "not_initialized"`:

```bash
curl -X POST "http://localhost:8000/api/daemon/start?wake_up=true"
sleep 15
curl -s http://localhost:8000/api/daemon/status | python3 -m json.tool
```

### Fix 2: Restart Daemon Service

```bash
sudo systemctl restart reachy-mini-daemon
sleep 15
curl -s http://localhost:8000/api/daemon/status | python3 -m json.tool
```

### Fix 3: Reboot Robot

If permission issues or stuck state:

```bash
sudo reboot
```

### Fix 4: Check Physical Connections

1. **Camera ribbon cable** - Connected securely to Raspberry Pi
2. **Motor controller** - USB or internal connection intact
3. **Power** - Sufficient power for all components

---

## Technical Details

### WebRTC Signaling Protocol

The dashboard uses GStreamer webrtcsink's signaling protocol:

1. **Connect** to `ws://ROBOT_IP:8443`
2. **Receive** `welcome` message with peer ID
3. **Send** `setPeerStatus` with `roles: ["listener"]`
4. **Send** `list` to get available producers
5. **Receive** `list` response with producers array
6. **Send** `startSession` with producer ID
7. **Exchange** SDP offer/answer
8. **Exchange** ICE candidates
9. **Receive** video stream

### Producer Registration

From `/venvs/src/reachy_mini/src/reachy_mini/media/webrtc_daemon.py`:

```python
def _configure_webrtc(self, pipeline):
    webrtcsink = Gst.ElementFactory.make("webrtcsink")

    meta_structure = Gst.Structure.new_empty("meta")
    meta_structure.set_value("name", "reachymini")  # Producer name
    webrtcsink.set_property("meta", meta_structure)
    webrtcsink.set_property("run-signalling-server", True)  # Port 8443
```

### Video Pipeline

```
libcamerasrc (Raspberry Pi camera)
    ↓
capsfilter (1280x720, 30fps, YUY2)
    ↓
queue
    ↓
v4l2h264enc (H.264 hardware encoder)
    ↓
capsfilter (H.264 stream)
    ↓
webrtcsink (WebRTC output)
```

---

## Known Issues

### Issue: Backend Ready = False Despite Working Motors

**Observed behavior:**
- `backend_status.ready: false`
- `backend_status.last_alive: null`
- But motors respond to commands
- Control loop stats show activity

**Possible cause:**
- Ready flag not being set properly
- Race condition in backend initialization

**Workaround:**
- Restart daemon service
- Check if this is fixed in newer reachy_mini versions

### Issue: No Serial Port Detected

**Observed behavior:**
- `ls /dev/ttyACM* /dev/ttyUSB*` returns empty
- But motors still work

**Explanation:**
- On wireless Reachy Mini, motor controller may use internal connection (not USB serial)
- Serial port detection may not be relevant for all configurations

---

## Environment Information

### Robot Details
- **Platform**: Raspberry Pi 4
- **OS**: Raspberry Pi OS
- **Python**: 3.12
- **Daemon version**: 1.2.3
- **GStreamer webrtcsink**: 0.15.0-alpha.1

### Required Components
- `gst-plugins-rs` (webrtcsink, webrtcsrc)
- `libcamera` and `gst-libcamera`
- `v4l2h264enc` (hardware encoder)

### Ports Used
| Port | Service |
|------|---------|
| 8000 | Daemon REST API |
| 8443 | WebRTC signaling server |

---

## References

- [Pollen Robotics reachy_mini repo](https://github.com/pollen-robotics/reachy_mini)
- [Pollen Robotics gstreamer_webrtc](https://github.com/pollen-robotics/gstreamer_webrtc)
- [GStreamer webrtcsink documentation](https://gstreamer.freedesktop.org/documentation/rswebrtc/webrtcsink.html)

---

## Changelog

- **2024-12-23**: Initial documentation based on troubleshooting session
