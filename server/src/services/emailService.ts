// Email Service (SMTP)
// Sends voicemail notifications via email when configured.

import nodemailer from 'nodemailer';
import { CONFIG, isEmailConfigured } from '../config.js';

type EmailPayload = {
  subject: string;
  text: string;
  html?: string;
  to?: string;
  from?: string;
  replyTo?: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!transporter) {
    const auth = CONFIG.email.smtpUser
      ? { user: CONFIG.email.smtpUser, pass: CONFIG.email.smtpPass }
      : undefined;

    transporter = nodemailer.createTransport({
      host: CONFIG.email.smtpHost,
      port: CONFIG.email.smtpPort,
      secure: CONFIG.email.smtpSecure,
      auth,
    });
  }

  return transporter;
}

export async function sendEmail(
  payload: EmailPayload
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const transport = getTransporter();
  if (!transport) {
    console.warn('[Email] SMTP not configured; skipping email send');
    return { ok: false, skipped: true };
  }

  const to = payload.to || CONFIG.email.toAddress;
  const from = payload.from || CONFIG.email.fromAddress || CONFIG.email.toAddress;

  if (!to) {
    console.warn('[Email] Missing EMAIL_TO; skipping email send');
    return { ok: false, skipped: true };
  }

  try {
    const info = await transport.sendMail({
      to,
      from,
      replyTo: payload.replyTo,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    console.log('[Email] Sent voicemail email:', info.messageId);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Email] Failed to send email:', message);
    return { ok: false, error: message };
  }
}

export async function sendVoicemailEmail(params: {
  fromNumber: string;
  transcription: string;
  callSid: string;
  receivedAt?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const receivedAt = params.receivedAt || new Date().toISOString();
  const subject = `Reggie voicemail from ${params.fromNumber}`;
  const text = [
    `New voicemail received by Reggie.`,
    '',
    `From: ${params.fromNumber}`,
    `CallSid: ${params.callSid}`,
    `Received: ${receivedAt}`,
    '',
    'Transcription:',
    params.transcription,
  ].join('\n');

  // Send to all configured recipients
  const recipients = CONFIG.email.toAddresses;

  if (recipients.length === 0) {
    console.warn('[Email] No EMAIL_TO addresses configured; skipping email send');
    return { ok: false, skipped: true };
  }

  // nodemailer accepts comma-separated string for multiple recipients
  const toAddresses = recipients.join(', ');
  console.log(`[Email] Sending voicemail transcription to: ${toAddresses}`);

  return sendEmail({ subject, text, to: toAddresses });
}
