import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import Stripe from 'stripe';
import stripe from '@/lib/stripe';
import { sendEmail } from '@/lib/email';
import { welcomeEmailTemplates, generateEmailHtml } from '@/lib/email-templates';
import { sendB2BInviteEmail } from '@/lib/b2b-services';

// Zmena na citanie secretov tak aby bral aj fallback
export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');
  
  if (!signature) {
    return new NextResponse('Missing stripe-signature header', { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    return new NextResponse('Webhook secret is missing in env', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Signature Error: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = await createAdminClient();

  // 1. Webhook Globally Idempotent Guard (Atomic)
  try {
    const { error: insertError } = await supabase.from('processed_stripe_events').insert({ id: event.id, status: 'processing' });
    if (insertError) {
      // 23505 is the Postgres error code for unique violation
      if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
         const { data: existing } = await supabase.from('processed_stripe_events').select('status').eq('id', event.id).single();
         if (existing?.status === 'processing') {
             // Another instance is currently processing this event. Return 409 to trigger a later Stripe retry.
             return new NextResponse('Event currently processing', { status: 409 });
         }
         console.log(`[Stripe Webhook] Event ${event.id} already processed. Skipping.`);
         return new NextResponse('Duplicate Event Skipped', { status: 200 });
      }
      console.error('Idempotency Insert Error:', insertError);
      return new NextResponse('Database Error during Idempotency Check', { status: 500 });
    }
  } catch (pgErr: any) {
    console.error('Idempotency Check Error:', pgErr);
    return new NextResponse('Internal Idempotency Error', { status: 500 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // --- B2B HANDLING START ---
        if (session.metadata?.type === 'b2b_subscription') {
           const meta = session.metadata;
           
           // 1. Create Organization
           const { data: org, error: orgError } = await supabase.from('organizations').upsert({
              name: meta.company_name,
              tax_id: meta.tax_id,
              vat_id: meta.vat_id,
              billing_email: meta.contact_email,
              contact_person: meta.contact_name,
              industry: 'General', // Default, editable later
              subscription_status: 'active',
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              seats_limit: parseInt(meta.seats || '5'),
           }, { onConflict: 'stripe_subscription_id' }).select().single();

           if (orgError) {
              console.error('B2B Org Creation Error:', orgError);
              return new NextResponse('Org Creation Failed', { status: 500 });
           }

           // 2. Add Representative as Owner (Invite)
           // Check if user exists
           const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', meta.contact_email).single();
           
           const userId = existingUser?.id;

           // Helper: Create Member (Idempotent)
           if (org) {
             await supabase.from('organization_members').upsert({
                organization_id: org.id,
                user_id: userId || null, // If null, they are just invited by email
                email: meta.contact_email,
                role: 'owner',
                status: existingUser ? 'active' : 'invited'
             }, { onConflict: 'organization_id,email' });
           }

           // 3. Send Welcome Email (B2B Specific)
           // We reuse the email logic but with B2B template
           const b2bSubject = meta.lang === 'sk' ? 'Vitajte v Mindbanger B2B' : 'Welcome to Mindbanger B2B';
           // ... (Email sending logic would go here - simplified for now)
           
           break; // Let the event be marked as processed at the end
        }
        // --- B2B HANDLING END ---

        // --- B2B UPGRADE HANDLING START ---
        if (session.metadata?.type === 'b2b_upgrade') {
           const meta = session.metadata;
           const orgId = meta.org_id;

           // 1. Get the pending emails from the organization table
           const { data: orgData } = await supabase.from('organizations').select('pending_invites, seats_limit').eq('id', orgId).single();
           
           if (orgData) {
             const pendingEmails = (orgData.pending_invites as string[]) || [];
             const newSeatsLimit = orgData.seats_limit + parseInt(meta.seats || '0');

             // 2. Update organization stats and clean pending
             await supabase.from('organizations').update({
               seats_limit: newSeatsLimit,
               subscription_status: 'active',
               pending_invites: [] // clear them
             }).eq('id', orgId);

             // 3. Create member records & invite
             if (pendingEmails.length > 0) {
               // Get inviter profile name
               const { data: adminMembers } = await supabase.from('organization_members').select('user_id').eq('organization_id', orgId).in('role', ['owner', 'admin']).limit(1);
               let inviterName = 'Admin';
               if (adminMembers && adminMembers.length > 0) {
                 const { data: invProfile } = await supabase.from('profiles').select('full_name').eq('id', adminMembers[0].user_id).single();
                 if (invProfile?.full_name) inviterName = invProfile.full_name;
               }

               for (const email of pendingEmails) {
                 const em = email.trim().toLowerCase();
                 // Create invitation via our existing internal invite API mechanism or manually 
                 // here. We'll do it manually to avoid NEXT_PUBLIC_SITE_URL issues inside webhook
                 
                 const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', em).single();
                 
                 // Upsert to handle event replays safely without triggering constraint violations
                 await supabase.from('organization_members').upsert({
                    organization_id: orgId,
                    user_id: existingUser?.id || null,
                    email: em,
                    role: 'member',
                    status: 'invited'
                 }, { onConflict: 'organization_id,email' });

                   // Send email via internal backend service
                   try {
                       await sendB2BInviteEmail(em, orgId, inviterName, 'sk');
                 } catch (e) {
                     console.error('Failed to dispatch invite for', em, e);
                 }
               }
             }
           }
           
           break; // Let the event be marked as processed at the end
        }
        // --- B2B UPGRADE HANDLING END ---

        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          await supabase.from('subscriptions').upsert({
            id: subscriptionId,
            user_id: userId,
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            current_period_end: new Date(((subscription as any).current_period_end || (subscription.items.data[0] as any).current_period_end) * 1000).toISOString(),
            country: session.customer_details?.address?.country || 'Unknown',
            amount_total: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || 'eur',
            customer_email: session.customer_details?.email || ''
          });

          // --- PAYOUT AND AFFILIATE HANDLING START ---
          if (session.metadata?.refCode || session.metadata?.affiliate_id || session.metadata?.affiliateId) {
             try {
                const rawRef = session.metadata?.affiliate_id || session.metadata?.affiliateId || session.metadata?.refCode;
                // mapping A/B to proper commission models
                let commissionModel = 'second_month';
                if (session.metadata?.refMode === 'B' || session.metadata?.refMode === 'lifetime') {
                   commissionModel = 'lifetime_20';
                }
                
                const { data: affiliate } = await supabase.from('affiliates').select('id, user_id').or(`id.eq.${rawRef},user_id.eq.${rawRef}`).single();
                
                if (affiliate && affiliate.user_id !== userId) {
                   const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
                   let commissionAmountVal = amountTotal * 0.20; // fallback calculation

                   if (commissionModel === 'lifetime_20') {
                      commissionAmountVal = amountTotal * 0.20;
                   } else {
                      // second_month model tracks the full subscription amount as the base to calculate the 100% second month payload
                      commissionAmountVal = amountTotal;
                   }

                   const initialStatus = commissionModel === 'second_month' ? 'waiting_second_month' : 'pending';
                   
                   // Store concrete logical subscription key to safely link multiple different subscriptions
                   // to correct payout entries. Stripe sessions represent checkout for specific sub lines.
                   const subKey = subscriptionId || session.id;

                   await supabase.from('referrals').upsert({
                      affiliate_id: affiliate.id,
                      referee_user_id: userId || null, 
                      commission_model: commissionModel,
                      status: initialStatus,
                      commission_amount: commissionAmountVal,
                      stripe_session_id: subKey,
                   }, { onConflict: 'stripe_session_id' });
                   console.log('Affiliate referral verified and inserted for session:', session.id, 'Status:', initialStatus, 'SubKey:', subKey);
                }
             } catch (affErr) {
                console.error('Affiliate Tracking Hook Error:', affErr);
             }
          }
          // --- PAYOUT AND AFFILIATE HANDLING END ---

try {
              const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
              const updatePayload: any = { subscription_status: 'premium' };
              if (customerId) {
                updatePayload.stripe_customer_id = customerId;
              }
              
              const stripeName = session.customer_details?.name;
              if (stripeName) {
                const currentName = prof?.full_name;
                if (!currentName || currentName.includes('@') || currentName.trim() === '') {
                  updatePayload.full_name = stripeName;
                }
              }
              
              await supabase.from('profiles').update(updatePayload).eq('id', userId);
            } catch (e) {
              console.error('Error updating profile with Stripe data:', e);
          }

          // Send welcome email via Resend
          const email = session.customer_details?.email;
          if (email) {
            let userLang = 'en';
            try {
              const { data: profile } = await supabase.from('profiles').select('preferred_language').eq('id', userId).single();
              if (profile?.preferred_language) userLang = profile.preferred_language;
            } catch (e) {
               console.error('Error fetching profile lang:', e);
            }
            
            const template = welcomeEmailTemplates[userLang as keyof typeof welcomeEmailTemplates] || welcomeEmailTemplates.en;

            // Vygenerujeme Magic Link
            let magicUrl = template.url;
            try {
              const { data: linkData } = await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email: email
              });
              if (linkData?.properties?.action_link) {
                // Keep the already-allowed Supabase callback; our 308 moves it to Daily.
                magicUrl = linkData.properties.action_link + "&redirect_to=https://www.mindbanger.com/auth/callback";
              }
            } catch (e) {
              console.error('Failed to generate magic link:', e);
            }

            const htmlContent = generateEmailHtml(template.headline, template.body, template.cta, magicUrl);

            const { success, error } = await sendEmail({
              to: email,
              subject: template.subject,
              html: htmlContent
            });
            
            if (!success) {
                console.error('Email sending error:', error);
            }
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.billing_reason === 'subscription_cycle') {
           // Používame striktne zákaznícku/subskripčnú väzbu na zabránenie nesúladu e-mailov vracajúcich inéo usera
           const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

           if (customerId) {
             let userProfile = null;
             const { data: profiles } = await supabase.from('profiles').select('id').eq('stripe_customer_id', customerId).limit(1);
             userProfile = profiles?.[0];
             
             if (userProfile?.id) {
               // 1. Spracovanie 'second_month'
               const targetSubscriptionId = (invoice as any).subscription as string | undefined;
               let query = supabase.from('referrals')
                  .select('id, stripe_session_id')
                  .eq('referee_user_id', userProfile.id)
                  .eq('commission_model', 'second_month')
                  .eq('status', 'waiting_second_month');

               // Match the exact subscription lineage if it exists so we safely process 
               // overlapping cycles per single user (e.g., they bought multiple things)
               if (typeof targetSubscriptionId === 'string') {
                   query = query.eq('stripe_session_id', targetSubscriptionId);
               }
                  
               const { data: waitingRefs } = await query.order('created_at', { ascending: true }).limit(1);
                  
               if (waitingRefs && waitingRefs.length > 0) {
                 // Pokiaľ by náhodou mal užívateľ multi-tier referrals (napr viacero active sessions s waiting_second_month), 
                 // odomkneme bezpečne iba jeden prislúchajúci najstaršiemu záznamu.
                 const targetRef = waitingRefs[0];
                 await supabase.from('referrals').update({ status: 'pending' }).eq('id', targetRef.id);
                 console.log(`Zmeneny status referralu ohladom second_month na pending po zaplateni dalsej faktury. Referral ID: ${targetRef.id}`);
               }

               // 2. Spracovanie 'lifetime_20' opakovanej platby
               const { data: lifetimeRefs } = await supabase.from('referrals')
                  .select('affiliate_id')
                  .eq('referee_user_id', userProfile.id)
                  .eq('commission_model', 'lifetime_20');
                  
               if (lifetimeRefs && lifetimeRefs.length > 0) {
                   // Odstranime duplicity affiliate_id aby sme nepridali proviziu viackrat za toho isteho uzivatela pre toho isteho affil partnera
                   const uniqueAffiliates = Array.from(new Set(lifetimeRefs.map((r: any) => r.affiliate_id)));
                   
                   const amountPaid = invoice.amount_paid ? invoice.amount_paid / 100 : 0;
                   if (amountPaid > 0) {
                      const commAmount = amountPaid * 0.20;

                      for (const affId of uniqueAffiliates) {
                        try {
                           await supabase.from('referrals').insert({
                              affiliate_id: affId,
                              referee_user_id: userProfile.id,
                              commission_model: 'lifetime_20',
                              status: 'pending',
                              commission_amount: commAmount,
                              stripe_session_id: `invoice_${invoice.id}_${affId}`,
                           });
                        } catch (e: any) {
                           if (e.code === '23505') {
                              // Duplicate stripe_session_id insert - already processed this invoice
                              continue;
                           }
                           console.error('Error inserting lifetime_20 recurring referral:', e);
                        }
                      }
                      console.log(`Pridana opakovana provizia lifetime_20 pre ${uniqueAffiliates.length} affiliate-ov. Invoice: ${invoice.id}, sum: ${commAmount}`);
                   }
                }
             }
           }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await supabase.from('subscriptions').upsert({
            id: subscription.id,
            user_id: userId,
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            current_period_end: new Date(((subscription as any).current_period_end || (subscription.items.data[0] as any).current_period_end) * 1000).toISOString(),
          });

          if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
             await supabase.from('profiles').update({ subscription_status: 'canceled' }).eq('id', userId);
          } else if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
             await supabase.from('profiles').update({ subscription_status: 'premium' }).eq('id', userId);
          }
        }
        break;
      }
    }
    
  } catch (err: any) {
    console.error(`Webhook Action Error: ${err.message}`, err);
    // CRITICAL FIX: If business logic fails, remove idempotency marker so Stripe can retry
    try {
      await supabase.from('processed_stripe_events').delete().eq('id', event.id);
    } catch (delErr) {
      console.error(`Failed to rollback idempotency marker for event ${event.id}:`, delErr);
    }
    return new NextResponse('Internal Webhook Logic Error', { status: 500 });
  }

  try {
    await supabase.from('processed_stripe_events').update({ status: 'completed' }).eq('id', event.id);
  } catch (updateErr) {
    console.error(`Failed to mark event ${event.id} as completed:`, updateErr);
  }

  return new NextResponse('Success', { status: 200 });
}
