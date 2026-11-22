interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string; // Format: "Name <email>" or just "email"
  replyTo?: string;
  bcc?: string | string[];
}

/**
 * Sends an email using Brevo (formerly Sendinblue) API via fetch.
 * Uses existing BREVO_API_KEY and configuration.
 */
export async function sendEmail({ to, subject, html, from = 'Miroslav Jobus | Mindbanger <miroslav@mindbanger.com>', replyTo, bcc }: SendEmailParams) {
  const apiKey = process.env.BREVO_API_KEY;
  
  if (!apiKey) {
    console.error('BREVO_API_KEY is missing in environment variables.');
    return { success: false, error: 'Missing API Key' };
  }

  // Use a type guard for strings to be sure
  const fromStr = from || 'Miroslav Jobus | Mindbanger <miroslav@mindbanger.com>';

  // Helper to parse "Name <email>" format or return generic
  const parseSender = (senderStr: string) => {
    // Basic regex for "Name <email>" format
    const match = senderStr.match(/^(.*?)\s*<(.*)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    // If no <>, assume just email or name (fallback to default email)
    if (senderStr.includes('@')) return { email: senderStr.trim(), name: 'Mindbanger' };
    return { name: 'Mindbanger', email: 'miroslav@mindbanger.com' };
  };

  const senderObj = parseSender(fromStr);

  // Helper to standardise to array of {email: string}
  const formatRecipients = (recipients: string | string[]) => {
      if (Array.isArray(recipients)) return recipients.map(e => ({ email: e }));
      return [{ email: recipients }]; 
  };
  
  const toList = formatRecipients(to);
  const bccList = bcc ? formatRecipients(bcc) : undefined;

  const payload: any = {
    sender: senderObj,
    to: toList,
    subject: subject,
    htmlContent: html
  };

  if (bccList) payload.bcc = bccList;
  payload.replyTo = { email: replyTo || senderObj.email };

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Brevo API Error:', errorText);
      return { success: false, error: errorText };
    }

    // Brevo usually returns { messageId: "..." }
    const data = await res.json();
    return { success: true, data };

  } catch (error: any) {
    console.error('Unexpected Email Error:', error);
    return { success: false, error: error.message };
  }
}
