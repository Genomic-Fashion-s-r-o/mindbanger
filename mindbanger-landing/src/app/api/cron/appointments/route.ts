import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { processBookingMail } from '@/lib/booking/notifications';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const incoming = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  if (!secret || incoming.length !== expected.length || !timingSafeEqual(Buffer.from(incoming), Buffer.from(expected))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json(await processBookingMail()); }
  catch { return NextResponse.json({ error: 'Appointment maintenance unavailable' }, { status: 503 }); }
}
