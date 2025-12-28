// Reggie Twilio Webhook Server
// Handles incoming SMS and voice calls from Twilio

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { CONFIG, validateConfig, isElevenLabsConfigured } from './config.js';
import { smsRouter } from './routes/sms.js';
import { voiceRouter } from './routes/voice.js';
import { robotRouter } from './routes/robot.js';
import { memoryRouter } from './routes/memory.js';
import { memoryStore } from './services/memoryStore.js';

// Validate configuration
const configValidation = validateConfig();
if (!configValidation.valid) {
  console.error('Missing required configuration:');
  configValidation.missing.forEach((key) => console.error(`  - ${key}`));
  console.error('\nPlease set these environment variables in .env');
  process.exit(1);
}

const app = express();

// Trust proxy (required for ngrok/reverse proxy with express-rate-limit)
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for TwiML responses
  })
);

// CORS configuration - allow local network access for robot control
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow localhost and local network (192.168.x.x)
      if (origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.match(/^https?:\/\/192\.168\.\d+\.\d+/)) {
        return callback(null, true);
      }

      // Allow configured dashboard URL
      if (origin === CONFIG.dashboardUrl) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  })
);

// Rate limiting (generous for local development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per window
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // Don't rate limit health checks
});
app.use(limiter);

// Body parsing - Twilio sends form-urlencoded data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============ Routes ============

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = memoryStore.getStats();
  res.json({
    status: 'ok',
    service: 'reggie-twilio-server',
    memory: stats,
    timestamp: new Date().toISOString(),
  });
});

// Twilio webhook routes
app.use('/sms', smsRouter);
app.use('/voice', voiceRouter);

// Robot management routes
app.use('/robot', robotRouter);

// Memory API routes (personality, contacts, conversations)
app.use('/api/memory', memoryRouter);

// 404 handler
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[Error]', err);
    res.status(500).json({
      error: CONFIG.isDevelopment ? err.message : 'Internal server error',
    });
  }
);

// ============ Server Startup ============

// Create HTTP server
const server = createServer(app);

// Note: WebSocket handling for Twilio Media Streams has been removed.
// ElevenLabs now handles all audio bridging internally via their registerCall API.

server.listen(CONFIG.port, () => {
  console.log('');
  console.log('=========================================');
  console.log('  Reggie Twilio Webhook Server');
  console.log('=========================================');
  console.log('');
  console.log(`  Port:        ${CONFIG.port}`);
  console.log(`  Environment: ${CONFIG.nodeEnv}`);
  console.log(`  Phone:       ${CONFIG.twilio.phoneNumber}`);
  console.log('');
  console.log('  Webhook Endpoints:');
  console.log(`    SMS:   http://localhost:${CONFIG.port}/sms/incoming`);
  console.log(`    Voice: http://localhost:${CONFIG.port}/voice/incoming`);
  console.log('');

  // ElevenLabs status
  if (isElevenLabsConfigured()) {
    console.log('  Real-time Voice: ENABLED (ElevenLabs)');
  } else {
    console.log('  Real-time Voice: DISABLED (voicemail mode)');
    console.log('    To enable, set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID');
  }
  console.log('');

  if (!CONFIG.webhookBaseUrl) {
    console.log('  [!] WEBHOOK_BASE_URL not set');
    console.log('      For Twilio to reach this server, you need:');
    console.log('      1. Port forwarding + static IP, or');
    console.log('      2. ngrok: ngrok http 3001');
    console.log('      3. Cloudflare Tunnel');
    console.log('');
    console.log('      Then update WEBHOOK_BASE_URL in .env');
    console.log('');
  } else {
    console.log(`  Public URL: ${CONFIG.webhookBaseUrl}`);
    console.log('');
    console.log('  Configure these in Twilio Console:');
    console.log(`    SMS Webhook:   ${CONFIG.webhookBaseUrl}/sms/incoming`);
    console.log(`    Voice Webhook: ${CONFIG.webhookBaseUrl}/voice/incoming`);
    console.log('');
  }

  const stats = memoryStore.getStats();
  console.log(`  Memory: ${stats.contacts} contacts, ${stats.conversations} conversations`);
  console.log('');
  console.log('=========================================');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  server.close(() => {
    memoryStore.close();
    console.log('[Server] Closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...');
  server.close(() => {
    memoryStore.close();
    console.log('[Server] Closed');
    process.exit(0);
  });
});
