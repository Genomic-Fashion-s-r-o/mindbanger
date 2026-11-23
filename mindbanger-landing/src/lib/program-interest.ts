import 'server-only';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {getServiceSupabase} from '@/lib/supabase-service';
export const interestHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export const interestToken=()=>randomBytes(32).toString('hex');
export const interestTokenValid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function interestBucket(ip:string){return createHmac('sha256',process.env.BREVO_API_KEY||'').update('sugar:'+new Date().toISOString().slice(0,13)+':'+ip).digest('hex');}
export async function purgeProgramInterest(){const {error}=await getServiceSupabase().rpc('program_interest_purge');if(error)throw Error('interest_cleanup_failed');}
