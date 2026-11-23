import { createHmac, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { sameOrigin } from '@/lib/booking/store';
import { ATTRIBUTION_COOKIE, ATTRIBUTION_DAYS, ATTRIBUTION_VERSION, WITHDRAWAL_COOKIE } from '@/lib/marketing-attribution';
export const dynamic = 'force-dynamic';
const input = z.object({ campaign: z.uuid(), version: z.literal(ATTRIBUTION_VERSION), consent: z.literal(true) }).strict();
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Neplatný pôvod.' }, { status: 403 });
  if (Number(request.headers.get('content-length')) > 1000) return new NextResponse(null, { status: 413 });
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return new NextResponse(null, { status: 400 });
    const store = await cookies(), current = z.uuid().safeParse(store.get(ATTRIBUTION_COOKIE)?.value);
    const db=getServiceSupabase();
    const pending=z.uuid().safeParse(store.get(WITHDRAWAL_COOKIE)?.value);
    if(pending.success){const result=await db.rpc('marketing_withdraw',{p_visitor:pending.data});if(result.error)return new NextResponse(null,{status:503});}
    const ip=(request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'local').split(',')[0].trim();
    const key=createHmac('sha256',process.env.SUPABASE_SERVICE_ROLE_KEY!).update('marketing-touch:'+ip).digest('hex');
    const limit=await db.rpc('marketing_allow_touch',{p_key:key});
    if(limit.error)return new NextResponse(null,{status:503});
    if(limit.data!==true)return new NextResponse(null,{status:429});
    const visitor = current.success ? current.data : randomUUID();
    const { data, error } = await db.rpc('marketing_record_touch', { p_visitor: visitor, p_campaign: parsed.data.campaign, p_version: ATTRIBUTION_VERSION });
    if (error) return new NextResponse(null, { status: 503 });
    if (data !== true) return new NextResponse(null, { status: 404 });
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(ATTRIBUTION_COOKIE, visitor, { secure: true, httpOnly: true, sameSite: 'lax', path: '/', maxAge: ATTRIBUTION_DAYS * 86400 });
    if(pending.success)response.cookies.set(WITHDRAWAL_COOKIE,'',{secure:true,httpOnly:true,sameSite:'lax',path:'/',maxAge:0});
    response.headers.set('Cache-Control', 'no-store'); return response;
  } catch { return new NextResponse(null, { status: 503 }); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new NextResponse(null, { status: 403 });
  const store = await cookies();
  const visitors = [...new Set([store.get(ATTRIBUTION_COOKIE)?.value, store.get(WITHDRAWAL_COOKIE)?.value].filter(v=>z.uuid().safeParse(v).success))];
  let pending: string | undefined;
  for (const visitor of visitors) {
    try { const {error} = await getServiceSupabase().rpc('marketing_withdraw', { p_visitor: visitor }); if(error)pending=visitor; }
    catch { pending=visitor; }
  }
  const response = new NextResponse(null, { status: pending ? 503 : 204 });
  // A failed deletion must NEVER leave an active attribution cookie.
  response.cookies.set(ATTRIBUTION_COOKIE, '', { secure:true, httpOnly:true, sameSite:'lax', path:'/', maxAge:0 });
  response.cookies.set(WITHDRAWAL_COOKIE, pending || '', { secure:true, httpOnly:true, sameSite:'lax', path:'/', maxAge:pending?86400:0 });
  response.headers.set('Cache-Control','no-store');return response;
}
