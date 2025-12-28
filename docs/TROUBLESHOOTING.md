# Troubleshooting Guide

Quick fixes for common issues with Reggie Homebase.

## Quick Diagnostics

Run this first to understand system state:

```bash
# Check all services
systemctl status reggie-server reggie-ngrok

# Check health endpoint
curl http://localhost:3001/health

# Check public URL
curl https://uncontrovertedly-dynastic-imelda.ngrok-free.dev/health

# Check robot SSH
curl http://localhost:3001/robot/ssh-status
```

---

## SMS Issues

### SMS not being received

**Symptoms:** You text Reggie's number, no response.

**Check:**
```bash
# 1. Is server running?
systemctl status reggie-server

# 2. Is ngrok running?
systemctl status reggie-ngrok

# 3. Check server logs for incoming SMS
journalctl -u reggie-server -n 50 | grep SMS
```

**Common fixes:**
- Restart services: `sudo systemctl restart reggie-server reggie-ngrok`
- Verify Twilio webhook URL in console
- Check you're texting from owner phone number

### SMS rejected (non-owner)

**Expected behavior:** Non-owner SMS are silently rejected.

**Check audit log:**
```bash
tail -20 /home/reggie/reggie-homebase/server/logs/audit.log | grep sms_rejected
```

### Claude AI not responding

**Symptoms:** SMS received but no AI response.

**Check:**
```bash
# Check for Claude errors
journalctl -u reggie-server -n 100 | grep -i "claude\|anthropic\|error"
```

**Common fixes:**
- Verify `ANTHROPIC_API_KEY` in `.env`
- Check Anthropic API status

---

## Voice Call Issues

### Calls go straight to error

**Check:**
```bash
journalctl -u reggie-server -n 50 | grep Voice
```

**Common fixes:**
- Verify Twilio voice webhook URL
- Restart services

### Voicemail not being transcribed

**Symptoms:** Leave voicemail but no SMS response.

**Check:**
```bash
journalctl -u reggie-server -n 100 | grep -i transcription
```

---

## Service Issues

### Services won't start

```bash
# Check detailed status
systemctl status reggie-server --no-pager

# Check logs for error
journalctl -u reggie-server -n 100 --no-pager
```

**Common causes:**
- Port 3001 in use: `pkill -f "node.*3001"`
- Build outdated: `cd server && npm run build`
- Missing .env file

### Service restart loop

**Symptoms:** Service starts, crashes, restarts repeatedly.

```bash
# Check restart count
systemctl show reggie-server --property=NRestarts

# View crash logs
journalctl -u reggie-server --since "10 minutes ago"

# Reset and try again
sudo systemctl reset-failed reggie-server
sudo systemctl start reggie-server
```

### ngrok won't connect

```bash
# Check ngrok status
systemctl status reggie-ngrok

# Check if server health endpoint works
curl http://localhost:3001/health

# Check ngrok auth
ngrok config check
```

**Common fixes:**
- Restart server first (ngrok depends on it)
- Check internet connection
- Verify ngrok auth token

---

## Camera Issues

### Camera shows "Waiting for producer..."

**Cause:** GStreamer pipeline not started on robot.

**Fix:**
```bash
# Restart robot daemon
curl -X POST http://localhost:3001/robot/restart-daemon

# Wait 10 seconds, then refresh dashboard
```

### Camera connection fails repeatedly

**Check robot status:**
```bash
curl http://localhost:3001/robot/daemon-status
```

**Check SSH connection:**
```bash
curl http://localhost:3001/robot/ssh-status
```

**Nuclear option:**
1. Click "Repair Camera" in dashboard
2. If that fails, SSH to robot and restart daemon manually

See [Camera Troubleshooting](camera_troubleshooting.md) for detailed steps.

---

## Robot Issues

### Robot not responding to controls

**Check:**
```bash
# SSH connection
curl http://localhost:3001/robot/ssh-status

# Daemon status
curl http://localhost:3001/robot/daemon-status
```

**Common fixes:**
- Restart daemon: `curl -X POST http://localhost:3001/robot/restart-daemon`
- Check robot is powered on
- Check network connection to robot

### SSH connection failing

**Check robot is reachable:**
```bash
ping 192.168.0.108
```

**Test SSH manually:**
```bash
ssh reachy@192.168.0.108
```

---

## Log Locations

| Log | Location | Command |
|-----|----------|---------|
| Server (systemd) | journald | `journalctl -u reggie-server -f` |
| ngrok (systemd) | journald | `journalctl -u reggie-ngrok -f` |
| Audit log | File | `tail -f server/logs/audit.log` |

---

## Diagnostic Commands

### Full system check
```bash
echo "=== Services ===" && \
systemctl status reggie-server reggie-ngrok --no-pager && \
echo "" && \
echo "=== Health ===" && \
curl -s http://localhost:3001/health | jq . && \
echo "" && \
echo "=== Robot SSH ===" && \
curl -s http://localhost:3001/robot/ssh-status | jq . && \
echo "" && \
echo "=== Public URL ===" && \
curl -s https://uncontrovertedly-dynastic-imelda.ngrok-free.dev/health | jq .
```

### View recent errors
```bash
journalctl -u reggie-server --since "1 hour ago" --priority=err
```

### View all activity
```bash
journalctl -u reggie-server -u reggie-ngrok -f
```

---

## Nuclear Option: Full Restart

When all else fails:

```bash
# 1. Stop everything
sudo systemctl stop reggie-server reggie-ngrok

# 2. Kill any orphan processes
pkill -f "node.*reggie"
pkill -f ngrok

# 3. Rebuild server
cd /home/reggie/reggie-homebase/server
npm run build

# 4. Start services
sudo systemctl start reggie-server reggie-ngrok

# 5. Verify
systemctl status reggie-server reggie-ngrok
curl http://localhost:3001/health
```

---

## Getting Help

1. Check this troubleshooting guide
2. Review relevant documentation:
   - [Services](SERVICES.md) for systemd issues
   - [Security](SECURITY.md) for access issues
   - [Camera Troubleshooting](camera_troubleshooting.md) for camera issues
3. Check logs for specific error messages
4. File an issue with logs attached

---

*Last resort: Reboot the entire computer and let systemd restart services automatically.*
