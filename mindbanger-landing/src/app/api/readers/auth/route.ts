import { after } from 'next/server';
import { processReaderWelcomes } from '@/lib/readers/welcome';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { sendEmail } from '@/lib/email';
import { ADMIN_EMAILS } from '@/lib/booking/admin';
import { currentReader,ownsEmail,result,hashToken,hashEmail,editionById,registrationOpen,ReaderError } from '@/lib/readers/store';
import { body,origin,json,failure } from '@/lib/readers/http';
import { readerLocale,readerText } from '@/lib/readers/locale';
import { READER_TERMS,escapeHtml } from '@/lib/readers/model';
export const maxDuration=30;
const schema=z.object({email:z.email().trim().toLowerCase().max(254),locale:z.string().max(35),editionId:z.uuid().optional(),registration:z.boolean().default(false),sourceCode:z.string().regex(/^[a-z0-9-]{3,60}$/).optional(),accepted:z.boolean().default(false),marketing:z.boolean().default(false)}).strict();
export async function POST(request:Request){try{origin(request);const parsed=schema.safeParse(await body(request));if(!parsed.success)throw new ReaderError('reader_invalid_input');const input=parsed.data,locale=readerLocale(input.locale);if(locale!==input.locale)throw new ReaderError('reader_invalid_locale');
 const db=getServiceSupabase(),user=await currentReader();
 if(input.sourceCode&&!input.registration)throw new ReaderError('reader_invalid_input');
 if(input.registration){if(!input.accepted)throw new ReaderError('reader_terms_required');if(!(await registrationOpen()).registrations_enabled)throw new ReaderError('reader_registration_closed',503);if(input.sourceCode&&!result(await db.from('reader_sources').select('code').eq('code',input.sourceCode).eq('active',true).maybeSingle()))throw new ReaderError('reader_source_unavailable',404);}
 if(input.editionId){if(!input.accepted)throw new ReaderError('reader_terms_required');if(!(await registrationOpen()).registrations_enabled)throw new ReaderError('reader_registration_closed',503);await editionById(input.editionId,true);}
 if(ADMIN_EMAILS.includes(input.email)&&(!user||user.email?.toLowerCase()!==input.email))throw new ReaderError('reader_use_existing_login',403);
 const ip=(request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'local').split(',')[0].trim();
 if(!result(await db.rpc('appointment_rate_limit',{p_email_key:hashEmail(input.email),p_ip_key:hashEmail('ip:'+ip)})))throw new ReaderError('reader_rate_limit',429);
 const token=randomBytes(32).toString('hex');
 result(await db.from('reader_join_intents').insert({token_hash:hashToken(token),email_hash:hashEmail(input.email),edition_id:input.editionId||null,locale,marketing:(!!input.editionId||input.registration)&&input.marketing,registration:input.registration,source_code:input.sourceCode||null,terms_version:READER_TERMS}));
 if(user&&ownsEmail(user)&&user.email?.toLowerCase()===input.email){result(await db.rpc('reader_claim',{p_user:user.id,p_token_hash:hashToken(token),p_email_hash:hashEmail(user.email)}));after(async()=>{try{await processReaderWelcomes(user.id);}catch{console.error('Reader welcome processing failed');}});return json({redirect:'/readers/'+locale+'/library'});}
 if(!process.env.BREVO_API_KEY)throw new ReaderError('reader_email_unavailable',503);
 const generated=await db.auth.admin.generateLink({type:'magiclink',email:input.email});if(generated.error||!generated.data.properties?.hashed_token)throw new ReaderError('reader_email_unavailable',503);
 const t=readerText(locale),url=new URL('/readers/'+locale+'/verify',process.env.NEXT_PUBLIC_SITE_URL||'https://www.mindbanger.com');url.hash=new URLSearchParams({token_hash:generated.data.properties.hashed_token,intent:token}).toString();
 const html=`<!doctype html><html lang="${locale}"><body style="font-family:Arial,sans-serif;color:#25473d;padding:32px;max-width:580px;margin:auto"><p style="font-size:22px">Mindbanger Readers</p><h1>${escapeHtml(t.emailSubject)}</h1><p style="font-size:18px;line-height:1.6">${escapeHtml(t.emailIntro)}</p><p><a style="display:inline-block;background:#25473d;color:white;padding:16px 24px;border-radius:8px" href="${escapeHtml(url.href)}">${escapeHtml(t.confirm)}</a></p><p>${escapeHtml(t.emailIgnore)}</p></body></html>`;
 const sent=await sendEmail({to:input.email,subject:t.emailSubject,html});if(!sent.success)throw new ReaderError('reader_email_unavailable',503);return json({sent:true});
}catch(error){return failure(error);}}
