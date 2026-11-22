import { NextResponse, after } from 'next/server';
import { bookingAdmin } from '@/lib/booking/admin';
import { sameOrigin, publicError } from '@/lib/booking/store';
import { manualBookingSchema } from '@/lib/booking/manual-model';
import { videoReadiness } from '@/lib/booking/video-readiness';
import { getServiceSupabase } from '@/lib/supabase-service';
import { processVideoJobs } from '@/lib/booking/video-jobs';
import { processBookingMail } from '@/lib/booking/notifications';

const headers = { 'Cache-Control': 'private, no-store' };
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Neplatný pôvod požiadavky.' }, { status: 403, headers });
  const admin = await bookingAdmin();
  if (!admin) return NextResponse.json({ error: 'Vyžaduje sa správca s druhým faktorom.' }, { status: 401, headers });
  try {
    const raw = await request.text();
    if (raw.length > 5000) return NextResponse.json({ error: 'Príliš veľká požiadavka.' }, { status: 413, headers });
    const input = manualBookingSchema.safeParse(JSON.parse(raw));
    if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message || 'Skontroluj údaje rezervácie.' }, { status: 400, headers });
    if (!process.env.BREVO_API_KEY || !(await videoReadiness()).ready) return NextResponse.json({ error: 'Pred rezerváciou over pripojenie videohovorov a odosielanie emailov v nastaveniach.' }, { status: 409, headers });
    const b = input.data;
    const result = await getServiceSupabase().rpc('appointment_admin_manual', { p_user: b.userId, p_service: b.serviceId, p_start: b.startsAt, p_price: b.price, p_note: b.note, p_request: b.requestId, p_actor: admin.id, p_participant: b.participantName, p_age: b.participantAge, p_guardian: b.guardianConsent });
    if (result.error) {
      const e = publicError(result.error);
      return NextResponse.json({ error: e.error }, { status: e.status, headers });
    }
    after(async () => { try { await processVideoJobs(); await processBookingMail(); } catch { /* Durable cron retries the saved jobs. */ } });
    return NextResponse.json({ ok: true, id: result.data, message: 'Termín je uložený bez Stripe. Pripravujeme odkaz na videohovor; potvrdenie odošleme až s funkčným odkazom.' }, { headers });
  } catch {
    return NextResponse.json({ error: 'Rezerváciu sa nepodarilo uložiť. Obnov kalendár a skús to znova.' }, { status: 503, headers });
  }
}
