import {meetingProvider,meetingName} from './meeting-link';
import type { BookingMailPayload } from './email-content';
import { canUseMeeting } from './manual-model';
import { dateLabel, money } from './model';
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function manualBookingEmail(b: BookingMailPayload, event: string, owner: boolean) {
  const cs = b.locale === 'cs', c = (sk: string, cz: string) => cs ? cz : sk;
  const provider=meetingName(b.meeting_url);
  const cancelled = event === 'cancelled';
  const title = cancelled ? c('Dohodnuté stretnutie bolo zrušené', 'Dohodnuté setkání bylo zrušeno') : event === 'reminder' ? c('Pripomienka dohodnutého stretnutia', 'Připomínka dohodnutého setkání') : c('Tvoj termín a odkaz na videohovor', 'Tvůj termín a odkaz na videohovor');
  const meeting = canUseMeeting(b) && b.meeting_url && meetingProvider(b.meeting_url)
    ? `<p><a href="${escape(b.meeting_url)}" style="display:inline-block;background:#25473d;color:white;padding:14px 20px;text-decoration:none">${c('Pripojiť sa cez '+provider, 'Připojit se přes '+provider)} ↗</a></p><p>${escape(b.meeting_url)}</p>` : '';
  const minutes = Math.round((Date.parse(b.ends_at) - Date.parse(b.starts_at)) / 60000);
  const reserved = Math.round((Date.parse(b.busy_until) - Date.parse(b.starts_at)) / 60000);
  return {
    subject: owner ? 'Mindbanger · ' + (cancelled ? 'Zrušený individuálne dohodnutý termín' : 'Dohodnutý termín · '+provider) : title,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.6;color:#25473d"><h1>${escape(title)}</h1><p>${escape(b.service_name)}</p><p><strong>${escape(dateLabel(b.starts_at, cs ? 'cs' : 'sk'))}</strong><br>Europe/Bratislava<br>${minutes} ${c('minút stretnutie', 'minut setkání')} · ${reserved} ${c('minút rezervovaný čas', 'minut rezervovaný čas')}</p><p>${cancelled ? c('Termín je zrušený. Na pôvodný odkaz sa už nepripájaj.', 'Termín je zrušený. Na původní odkaz se již nepřipojuj.') : c('Termín sme dohodli individuálne a je potvrdený. Na pripojenie použi tlačidlo alebo skopíruj celý odkaz nižšie.', 'Termín jsme dohodli individuálně a je potvrzený. K připojení použij tlačítko nebo zkopíruj celý odkaz níže.')}</p>${cancelled ? '' : meeting}<p>${c('Dohodnutá cena', 'Dohodnutá cena')}: ${escape(money(Number(b.price), b.currency || 'eur'))}. ${Number(b.price) === 0 ? c('Stretnutie je bezplatné.', 'Setkání je bezplatné.') : c('Spôsob úhrady riešime podľa osobnej dohody.', 'Způsob úhrady řešíme podle osobní dohody.')} ${c('Táto rezervácia nepoužíva Stripe a tento email nie je dokladom o zaplatení.', 'Tato rezervace nepoužívá Stripe a tento email není dokladem o zaplacení.')}</p>${b.participant_name ? `<p>${c('Účastník', 'Účastník')}: ${escape(b.participant_name)} · ${b.participant_age} ${c('rokov', 'let')}</p>` : ''}${owner ? `<p>Klient: ${escape(b.customer_name || '')}<br>${escape(b.email || '')}<br>${escape(b.phone || '')}</p><p><a href="https://www.mindbanger.com/mindbanger_daily/admin/rezervacie">Otvoriť admin kalendár</a></p>` : `<p>${c('Na pripojenie nemusíš dokončovať registráciu na Mindbangeri ani zadávať kartu. Súkromný odkaz nepreposielaj ďalším osobám. Ak už máš dokončený klientsky účet, odkaz nájdeš aj pri rezervácii.', 'K připojení nemusíš dokončovat registraci na Mindbangeru ani zadávat kartu. Soukromý odkaz nepřeposílej dalším osobám. Pokud máš dokončený klientský účet, odkaz najdeš také u rezervace.')}</p>`}<p>${c('Zmenu alebo zrušenie dohodni priamo so mnou', 'Změnu nebo zrušení dohodni přímo se mnou')}: <a href="mailto:${escape(b.contactEmail)}">${escape(b.contactEmail)}</a>${b.contactPhone ? ' · ' + escape(b.contactPhone) : ''}.</p><p>Mgr. Miroslav Jobus · Mindbanger</p></div>`,
  };
}
