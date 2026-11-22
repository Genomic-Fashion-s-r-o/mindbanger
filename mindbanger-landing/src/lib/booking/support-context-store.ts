import 'server-only';
import {getServiceSupabase} from '@/lib/supabase-service';
import {decryptSupportContext} from './support-context-crypto';
import {TREATMENT_SUPPORT_ID} from './support-context-policy';
export async function getSupportBooking(id:string,user?:string){let q=getServiceSupabase().from('appointments').select('id,user_id,service_id,status,starts_at').eq('id',id).eq('kind','booking').eq('service_id',TREATMENT_SUPPORT_ID);if(user)q=q.eq('user_id',user);const {data,error}=await q.maybeSingle();if(error)throw Error('support_context_unavailable');return data;}
export async function readSupportContext(id:string,user:string){const {data,error}=await getServiceSupabase().from('appointment_support_context').select('ciphertext,expires_at,consent_at,consent_version').eq('appointment_id',id).eq('user_id',user).gt('expires_at',new Date().toISOString()).maybeSingle();if(error)throw Error('support_context_unavailable');return data?{text:decryptSupportContext(data.ciphertext,id,user),expiresAt:data.expires_at,consentAt:data.consent_at,consentVersion:data.consent_version}:null;}
export async function purgeSupportContexts(){const {error}=await getServiceSupabase().rpc('appointment_support_purge');if(error)throw Error('support_context_cleanup_failed');}
