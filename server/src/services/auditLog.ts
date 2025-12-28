// Audit Logging Service
// Logs security-sensitive actions and optionally notifies owner

import fs from 'fs';
import path from 'path';
import twilio from 'twilio';
import { CONFIG, isTwilioConfigured } from '../config.js';

// Audit log file location
const AUDIT_LOG_DIR = path.join(process.cwd(), 'logs');
const AUDIT_LOG_FILE = path.join(AUDIT_LOG_DIR, 'audit.log');

// Ensure log directory exists
if (!fs.existsSync(AUDIT_LOG_DIR)) {
  fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true });
}

export type AuditSource = 'sms' | 'voice' | 'web' | 'robot';

export interface AuditEntry {
  timestamp: string;
  action: string;
  source: AuditSource;
  details: Record<string, unknown>;
  notified: boolean;
}

// Actions that should trigger owner notification
const NOTIFY_ACTIONS = [
  'sms_rejected',      // Someone tried to text from unknown number
  'voice_rejected',    // Someone tried to call (not owner)
  'sms_sent',          // Outbound SMS sent
  'robot_restart',     // Daemon was restarted
  'security_alert',    // Generic security alert
];

// Rate limiting for notifications (don't spam owner)
const notificationCooldown = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between notifications of same type

/**
 * Log an action to the audit log
 * @param action - The action being logged
 * @param details - Additional details about the action
 * @param source - Where the action originated from
 * @param forceNotify - Force notification even if not in NOTIFY_ACTIONS
 */
export async function auditLog(
  action: string,
  details: Record<string, unknown>,
  source: AuditSource = 'web',
  forceNotify: boolean = false
): Promise<void> {
  const shouldNotify = forceNotify || NOTIFY_ACTIONS.includes(action);
  let notified = false;

  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    action,
    source,
    details,
    notified: false,
  };

  // Log to console
  console.log(`[Audit] ${action}`, JSON.stringify(details));

  // Log to file
  try {
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(AUDIT_LOG_FILE, logLine);
  } catch (err) {
    console.error('[Audit] Failed to write log file:', err);
  }

  // Send notification if needed
  if (shouldNotify && !isOnCooldown(action)) {
    notified = await notifyOwner(action, details, source);
    if (notified) {
      setCooldown(action);
    }
  }

  entry.notified = notified;
}

/**
 * Send SMS notification to owner
 */
async function notifyOwner(
  action: string,
  details: Record<string, unknown>,
  source: AuditSource
): Promise<boolean> {
  if (!isTwilioConfigured()) {
    console.log('[Audit] Twilio not configured, skipping notification');
    return false;
  }

  try {
    const client = twilio(CONFIG.twilio.accountSid, CONFIG.twilio.authToken);

    // Format the notification message
    const message = formatNotification(action, details, source);

    await client.messages.create({
      body: message,
      from: CONFIG.twilio.phoneNumber,
      to: CONFIG.ownerPhoneNumber,
    });

    console.log(`[Audit] Notification sent for: ${action}`);
    return true;
  } catch (err) {
    console.error('[Audit] Failed to send notification:', err);
    return false;
  }
}

/**
 * Format a notification message
 */
function formatNotification(
  action: string,
  details: Record<string, unknown>,
  source: AuditSource
): string {
  const time = new Date().toLocaleTimeString();

  switch (action) {
    case 'sms_rejected':
      return `🚫 [${time}] SMS blocked from ${details.from || 'unknown'}`;

    case 'voice_rejected':
      return `🚫 [${time}] Call blocked from ${details.from || 'unknown'}`;

    case 'sms_sent':
      return `📤 [${time}] SMS sent to ${details.to || 'unknown'}`;

    case 'robot_restart':
      return `🤖 [${time}] Robot daemon restarted via ${source}`;

    case 'security_alert':
      return `⚠️ [${time}] Security: ${details.message || action}`;

    default:
      return `📋 [${time}] ${action}: ${JSON.stringify(details).slice(0, 100)}`;
  }
}

/**
 * Check if an action is on cooldown
 */
function isOnCooldown(action: string): boolean {
  const lastNotified = notificationCooldown.get(action);
  if (!lastNotified) return false;
  return Date.now() - lastNotified < COOLDOWN_MS;
}

/**
 * Set cooldown for an action
 */
function setCooldown(action: string): void {
  notificationCooldown.set(action, Date.now());
}

/**
 * Get recent audit entries (for dashboard/debugging)
 */
export function getRecentAuditEntries(count: number = 50): AuditEntry[] {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      return [];
    }

    const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries = lines
      .slice(-count)
      .map((line) => {
        try {
          return JSON.parse(line) as AuditEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is AuditEntry => e !== null);

    return entries.reverse(); // Most recent first
  } catch (err) {
    console.error('[Audit] Failed to read log file:', err);
    return [];
  }
}
