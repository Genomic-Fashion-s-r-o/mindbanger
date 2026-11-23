import 'server-only';
import { createHash,createHmac } from 'node:crypto';
import { getServiceSupabase } from '@/lib/supabase-service';
import { createClient } from '@/lib/supabase-server';
import { checked,ProgramError,listClientPrograms } from '@/lib/online-programs/store';
import {portalLocale} from '@/lib/portal-locale-server';
import type { Funnel,BonusAccess } from './model';
export const ticketHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export const emailHash=(email:string)=>createHmac('sha256',process.env.SUPABASE_SERVICE_ROLE_KEY!).update('member-bonus:'+email.trim().toLowerCase()).digest('hex');
export async function authSessionId(){const db=await createClient();const {data,error}=await db.auth.getClaims();return !error&&typeof data?.claims.session_id==='string'?data.claims.session_id:null;}
export async function pendingFunnel(userId:string){const session=await authSessionId();if(!session)return null;return checked(await getServiceSupabase().rpc('member_funnel_gate',{p_user:userId,p_session:session})) as string|null;}
export async function publicFunnel(slug:string){
 const result=await getServiceSupabase().from('member_funnels').select('*').eq('slug',slug).eq('active',true).maybeSingle();
 if(result.error?.code==='42P01'||result.error?.code==='PGRST205')return null;
 const f=checked(result) as Funnel|null;
 const locale=await portalLocale(),translation=locale==='sk'?null:f?.translations?.[locale];return f?{slug:f.slug,title:translation?.enabled?translation.title:f.title,description:translation?.enabled?translation.description:f.description,contentFallback:locale!=='sk'&&!translation?.enabled}:null;
}
export async function memberMaterials(userId:string){const locale=await portalLocale();const rows=checked(await getServiceSupabase().from('member_funnel_access').select('id,title,description,acquired_at,content_snapshot').eq('user_id',userId).order('acquired_at',{ascending:false}));return rows.map(r=>({...r,...(r.content_snapshot?.[locale]?{title:r.content_snapshot[locale].title,description:r.content_snapshot[locale].description}:{})}));}
export async function bonusMaterial(userId:string,id:string){
 const db=getServiceSupabase();const access=checked(await db.from('member_funnel_access').select('*').eq('id',id).eq('user_id',userId).maybeSingle()) as BonusAccess|null;
 if(!access)throw new ProgramError('K tomuto materiálu nemáš prístup.',403);
 const locale=await portalLocale(),content=access.content_snapshot?.[locale]||access.content_snapshot?.sk;
 if(content){access.title=content.title;access.description=content.description;access.asset_id=content.assetId!;}
 const asset=checked(await db.from('online_program_assets').select('id,mime,name,path').eq('id',access.asset_id).eq('ready',true).single());
 return {access,asset,fallback:locale!=='sk'&&!access.content_snapshot?.[locale]};
}
export async function funnelView(userId:string,id:string){
 const {access}=await bonusMaterial(userId,id),db=getServiceSupabase();
 const funnel=checked(await db.from('member_funnels').select('*').eq('id',access.funnel_id).single()) as Funnel;
 const selling=checked(await db.rpc('member_funnel_can_offer',{p_user:userId,p_funnel:funnel.id})) as boolean;
 const catalog=await listClientPrograms(userId);const offer=catalog.offers.find(p=>p.id===funnel.program_id)||null;
 return {access:{id:access.id,title:access.title,description:access.description,expiresAt:access.offer_expires_at,introPrice:access.intro_cents,memberPrice:access.member_cents,standardPrice:access.standard_cents,value:access.value_cents},
  funnel:{title:(access.content_snapshot?.[await portalLocale()]||access.content_snapshot?.sk)?.offerTitle||funnel.offer_title,body:(access.content_snapshot?.[await portalLocale()]||access.content_snapshot?.sk)?.offerBody||funnel.offer_body,minutes:funnel.minutes},selling,offer,now:new Date().toISOString()};
}
export type FunnelView=Awaited<ReturnType<typeof funnelView>>;
