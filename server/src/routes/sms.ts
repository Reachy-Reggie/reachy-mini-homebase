// SMS Webhook Routes
// Handles incoming SMS from Twilio

import { Router, Request, Response, NextFunction } from 'express';
import twilio from 'twilio';
import { processIncomingMessage } from '../services/claudeProcessor.js';
import { CONFIG } from '../config.js';
import { auditLog } from '../services/auditLog.js';
import { memoryStore } from '../services/memoryStore.js';

// Get the robot's name from personality settings
function getRobotName(): string {
  const personality = memoryStore.getPersonality();
  return personality.name || 'your robot assistant';
}

// Check if sender is the owner
function isOwner(from: string): boolean {
  const normalize = (phone: string) => phone.replace(/[^\d+]/g, '');
  return normalize(from) === normalize(CONFIG.ownerPhoneNumber);
}

const router = Router();
const { MessagingResponse } = twilio.twiml;

// Type for Twilio webhook body
interface TwilioSMSWebhook {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
}

interface TwilioStatusWebhook {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

// Middleware to validate Twilio request signature
const validateTwilioRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip validation in development mode
  if (CONFIG.isDevelopment && !CONFIG.webhookBaseUrl) {
    console.log('[Dev Mode] Skipping Twilio signature validation');
    next();
    return;
  }

  const twilioSignature = req.headers['x-twilio-signature'] as string;
  const url = `${CONFIG.webhookBaseUrl}${req.originalUrl}`;

  const isValid = twilio.validateRequest(
    CONFIG.twilio.authToken,
    twilioSignature,
    url,
    req.body
  );

  if (isValid) {
    next();
  } else {
    console.warn('Invalid Twilio signature from:', req.ip);
    res.status(403).send('Forbidden: Invalid signature');
  }
};

// Incoming SMS webhook
router.post(
  '/incoming',
  validateTwilioRequest,
  async (req: Request, res: Response): Promise<void> => {
    const { From, Body, MessageSid } = req.body as TwilioSMSWebhook;

    console.log(`[SMS] Incoming from ${From}: ${Body}`);

    const twiml = new MessagingResponse();

    // Security: Only process messages from owner
    if (!isOwner(From)) {
      console.warn(`[SMS] BLOCKED - Message from non-owner: ${From}`);

      // Log the rejected attempt (will notify owner)
      await auditLog(
        'sms_rejected',
        { from: From, body: Body?.slice(0, 50), messageId: MessageSid },
        'sms'
      );

      // Return empty response (don't reveal we're filtering)
      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }

    // Log valid incoming message
    await auditLog(
      'sms_received',
      { from: From, bodyLength: Body?.length || 0 },
      'sms'
    );

    try {
      // Process message with Claude to generate response
      const result = await processIncomingMessage({
        from: From,
        body: Body,
        channel: 'sms',
        messageId: MessageSid,
      });

      console.log(`[SMS] Response to ${From}: ${result.response}`);

      // Add response message
      twiml.message(result.response);
    } catch (error) {
      console.error('[SMS] Error processing message:', error);

      // Send error response
      twiml.message(
        `I'm having a robot moment! Please try again in a bit. - ${getRobotName()}`
      );
    }

    res.type('text/xml');
    res.send(twiml.toString());
  }
);

// Status callback for sent messages
router.post(
  '/status',
  (req: Request, res: Response): void => {
    const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } =
      req.body as TwilioStatusWebhook;

    if (ErrorCode) {
      console.error(
        `[SMS Status] ${MessageSid} to ${To}: ${MessageStatus} - Error ${ErrorCode}: ${ErrorMessage}`
      );
    } else {
      console.log(`[SMS Status] ${MessageSid} to ${To}: ${MessageStatus}`);
    }

    res.sendStatus(200);
  }
);

// Fallback webhook (used if no SMS URL is set)
router.post(
  '/fallback',
  (req: Request, res: Response): void => {
    console.error('[SMS Fallback] Triggered - check primary webhook');

    const twiml = new MessagingResponse();
    twiml.message(`${getRobotName()} is experiencing technical difficulties. Please try again later.`);

    res.type('text/xml');
    res.send(twiml.toString());
  }
);

export { router as smsRouter };
