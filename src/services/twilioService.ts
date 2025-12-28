// Twilio Service for Reggie Homebase
// Handles outbound SMS and voice calls via Twilio REST API

import { TWILIO_CONFIG, isTwilioConfigured, formatPhoneNumber, isValidPhoneNumber } from '../config/twilio';

// ============ Types ============

export interface SendSMSParams {
  to: string;
  body: string;
}

export interface MakeCallParams {
  to: string;
  message?: string;
  voice?: TwilioVoice;
  twiml?: string;
}

export interface TwilioResponse {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface SMSMessage {
  sid: string;
  to: string;
  from: string;
  body: string;
  status: string;
  direction: 'inbound' | 'outbound-api' | 'outbound-call' | 'outbound-reply';
  dateCreated: string;
  dateSent?: string;
}

export type TwilioVoice =
  | 'alice'
  | 'man'
  | 'woman'
  | 'Polly.Amy'
  | 'Polly.Brian'
  | 'Polly.Joanna'
  | 'Polly.Matthew';

// ============ Service Implementation ============

class TwilioService {
  private getAuthHeader(): string {
    const credentials = btoa(
      `${TWILIO_CONFIG.accountSid}:${TWILIO_CONFIG.authToken}`
    );
    return `Basic ${credentials}`;
  }

  private getBaseUrl(): string {
    return `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.accountSid}`;
  }

  // ============ SMS Operations ============

  async sendSMS(params: SendSMSParams): Promise<TwilioResponse> {
    if (!isTwilioConfigured()) {
      return { success: false, error: 'Twilio not configured. Please add Twilio credentials.' };
    }

    // Format and validate phone number
    const to = formatPhoneNumber(params.to);
    if (!isValidPhoneNumber(to)) {
      return {
        success: false,
        error: `Invalid phone number format: ${params.to}. Use E.164 format (e.g., +1234567890).`,
      };
    }

    // Validate message body
    if (!params.body || params.body.trim().length === 0) {
      return { success: false, error: 'Message body cannot be empty.' };
    }

    const url = `${this.getBaseUrl()}/Messages.json`;

    try {
      const formData = new URLSearchParams();
      formData.append('To', to);
      formData.append('From', TWILIO_CONFIG.phoneNumber);
      formData.append('Body', params.body);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          sid: data.sid,
          status: data.status,
          details: {
            to: data.to,
            from: data.from,
            body: data.body,
            dateCreated: data.date_created,
          },
        };
      } else {
        return {
          success: false,
          error: data.message || `Twilio API error: ${response.status}`,
          details: data,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error sending SMS',
      };
    }
  }

  // ============ Voice Operations ============

  async makeCall(params: MakeCallParams): Promise<TwilioResponse> {
    if (!isTwilioConfigured()) {
      return { success: false, error: 'Twilio not configured. Please add Twilio credentials.' };
    }

    // Format and validate phone number
    const to = formatPhoneNumber(params.to);
    if (!isValidPhoneNumber(to)) {
      return {
        success: false,
        error: `Invalid phone number format: ${params.to}. Use E.164 format (e.g., +1234567890).`,
      };
    }

    const url = `${this.getBaseUrl()}/Calls.json`;

    try {
      const formData = new URLSearchParams();
      formData.append('To', to);
      formData.append('From', TWILIO_CONFIG.phoneNumber);

      // Build TwiML for the call
      let twiml: string;
      if (params.twiml) {
        // Use provided TwiML directly
        twiml = params.twiml;
      } else if (params.message) {
        // Build TwiML from message
        const voice = params.voice || 'alice';
        const escapedMessage = this.escapeXml(params.message);
        twiml = `<Response><Say voice="${voice}">${escapedMessage}</Say></Response>`;
      } else {
        // Default greeting
        twiml = `<Response><Say voice="alice">Hello! This is Reggie, your friendly robot assistant. How can I help you today?</Say></Response>`;
      }

      formData.append('Twiml', twiml);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          sid: data.sid,
          status: data.status,
          details: {
            to: data.to,
            from: data.from,
            direction: data.direction,
          },
        };
      } else {
        return {
          success: false,
          error: data.message || `Twilio API error: ${response.status}`,
          details: data,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error making call',
      };
    }
  }

  // ============ Message History ============

  async getMessages(options?: {
    to?: string;
    from?: string;
    limit?: number;
  }): Promise<TwilioResponse & { messages?: SMSMessage[] }> {
    if (!isTwilioConfigured()) {
      return { success: false, error: 'Twilio not configured.' };
    }

    const params = new URLSearchParams();
    if (options?.to) params.append('To', formatPhoneNumber(options.to));
    if (options?.from) params.append('From', formatPhoneNumber(options.from));
    params.append('PageSize', String(options?.limit || 20));

    const url = `${this.getBaseUrl()}/Messages.json?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      });

      const data = await response.json();

      if (response.ok) {
        const messages: SMSMessage[] = data.messages.map((msg: Record<string, string>) => ({
          sid: msg.sid,
          to: msg.to,
          from: msg.from,
          body: msg.body,
          status: msg.status,
          direction: msg.direction,
          dateCreated: msg.date_created,
          dateSent: msg.date_sent,
        }));

        return { success: true, messages };
      } else {
        return {
          success: false,
          error: data.message || `Twilio API error: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error fetching messages',
      };
    }
  }

  // ============ Utility Methods ============

  getPhoneNumber(): string {
    return TWILIO_CONFIG.phoneNumber;
  }

  isConfigured(): boolean {
    return isTwilioConfigured();
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Export singleton instance
export const twilioService = new TwilioService();
