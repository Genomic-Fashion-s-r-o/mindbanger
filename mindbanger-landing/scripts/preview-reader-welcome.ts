import { mkdirSync, writeFileSync } from 'node:fs';
import { renderWelcomeEmail } from '../src/lib/readers/welcome-email';
mkdirSync('output/reader-welcome-preview', { recursive: true });
for (const locale of ['sk', 'en']) { const message = renderWelcomeEmail(locale); writeFileSync('output/reader-welcome-preview/' + locale + '.html', message.html); writeFileSync('output/reader-welcome-preview/' + locale + '.txt', 'Subject: ' + message.subject + '\n\n' + message.text); }
console.log('Created Slovak and English HTML/text previews; no email sent.');
