import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { sendEmail } from '@/lib/email';
import { sameOrigin } from '@/lib/booking/store';
const inputSchema = z.object({ email: z.email().max(254).transform(v => v.trim().toLowerCase()), lang: z.enum(['sk','cs','en']).default('sk') });
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Neplatný pôvod požiadavky.' }, { status: 403 });
  try {
    if (Number(req.headers.get('content-length')) > 4000) return NextResponse.json({ error: 'Príliš veľká požiadavka.' }, { status: 413 });
    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Zadajte platný email.' }, { status: 400 });
    if (!process.env.BREVO_API_KEY) return NextResponse.json({ error: 'Odosielanie kódov je dočasne nedostupné.' }, { status: 503 });
    const { email, lang } = parsed.data, db = getServiceSupabase();
    const ip = (req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
    const hash = (v: string) => createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(v).digest('hex');
    const { data: allowed, error: limitError } = await db.rpc('appointment_rate_limit', { p_email_key: hash('auth-email:' + email), p_ip_key: hash('auth-ip:' + ip) });
    if (limitError) throw limitError;
    if (!allowed) return NextResponse.json({ error: 'Dosiahli ste limit žiadostí. Skúste to neskôr.' }, { status: 429 });
    // generateLink handles existing/new identities. Never mutate metadata or look up profiles by email before verification.
    const { data, error } = await db.auth.admin.generateLink({ type: 'magiclink', email });
    if (error || !data.properties?.email_otp) throw new Error('OTP unavailable');
    const code = data.properties.email_otp;
    const labels = { sk: ['Váš vstupný kód do Mindbanger', 'Váš prihlasovací kód', 'Zadajte tento kód v okne, kde sa prihlasujete. Kód nikomu neposielajte.', 'Otvoriť prihlásenie'], cs: ['Váš vstupní kód do Mindbanger', 'Váš přihlašovací kód', 'Zadejte kód v okně přihlášení. Kód nikomu neposílejte.', 'Otevřít přihlášení'], en: ['Your Mindbanger sign-in code', 'Your sign-in code', 'Enter this code in the sign-in window. Do not share it.', 'Open sign in'] }[lang];
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mindbanger.com';
    const { success } = await sendEmail({ to: email, subject: labels[0], html: '<div style="font-family:Arial;max-width:560px;padding:28px;color:#25473d"><h1>' + labels[1] + '</h1><p style="font-size:32px;letter-spacing:6px">' + code + '</p><p>' + labels[2] + '</p><a href="' + origin + '/prihlasenie">' + labels[3] + '</a><p>Ak ste si kód nevyžiadali, túto správu môžete ignorovať.</p></div>' });
    if (!success) throw new Error('Email unavailable');
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Kód sa nepodarilo odoslať. Skúste to neskôr.' }, { status: 503 }); }
}
