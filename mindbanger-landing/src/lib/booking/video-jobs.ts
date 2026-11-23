import 'server-only';
import { canUseMeeting } from './manual-model';
import { getServiceSupabase } from '@/lib/supabase-service';
import { ensureGoogleMeet, cancelGoogleMeet, type MeetingBooking } from './google-meet';
import {ensureZoomMeeting,cancelZoomMeeting} from './zoom-meet';
export async function processVideoJobs(limit=3){
 const db=getServiceSupabase();let ready=0,failed=0;
 for(let i=0;i<limit;i++){
  const {data:job,error}=await db.rpc('appointment_claim_video');
  if(error)throw Error('video_queue_unavailable');if(!job)break;
  const b=job.booking as MeetingBooking&{status:string;paid:boolean;funding_type?:string;meeting_provider?:string};
  try{
   const cancelled=!canUseMeeting(b);
   const zoom=b.meeting_provider==='zoom';
   const meeting=cancelled?(await (zoom?cancelZoomMeeting(b):cancelGoogleMeet(b)),{eventId:null,joinUrl:null}):await (zoom?ensureZoomMeeting(b):ensureGoogleMeet(b));
   if(!cancelled&&!meeting.joinUrl)throw Error('video_conference_pending');
   const result=await db.rpc('appointment_finish_video',{p_id:b.id,p_lease:job.lease,p_revision:job.revision,p_event:meeting.eventId,p_url:meeting.joinUrl,p_cancelled:cancelled});
   if(result.error)throw Error('video_save_failed');ready++;
  }catch{
   failed++;
   await db.from('appointment_video_jobs').update({lease:null,lease_until:null,available_at:new Date(Date.now()+60000).toISOString()}).eq('appointment_id',b.id).eq('lease',job.lease);
  }
 }
 return {ready,failed};
}
