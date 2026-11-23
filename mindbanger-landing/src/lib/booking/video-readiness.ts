import 'server-only';
import {getServiceSupabase} from '@/lib/supabase-service';
import {googleMeetReadiness} from './google-meet';
import {zoomReadiness} from './zoom-connection';
export async function videoReadiness(bookingId?:string){
 const db=getServiceSupabase();let zoom=false;
 if(bookingId){const {data,error}=await db.from('appointments').select('meeting_provider').eq('id',bookingId).single();if(error)throw Error('video_provider_unavailable');zoom=data.meeting_provider==='zoom';}
 else {const {data,error}=await db.from('appointment_zoom_connection').select('active,tested_at').eq('id',1).maybeSingle();if(error)throw Error('video_provider_unavailable');zoom=!!(data?.active&&data.tested_at);}
 return zoom?zoomReadiness():googleMeetReadiness();
}
