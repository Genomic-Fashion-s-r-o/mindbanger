import 'server-only';
import { NextResponse } from 'next/server';
import { bookingAdmin } from '@/lib/booking/admin';
import { getClientContext } from '@/lib/client-context';
import { ProgramError } from './store';
export const privateHeaders = { 'Cache-Control': 'private, no-store' };
export function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: privateHeaders }); }
export function failure(error: unknown) {
  if (error instanceof ProgramError) return json({ error: error.message }, error.status);
  if (error instanceof SyntaxError) return json({ error: 'Neplatná požiadavka.' }, 400);
  console.error('Online program operation failed', error instanceof Error ? error.message : 'unknown');
  return json({ error: 'Operáciu sa nepodarilo dokončiť. Skús to znova.' }, 503);
}
export function assertOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new ProgramError('Neplatný pôvod požiadavky.', 403);
}
export async function adminIdentity(request?: Request) {
  if (request) assertOrigin(request);
  const admin = await bookingAdmin();
  if (!admin) throw new ProgramError('Over administrátorské prihlásenie a druhý faktor.', 401);
  return admin;
}
export async function clientIdentity(request?: Request) {
  if (request) assertOrigin(request);
  const context = await getClientContext();
  if (!context) throw new ProgramError('Najprv sa prihlás do svojho účtu.', 401);
  if (!context.accepted) throw new ProgramError('Najprv dokonči nastavenie svojho účtu.', 403);
  return context.user;
}
export async function readJson(request: Request, maxBytes = 1500000) {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new ProgramError('Požiadavka je príliš veľká.', 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new ProgramError('Požiadavka je príliš veľká.', 413);
  return JSON.parse(text);
}
