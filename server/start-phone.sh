#!/bin/bash
# Start Reggie's phone services (webhook server + ngrok)

echo "Starting Reggie Phone Services..."
echo ""

# Check if server is already running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "[OK] Webhook server already running on port 3001"
else
    echo "[..] Starting webhook server..."
    cd ~/reggie-homebase/server
    npm run dev &
    sleep 3
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "[OK] Webhook server started"
    else
        echo "[!!] Failed to start webhook server"
        exit 1
    fi
fi

# Check if ngrok is already running
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$NGROK_URL" ]; then
    echo "[OK] ngrok already running: $NGROK_URL"
else
    echo "[..] Starting ngrok..."
    ngrok http 3001 > /dev/null &
    sleep 3
    NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$NGROK_URL" ]; then
        echo "[OK] ngrok started: $NGROK_URL"
    else
        echo "[!!] Failed to start ngrok"
        exit 1
    fi
fi

echo ""
echo "==========================================="
echo "  Reggie Phone Services Running"
echo "==========================================="
echo ""
echo "  Phone Number: +16122559398"
echo "  ngrok URL:    $NGROK_URL"
echo ""
echo "  Twilio Webhook URLs:"
echo "    Voice: ${NGROK_URL}/voice/incoming"
echo "    SMS:   ${NGROK_URL}/sms/incoming"
echo ""
echo "  Inspect requests: http://127.0.0.1:4040"
echo ""
echo "==========================================="
