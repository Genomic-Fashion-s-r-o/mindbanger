import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientContext } from '@/lib/client-context';
import { getServiceSupabase } from '@/lib/supabase-service';
import { getBookingSettings, sameOrigin, siteOrigin } from '@/lib/booking/store';
import { coachingStripe } from '@/lib/booking/stripe-client';
import { PAYMENT_TERMS_VERSION, AUTHORIZATION_TERMS_VERSION } from '@/lib/booking/model';
import { checkoutExpiry } from '@/lib/booking/payment-terms';
import { priceCents } from '@/lib/booking/amount';
const inputSchema = z.object({ id: z.uuid(), accepted: z.literal(true), earlyService: z.boolean(), termsVersion: z.enum([PAYMENT_TERMS_VERSION,AUTHORIZATION_TERMS_VERSION]) }).strict();
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({error:'Neplatná požiadavka.'},{status:403});
  try {
    const context=await getClientContext();
    if(!context?.accepted) return NextResponse.json({error:'Prihláste sa a dokončite účet.'},{status:401});
    const input=inputSchema.safeParse(await request.json());
    if(!input.success) return NextResponse.json({error:'Neplatná rezervácia.'},{status:400});
    const {settings}=await getBookingSettings();
    if(!settings.stripeEnabled||!process.env.COACHING_STRIPE_WEBHOOK_SECRET) return NextResponse.json({error:'Platby zatiaľ nie sú otvorené.'},{status:503});
    const stripe = coachingStripe();
    const db=getServiceSupabase(),args={p_id:input.data.id,p_user:context.user.id};
    let prepared=await db.rpc('appointment_prepare_payment',args);
    if(prepared.error) return NextResponse.json({error:'Táto rezervácia už nie je pripravená na zadanie karty. Obnov stav vo svojom účte.'},{status:409});
    let booking=prepared.data;
    const consent=await db.rpc('appointment_accept_payment_terms',{...args,p_version:input.data.termsVersion,p_early:input.data.earlyService});
    if(consent.error)return NextResponse.json({error:'Pred platbou prijmi podmienky; pri skoršom termíne potvrď aj výslovnú žiadosť o začatie služby.'},{status:409});
    if(booking.stripe_session_id){
      const previous=await stripe.checkout.sessions.retrieve(booking.stripe_session_id);
      if(previous.status==='open'&&previous.url)return NextResponse.json({url:previous.url});
      if(previous.status!=='expired')return NextResponse.json({error:'Platba sa spracúva. Obnovte stav rezervácie o chvíľu.'},{status:409});
      const reset=await db.rpc('appointment_reset_checkout',{...args,p_session:previous.id});
      if(reset.error)return NextResponse.json({error:'Stav platby sa zmenil. Obnovte stránku.'},{status:409});
      prepared=await db.rpc('appointment_prepare_payment',args);if(prepared.error)throw new Error('Payment unavailable');booking=prepared.data;
    }
    const origin=siteOrigin();
    const expiresAt=checkoutExpiry(booking.payment_due_at);
    if(!expiresAt)return NextResponse.json({error:'Na otvorenie novej platobnej stránky už nezostáva dosť času. Vyber nový termín alebo kontaktuj poskytovateľa.'},{status:409});
    const currency=booking.currency==='czk'?'czk':'eur',locale=booking.locale==='cs'?'cs':'sk';
    const session=await stripe.checkout.sessions.create({mode:'payment',payment_method_types:['card'],customer_email:booking.email,
      expires_at:expiresAt,billing_address_collection:'required',
      line_items:[{price_data:{currency,unit_amount:priceCents(booking.price),product_data:{name:locale==='cs'?'Koučink':'Coaching',description:locale==='cs'?'Individuální online setkání podle rezervace':'Individuálne online stretnutia podľa rezervácie'}},quantity:1}],
      success_url:`${origin}${locale==='cs'?'/cz':''}/ucet/rezervacie?platba=spracovanie`,cancel_url:`${origin}${locale==='cs'?'/cz':''}/ucet/rezervacie?platba=prerusena`,client_reference_id:booking.id,
      metadata:{type:'coaching_appointment',appointmentId:booking.id,locale,currency,...(booking.payment_flow==='authorize_confirm'?{paymentFlow:'authorize_confirm'}:{})},payment_intent_data:{description:locale==='cs'?'Koučink':'Coaching',receipt_email:booking.email,...(booking.payment_flow==='authorize_confirm'?{capture_method:'manual' as const}:{}),metadata:{type:'coaching_appointment',appointmentId:booking.id,locale,currency,...(booking.payment_flow==='authorize_confirm'?{paymentFlow:'authorize_confirm'}:{})}},locale,
    },{idempotencyKey:`coaching-${booking.id}-${booking.attempt}`});
    const attached=await db.rpc('appointment_attach_checkout',{...args,p_session:session.id});
    if(attached.error){if(session.status==='open')await stripe.checkout.sessions.expire(session.id).catch(()=>{});return NextResponse.json({error:'Termín sa zmenil. Obnovte rezervácie.'},{status:409});}
    return NextResponse.json({url:session.url});
  }catch{return NextResponse.json({error:'Platbu sa nepodarilo pripraviť. Skúste to znova; stav úhrady overujeme cez Stripe.'},{status:503});}
}
