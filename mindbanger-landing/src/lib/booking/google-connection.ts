import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { getServiceSupabase } from '@/lib/supabase-service';
export const GOOGLE_OWNER='miroslav.jobus@gmail.com';
export const GOOGLE_SCOPES=['openid','email','https://www.googleapis.com/auth/calendar.events.owned','https://www.googleapis.com/auth/calendar.calendars.readonly'];
function key(){const raw=process.env.GOOGLE_CALENDAR_TOKEN_KEY;if(!raw)throw Error('google_token_key_missing');const k=Buffer.from(raw,'base64');if(k.length!==32)throw Error('google_token_key_invalid');return k;}
export function encryptGoogleToken(token:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);const encrypted=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64');}
export function decryptGoogleToken(value:string){const b=Buffer.from(value,'base64');if(b.length<29)throw Error('google_token_invalid');const cipher=createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));cipher.setAuthTag(b.subarray(12,28));return Buffer.concat([cipher.update(b.subarray(28)),cipher.final()]).toString('utf8');}
export async function googleRefreshToken(){
 const {data,error}=await getServiceSupabase().from('appointment_google_connection').select('owner_email,encrypted_refresh_token,scope').eq('id',1).maybeSingle();
 if(error||!data||data.owner_email.toLowerCase()!==GOOGLE_OWNER||!GOOGLE_SCOPES.filter(scope=>scope.includes('/auth/calendar.')).every(scope=>String(data.scope||'').split(' ').includes(scope)))throw Error('google_calendar_not_connected');return decryptGoogleToken(data.encrypted_refresh_token);
}
export function googleOAuthConfigured(){return !!(process.env.GOOGLE_CALENDAR_CLIENT_ID&&process.env.GOOGLE_CALENDAR_CLIENT_SECRET&&process.env.GOOGLE_CALENDAR_TOKEN_KEY);}
