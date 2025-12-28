# Systemd Services Management

Reggie runs as two systemd services that start automatically on boot and restart on failure.

## Services Overview

| Service | Description | Port |
|---------|-------------|------|
| `reggie-server` | Express webhook server | 3001 |
| `reggie-ngrok` | ngrok tunnel to expose webhooks | - |

**Dependency:** ngrok depends on server (won't start until server is healthy)

## Service Files

Located in `/etc/systemd/system/`:

- `reggie-server.service` - Node.js webhook server
- `reggie-ngrok.service` - ngrok tunnel with health check

Source copies in `/home/reggie/reggie-homebase/server/`:

- `reggie-server.service`
- `reggie-ngrok.service`

## Quick Reference

### Check Status

```bash
# Both services
systemctl status reggie-server reggie-ngrok

# Just server
systemctl status reggie-server

# Just ngrok
systemctl status reggie-ngrok
```

### View Logs

```bash
# Server logs (live)
journalctl -u reggie-server -f

# ngrok logs (live)
journalctl -u reggie-ngrok -f

# Last 100 lines
journalctl -u reggie-server -n 100

# Since last boot
journalctl -u reggie-server -b

# Last hour
journalctl -u reggie-server --since "1 hour ago"
```

### Start/Stop/Restart

```bash
# Start both
sudo systemctl start reggie-server reggie-ngrok

# Stop both
sudo systemctl stop reggie-server reggie-ngrok

# Restart both
sudo systemctl restart reggie-server reggie-ngrok

# Restart just server (ngrok will also restart due to dependency)
sudo systemctl restart reggie-server
```

### Enable/Disable on Boot

```bash
# Enable (start on boot)
sudo systemctl enable reggie-server reggie-ngrok

# Disable (don't start on boot)
sudo systemctl disable reggie-server reggie-ngrok

# Check if enabled
systemctl is-enabled reggie-server reggie-ngrok
```

## Development Workflow

When you need to work on the server code:

```bash
# 1. Stop production services
sudo systemctl stop reggie-server reggie-ngrok

# 2. Run development server (with hot reload)
cd /home/reggie/reggie-homebase/server
npm run dev

# 3. When done, rebuild for production
npm run build

# 4. Restart production services
sudo systemctl start reggie-server reggie-ngrok
```

## How It Works

### reggie-server.service

```ini
[Unit]
Description=Reggie Twilio Webhook Server
After=network-online.target

[Service]
Type=simple
User=reggie
WorkingDirectory=/home/reggie/reggie-homebase/server
Environment="PATH=/home/reggie/.nvm/versions/node/v22.21.1/bin:..."
ExecStart=/home/reggie/.nvm/versions/node/v22.21.1/bin/node dist/index.js
Restart=always
RestartSec=5
StartLimitBurst=5

[Install]
WantedBy=multi-user.target
```

**Key features:**
- Runs as user `reggie`
- Uses nvm's Node.js directly (full path)
- Restarts within 5 seconds on crash
- Max 5 restarts per 60 seconds (prevents infinite loops)

### reggie-ngrok.service

```ini
[Unit]
Description=ngrok tunnel for Reggie webhooks
After=network-online.target reggie-server.service
Requires=reggie-server.service

[Service]
Type=simple
User=reggie
ExecStartPre=/bin/bash -c 'for i in {1..30}; do curl -sf http://localhost:3001/health && exit 0; sleep 1; done; exit 1'
ExecStart=/snap/bin/ngrok http 3001 --domain=uncontrovertedly-dynastic-imelda.ngrok-free.dev
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Key features:**
- Depends on `reggie-server.service`
- Waits up to 30 seconds for health endpoint before starting
- Uses static ngrok domain (URL never changes)
- Restarts within 10 seconds on crash

## Troubleshooting

### Service Won't Start

```bash
# Check what went wrong
journalctl -u reggie-server -n 50 --no-pager

# Common issues:
# - Port 3001 in use: pkill -f "node.*3001"
# - Missing .env: check /home/reggie/reggie-homebase/server/.env
# - Build outdated: cd server && npm run build
```

### Service in Restart Loop

```bash
# Check failure count
systemctl show reggie-server --property=NRestarts

# View recent failures
journalctl -u reggie-server --since "10 minutes ago"

# Reset failure counter and restart
sudo systemctl reset-failed reggie-server
sudo systemctl start reggie-server
```

### ngrok Won't Connect

```bash
# Check if server is actually running
curl http://localhost:3001/health

# Check ngrok logs
journalctl -u reggie-ngrok -n 50

# Verify ngrok auth
ngrok config check
```

### After Code Changes

```bash
# Rebuild the server
cd /home/reggie/reggie-homebase/server
npm run build

# Restart to pick up changes
sudo systemctl restart reggie-server
```

## Verification Checklist

After starting services, verify:

```bash
# 1. Services are running
systemctl status reggie-server reggie-ngrok

# 2. Local health check works
curl http://localhost:3001/health

# 3. Public URL works
curl https://uncontrovertedly-dynastic-imelda.ngrok-free.dev/health

# 4. Send test SMS to verify full flow
```

## URLs

| URL | Description |
|-----|-------------|
| `http://localhost:3001` | Local server |
| `http://localhost:3001/health` | Health check endpoint |
| `https://uncontrovertedly-dynastic-imelda.ngrok-free.dev` | Public ngrok URL |

## Auto-Recovery Behavior

| Event | Response |
|-------|----------|
| Server crashes | Restarts in 5 seconds |
| ngrok crashes | Restarts in 10 seconds |
| 5+ crashes in 60 seconds | Stops retrying (check logs) |
| Computer reboots | Both services start automatically |
| Network drops | ngrok reconnects when network returns |

---

*See also: [Troubleshooting](TROUBLESHOOTING.md) for more diagnostic steps*
