import {portalLocale} from '@/lib/portal-locale-server';
import {portalPath} from '@/lib/portal-locale';
import 'server-only';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase-service';
import { checked, ProgramError } from '@/lib/online-programs/store';
import { CLIENT_TERMS_VERSION } from '@/lib/client-platform';
import { ticketHash, emailHash } from '@/lib/member-funnels/store';

const cookieName = 'mb-bonus-entry';
const intentSchema = z.object({ email: z.email().max(254), slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100) });
export const startSchema = intentSchema.extend({ email: z.email().trim().toLowerCase().max(254) }).strict();
export const passwordSchema = z.object({
  entryId:z.uuid(),
  mode: z.enum(['create', 'login']), password: z.string().min(1).max(128),
  birthYear: z.number().int().min(1900).refine(y => y <= new Date().getUTCFullYear() - 18).optional(),
  accepted: z.literal(true), termsVersion: z.literal(CLIENT_TERMS_VERSION),
}).strict().superRefine((v, ctx) => {
  if (v.mode === 'create' && (v.password.length < 12 || !v.birthYear)) ctx.addIssue({ code: 'custom', message: 'Nastav heslo s aspoň 12 znakmi a zadaj rok narodenia. Účet je určený osobám od 18 rokov.' });
});
const key = () => {const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!secret)throw new ProgramError('Prihlásenie momentálne nie je dostupné.',503);return createHash('sha256').update('member-entry:' + secret).digest();};
export async function saveEntry(input: z.infer<typeof intentSchema>) {
  const entryId=randomUUID();
  const token = await new EncryptJWT(input).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).setJti(entryId).setAudience('bonus-entry').setIssuedAt().setExpirationTime('20m').encrypt(key());
  (await cookies()).set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/member-funnels', maxAge: 1200 });
  return entryId;
}
export async function loadEntry(entryId:string) {
  const token = (await cookies()).get(cookieName)?.value;
  try {
    if (!token) throw new Error('missing');
    const { payload } = await jwtDecrypt(token, key(), { audience: 'bonus-entry' });
    if(payload.jti!==entryId)throw new Error('another tab');
    return intentSchema.parse(payload);
  } catch { throw new ProgramError('Tento krok vypršal. Zadaj svoj email ešte raz.', 410); }
}
export async function clearEntry() { (await cookies()).set(cookieName, '', { path: '/api/member-funnels', maxAge: 0 }); }
export async function entryLimit(request: Request, email: string) {
  const ip = (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const hash = (v: string) => createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(v).digest('hex');
  const allowed = checked(await getServiceSupabase().rpc('appointment_rate_limit', { p_email_key: hash('auth-email:' + email), p_ip_key: hash('auth-ip:' + ip) }));
  if (!allowed) throw new ProgramError('Chvíľu počkaj pred ďalším pokusom.', 429);
}
export async function requireBonus(slug: string) {
  const funnel = checked(await getServiceSupabase().from('member_funnels').select('id,asset_id').eq('slug', slug).eq('active', true).maybeSingle());
  if (!funnel?.asset_id) throw new ProgramError('Tento bonus momentálne nie je dostupný.', 404);
  return funnel;
}
export async function grantBonus(userId: string, email: string, funnelId: string) {
  const db = getServiceSupabase(), token = randomBytes(32).toString('hex');
  checked(await db.from('member_funnel_registrations').insert({ funnel_id: funnelId, token_hash: ticketHash(token), email_hash: emailHash(email), terms_version: CLIENT_TERMS_VERSION,locale:await portalLocale() }));
  return checked(await db.rpc('member_funnel_claim', { p_user: userId, p_token_hash: ticketHash(token), p_email_hash: emailHash(email) })) as string;
}
