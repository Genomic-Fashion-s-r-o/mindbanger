import {portalLocale} from '@/lib/portal-locale-server';
import {portalPath} from '@/lib/portal-locale';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase-service';
import { CLIENT_TERMS_VERSION } from '@/lib/client-platform';
import { assertOrigin,failure,json,readJson } from '@/lib/online-programs/http';
import { checked,ProgramError } from '@/lib/online-programs/store';
import { ticketHash,emailHash } from '@/lib/member-funnels/store';
const schema=z.union([z.object({ticket:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),z.object({slug:z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100),accepted:z.literal(true),termsVersion:z.literal(CLIENT_TERMS_VERSION)}).strict()]);
export async function POST(request:Request){try{
 assertOrigin(request);const parsed=schema.safeParse(await readJson(request,5000));if(!parsed.success)throw new ProgramError('Neplatný odkaz na bonus.');
 const userDb=await createClient(),{data:{user},error}=await userDb.auth.getUser();
 if(error||!user?.email||!user.email_confirmed_at)throw new ProgramError('Najprv over svoj email prihlásením.',401);
 if('ticket' in parsed.data&&user.app_metadata.email_ownership==='unverified')throw new ProgramError('Tento odkaz otvor cez prihlasovacie tlačidlo vo svojom emaile.',403);
 const db=getServiceSupabase();let token:string;
 if('ticket' in parsed.data)token=parsed.data.ticket;
 else{
  const f=checked(await db.from('member_funnels').select('id,asset_id').eq('slug',parsed.data.slug).eq('active',true).maybeSingle());if(!f?.asset_id)throw new ProgramError('Bonus momentálne nie je dostupný.',404);
  token=randomBytes(32).toString('hex');checked(await db.from('member_funnel_registrations').insert({funnel_id:f.id,token_hash:ticketHash(token),email_hash:emailHash(user.email),terms_version:CLIENT_TERMS_VERSION,locale:await portalLocale()}));
 }
 const id=checked(await db.rpc('member_funnel_claim',{p_user:user.id,p_token_hash:ticketHash(token),p_email_hash:emailHash(user.email)}));
 return json({redirect:portalPath('/ucet/ponuka/'+id,await portalLocale())});
}catch(error){return failure(error);}}
