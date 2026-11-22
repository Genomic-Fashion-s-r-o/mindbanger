import {portalLocale}from '@/lib/portal-locale-server';
import {portalPath}from '@/lib/portal-locale';
import {localizedProgram,programConfigSchema}from '@/lib/online-programs/model';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { clientIdentity, failure, json, readJson } from '@/lib/online-programs/http';
import { checked, ProgramError } from '@/lib/online-programs/store';
import { programStripe, programStripeLive } from '@/lib/online-programs/payments';
import { PROGRAM_TERMS_VERSION } from '@/lib/online-programs/model';
import type {PriceQuote} from '@/lib/member-funnels/model';
const schema = z.object({ programId: z.uuid(), cohortId: z.uuid().nullable(), displayedPrice:z.number().int().positive().optional(),termsVersion: z.literal(PROGRAM_TERMS_VERSION), termsAccepted: z.literal(true), performanceRequested: z.literal(true), adultConfirmed: z.literal(true) }).strict();
export async function POST(request: Request) {
  try {
    const user = await clientIdentity(request);
    const input = schema.safeParse(await readJson(request, 5000));
    if (!input.success) throw new ProgramError('Potvrď podmienky nákupu a požiadavku na sprístupnenie obsahu.');
    if (!process.env.PROGRAM_STRIPE_WEBHOOK_SECRET) throw new ProgramError('Predaj online programov zatiaľ nie je spustený.', 503);
    const stripe = programStripe(), db = getServiceSupabase();
    const quote=checked(await db.rpc('member_funnel_quote',{p_user:user.id,p_program:input.data.programId})) as PriceQuote;
    let pending=db.from('online_program_orders').select('id,amount_cents,stripe_session_id,offer_deadline,expires_at').eq('user_id',user.id).eq('program_id',input.data.programId).eq('status','pending');
    pending=input.data.cohortId?pending.eq('cohort_id',input.data.cohortId):pending.is('cohort_id',null);
    const old=checked(await pending.maybeSingle());
    if(old&&(old.amount_cents!==quote.price||(old.offer_deadline&&Date.parse(old.offer_deadline)<=Date.now())||(!old.stripe_session_id&&Date.parse(old.expires_at)<Date.now()+31*60000))){
      if(old.stripe_session_id){let session=await stripe.checkout.sessions.retrieve(old.stripe_session_id);if(session.status==='open')session=await stripe.checkout.sessions.expire(session.id);if(session.status==='complete')throw new ProgramError('Predchádzajúcu platbu ešte overujeme. Počkaj na jej výsledok.',409);}
      checked(await db.from('online_program_orders').update({status:'expired'}).eq('id',old.id).eq('status','pending'));
    }
    const order = checked(await db.rpc('online_program_order_create', { p_user: user.id, p_program: input.data.programId, p_cohort: input.data.cohortId, p_live: programStripeLive() })) as { id: string; amount_cents: number; currency: string; expires_at: string; stripe_session_id: string | null; version_id: string;offer_deadline:string|null };
    if(input.data.displayedPrice!==undefined&&input.data.displayedPrice!==order.amount_cents)throw new ProgramError('Platnosť zobrazenej ceny sa zmenila. Obnov ponuku a potvrď novú cenu.',409);
    if (order.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (session.status === 'open' && session.url) return json({ url: session.url });
      throw new ProgramError('Táto platba sa už spracúva. Skontroluj stav v sekcii Produkty.', 409);
    }
    const version = checked(await db.from('online_program_versions').select('config').eq('id', order.version_id).single());
    const origin = new URL(request.url).origin,locale=await portalLocale(request),content=localizedProgram(programConfigSchema.parse(version.config),locale);
    checked(await db.from('online_program_orders').update({locale,terms_snapshot:content.terms}).eq('id',order.id).eq('user_id',user.id).is('stripe_session_id',null));
    const metadata = { type: 'online_program', orderId: order.id, userId: user.id };
    const session = await stripe.checkout.sessions.create({
      locale:locale==='cs'?'cs':locale==='en'?'en':'sk',mode: 'payment', payment_method_types: ['card'], customer_email: user.email,
      line_items: [{ quantity: 1, price_data: { currency: order.currency, unit_amount: order.amount_cents, product_data: { name: content.title } } }],
      metadata, payment_intent_data: { metadata,...(order.offer_deadline?{capture_method:'manual' as const}:{}) }, client_reference_id: order.id,
      expires_at: Math.floor(Date.parse(order.expires_at) / 1000),
      success_url: `${origin}${portalPath('/ucet/produkty',locale)}?objednavka=${order.id}`,
      cancel_url: `${origin}${portalPath('/ucet/produkty',locale)}?objednavka=${order.id}&platba=nedokoncena`,
    }, { idempotencyKey: `online-program-order-${order.id}` });
    if (!session.url) throw new ProgramError('Platobnú stránku sa nepodarilo otvoriť.', 503);
    checked(await db.from('online_program_orders').update({ stripe_session_id: session.id }).eq('id', order.id).or(`stripe_session_id.is.null,stripe_session_id.eq.${session.id}`).select('id'));
    return json({ url: session.url });
  } catch (error) { return failure(error); }
}
