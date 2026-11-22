import 'server-only';
import {createHmac} from 'node:crypto';
import {getServiceSupabase} from './supabase-service';

export function timeRequestBucket(ip:string) {
  const secret=process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw Error('request_configuration_unavailable');
  return createHmac('sha256',secret).update('time-request:'+new Date().toISOString().slice(0,13)+':'+ip).digest('hex');
}
export async function purgeTimeRequests() {
  const {error}=await getServiceSupabase().rpc('appointment_time_requests_purge');
  if(error) throw Error('time_request_cleanup_unavailable');
}
