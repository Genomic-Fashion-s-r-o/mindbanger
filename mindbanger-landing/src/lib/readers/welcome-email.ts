import { escapeHtml } from './model';
import { welcomeCopy, WELCOME_VERSION } from './welcome-copy';

const inline = (value: string) => escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
const plain = (value: string) => value.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');

export function renderWelcomeEmail(locale: string, siteOrigin = 'https://www.mindbanger.com') {
  const origin = new URL(siteOrigin);
  if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) throw Error('Invalid welcome email origin');
  const copy = welcomeCopy(locale), library = new URL('/readers/' + copy.language + '/library', origin).href, preferences = new URL('/readers/' + copy.language + '/preferences', origin).href;
  const paragraphs = copy.paragraphs.map((text, i) => `<p style="margin:0 0 ${i >= 12 ? '9' : '22'}px;font-size:${i === 0 ? '21' : '17'}px;line-height:1.8">${inline(text)}</p>`).join('');
  const html = `<!doctype html><html lang="${copy.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(copy.subject)}</title></head><body style="margin:0;background:#f5f4ee;color:#25473d;font-family:Arial,Helvetica,sans-serif"><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:28px 16px"><table role="presentation" style="width:100%;max-width:620px;margin:auto;border-collapse:collapse;background:#fffefa"><tr><td style="padding:25px 30px;background:#25473d;color:#e6cf9e;font-size:24px;font-weight:bold;letter-spacing:-1px">mindbanger<span style="display:block;margin-top:6px;font-size:10px;letter-spacing:3px;font-weight:normal">READERS</span></td></tr><tr><td style="padding:32px 30px">${paragraphs}<p style="margin:30px 0 0"><a href="${escapeHtml(library)}" style="display:inline-block;background:#25473d;color:#fffefa;text-decoration:none;padding:14px 22px;border-radius:5px;font-size:16px;font-weight:bold">${escapeHtml(copy.open)}</a></p></td></tr><tr><td style="padding:24px 30px;border-top:1px solid #dce3d8;font-size:13px;line-height:1.7;color:#52685c"><p style="margin:0 0 12px">${escapeHtml(copy.footer)}</p><a href="${escapeHtml(preferences)}" style="color:#25473d">${escapeHtml(copy.preferences)}</a><br><a href="mailto:miroslav@mindbanger.com" style="color:#25473d">miroslav@mindbanger.com</a></td></tr></table></td></tr></table></body></html>`;
  return { subject: copy.subject, html, text: [...copy.paragraphs.map(plain), copy.open + ': ' + library, copy.footer, copy.preferences + ': ' + preferences, 'miroslav@mindbanger.com'].join('\n\n'), language: copy.language, version: WELCOME_VERSION };
}

export type WelcomeSendResult = { state: 'sent' | 'failed' | 'review'; providerId?: string; language: string; version: string };
export async function sendWelcomeEmail(input: { deliveryId: string; email: string; locale: string }, options: { apiKey: string; fetch?: typeof fetch; siteOrigin?: string }): Promise<WelcomeSendResult> {
  const message = renderWelcomeEmail(input.locale, options.siteOrigin);
  const base = { language: message.language, version: message.version };
  try {
    const response = await (options.fetch || fetch)('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': options.apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'Miroslav Jobus | Mindbanger', email: 'miroslav@mindbanger.com' }, replyTo: { email: 'miroslav@mindbanger.com' }, to: [{ email: input.email }], subject: message.subject, htmlContent: message.html, textContent: message.text, headers: { idempotencyKey: input.deliveryId }, tags: ['mindbanger-readers', 'mindbanger-reader-welcome'] }),
      signal: AbortSignal.timeout(12000),
    });
    if (response.ok) { const result = await response.json(); return result.messageId ? { ...base, state: 'sent', providerId: String(result.messageId) } : { ...base, state: 'review' }; }
    return { ...base, state: response.status >= 400 && response.status < 500 && ![408, 409, 429].includes(response.status) ? 'failed' : 'review' };
  } catch { return { ...base, state: 'review' }; }
}
