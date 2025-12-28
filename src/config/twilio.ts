// Twilio Configuration for Reggie Homebase

export const TWILIO_CONFIG = {
  accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID || '',
  authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN || '',
  phoneNumber: import.meta.env.VITE_TWILIO_PHONE_NUMBER || '',
};

export function isTwilioConfigured(): boolean {
  return !!(
    TWILIO_CONFIG.accountSid &&
    TWILIO_CONFIG.authToken &&
    TWILIO_CONFIG.phoneNumber
  );
}

// Format phone number to E.164 format
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // If it already starts with +, return as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If 10 digits, assume US number
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // If 11 digits starting with 1, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // Otherwise just add + prefix
  return `+${cleaned}`;
}

// Validate E.164 phone number format
export function isValidPhoneNumber(phone: string): boolean {
  // E.164 format: + followed by 1-15 digits
  return /^\+[1-9]\d{1,14}$/.test(phone);
}
