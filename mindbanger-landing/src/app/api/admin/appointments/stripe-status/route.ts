import { NextResponse } from 'next/server';
import { bookingAdmin } from '@/lib/booking/admin';
import { stripeReadiness } from '@/lib/booking/stripe-readiness';

export async function GET() {
  if (!(await bookingAdmin())) return NextResponse.json({ error: 'Vyžaduje sa správca s overeným druhým faktorom.' }, { status: 401 });
  try {
    return NextResponse.json(await stripeReadiness(), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Stripe sa nepodarilo overiť. Skontrolujte prístup existujúceho serverového kľúča.' }, { status: 503 }); }
}
