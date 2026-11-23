import {portalLocale} from '@/lib/portal-locale-server';
import {portalPath} from '@/lib/portal-locale';
import { createHmac,randomBytes } from 'node:crypto';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { sendEmail } from '@/lib/email';
import { clientLoginEmail } from '@/lib/client-login-email';
import { CLIENT_TERMS_VERSION } from '@/lib/client-platform';
import { assertOrigin,failure,json,readJson } from '@/lib/online-programs/http';
import { checked,ProgramError } from '@/lib/online-programs/store';
import { emailHash,ticketHash } from '@/lib/member-funnels/store';
const schema=z.object({slug:z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100),email:z.email().trim().toLowerCase().max(254),accepted:z.literal(true),termsVersion:z.literal(CLIENT_TERMS_VERSION)}).strict();
export async function POST(request:Request){try{
 assertOrigin(request);const parsed=schema.safeParse(await readJson(request,5000));if(!parsed.success)throw new ProgramError('Zadaj email a potvrď podmienky bezplatného účtu.');
 if(!process.env.BREVO_API_KEY)throw new ProgramError('Prihlasovací email sa teraz nepodarilo odoslať.',503);
 const input=parsed.data,db=getServiceSupabase();
 const ip=(request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'local').split(',')[0].trim();
 const hash=(s:string)=>createHmac('sha256',process.env.SUPABASE_SERVICE_ROLE_KEY!).update(s).digest('hex');
 if(!checked(await db.rpc('appointment_rate_limit',{p_email_key:hash('auth-email:'+input.email),p_ip_key:hash('auth-ip:'+ip)})))throw new ProgramError('Chvíľu počkaj pred vyžiadaním ďalšieho odkazu.',429);
 const f=checked(await db.from('member_funnels').select('id,asset_id').eq('slug',input.slug).eq('active',true).maybeSingle());if(!f?.asset_id)throw new ProgramError('Tento bonus momentálne nie je dostupný.',404);
 const token=randomBytes(32).toString('hex');
 checked(await db.from('member_funnel_registrations').insert({funnel_id:f.id,token_hash:ticketHash(token),email_hash:emailHash(input.email),terms_version:CLIENT_TERMS_VERSION,locale:await portalLocale()}));
 const {data,error}=await db.auth.admin.generateLink({type:'magiclink',email:input.email});
 if(error||!data.properties?.hashed_token)throw new ProgramError('Prihlasovací email sa nepodarilo pripraviť.',503);
 const message=clientLoginEmail(process.env.NEXT_PUBLIC_SITE_URL||'https://www.mindbanger.com',data.properties.hashed_token,portalPath('/vitaj/'+token,await portalLocale()),await portalLocale());
 const sent=await sendEmail({to:input.email,...message});if(!sent.success)throw new ProgramError('Prihlasovací email sa nepodarilo odoslať. Skús to znova.',503);
 return json({ok:true});
}catch(error){return failure(error);}}
