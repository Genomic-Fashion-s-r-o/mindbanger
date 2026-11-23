import 'server-only';
import {getServiceSupabase} from '@/lib/supabase-service';
import {zoomConnection,zoomRequest,type ZoomCredentials} from './zoom-connection';
import {meetingProvider} from './meeting-link';
import type {MeetingBooking} from './google-meet';

export function zoomMeetingBody(b:Pick<MeetingBooking,'id'|'starts_at'|'ends_at'>){
 return {topic:'Mindbanger · Online stretnutie',agenda:'Mindbanger booking '+b.id,type:2,start_time:new Date(b.starts_at).toISOString(),timezone:'Europe/Bratislava',duration:Math.ceil((Date.parse(b.ends_at)-Date.parse(b.starts_at))/60000),settings:{use_pmi:false,waiting_room:true,join_before_host:false,meeting_authentication:false,auto_recording:'none',approval_type:2,participant_video:false,host_video:false}};
}
export function safeZoomMeeting(data:{id?:unknown;join_url?:unknown}){
 const id=String(data.id||''),url=typeof data.join_url==='string'?data.join_url:'';
 if(!/^\d{9,12}$/.test(id)||meetingProvider(url)!=='Zoom'||new URL(url).pathname!=='/j/'+id)throw Error('zoom_invalid_meeting');
 return {id,url};
}
async function credentials(){const c=await zoomConnection();if(!c)throw Error('zoom_not_connected');return c.credentials;}
export async function ensureZoomMeeting(b:MeetingBooking){
 const c=await credentials(),db=getServiceSupabase();
 const {data:m,error}=await db.rpc('appointment_zoom_begin',{p_id:b.id});
 if(error||!m)throw Error('zoom_state_unavailable');
 if(m.mode==='wait')throw Error('zoom_creation_pending');
 if(m.mode==='review')throw Error('zoom_manual_review');
 if(m.mode==='existing'){
  const r=await zoomRequest(c,'meetings/'+m.meetingId);
  if(!r.ok)throw Error('zoom_existing_unavailable');
  const d=await r.json();
  if(d.agenda!=='Mindbanger booking '+b.id||String(d.host_email||'').toLowerCase()!==c.hostEmail)throw Error('zoom_meeting_mismatch');
  const meeting=safeZoomMeeting(d);
  // Never replace a join link that has already been delivered.
  if(m.joinUrl&&m.joinUrl!==meeting.url)throw Error('zoom_join_link_changed');
  const update=await zoomRequest(c,'meetings/'+m.meetingId,{method:'PATCH',body:JSON.stringify({start_time:new Date(b.starts_at).toISOString(),timezone:'Europe/Bratislava',duration:zoomMeetingBody(b).duration})});
  if(!update.ok)throw Error('zoom_update_failed');
  const save=await db.from('appointment_zoom_meetings').update({join_url:meeting.url,state:'ready',updated_at:new Date().toISOString()}).eq('appointment_id',b.id).eq('meeting_id',meeting.id);
  if(save.error)throw Error('zoom_save_failed');
  return {eventId:'zoom:'+meeting.id,joinUrl:meeting.url};
 }
 try{
  const r=await zoomRequest(c,'users/'+encodeURIComponent(c.hostEmail)+'/meetings',{method:'POST',body:JSON.stringify(zoomMeetingBody(b))});
  if(!r.ok){
   // These responses explicitly reject creation. Unknown server outcomes remain in review.
   if([400,401,403,404,429].includes(r.status)){
    await db.from('appointment_zoom_meetings').update({state:'queued',lease:null,lease_until:null}).eq('appointment_id',b.id).eq('lease',m.lease);
   }
   throw Error('zoom_creation_failed');
  }
  const meeting=safeZoomMeeting(await r.json()); // Ignores the privileged host start_url.
  const save=await db.from('appointment_zoom_meetings').update({meeting_id:meeting.id,join_url:meeting.url,state:'ready',lease:null,lease_until:null,updated_at:new Date().toISOString()}).eq('appointment_id',b.id).eq('lease',m.lease).select('appointment_id');
  if(save.error||save.data?.length!==1)throw Error('zoom_save_failed');
  return {eventId:'zoom:'+meeting.id,joinUrl:meeting.url};
 }catch{
  await db.from('appointment_zoom_meetings').update({state:'review',lease:null,lease_until:null,updated_at:new Date().toISOString()}).eq('appointment_id',b.id).eq('lease',m.lease);
  throw Error('zoom_creation_incomplete');
 }
}
export async function cancelZoomMeeting(b:MeetingBooking){
 const db=getServiceSupabase(),{data:m,error}=await db.from('appointment_zoom_meetings').select('meeting_id,state').eq('appointment_id',b.id).maybeSingle();
 if(error)throw Error('zoom_state_unavailable');
 if(!m||m.state==='queued'||m.state==='cancelled')return;
 if(!m.meeting_id)throw Error('zoom_manual_review');
 const r=await zoomRequest(await credentials(),'meetings/'+m.meeting_id,{method:'DELETE'});
 if(!r.ok&&r.status!==404)throw Error('zoom_cancellation_failed');
 const saved=await db.from('appointment_zoom_meetings').update({state:'cancelled',updated_at:new Date().toISOString()}).eq('appointment_id',b.id);
 if(saved.error)throw Error('zoom_save_failed');
}
// A real API test without a reservation, invitation, payment or client information.
export async function testZoom(c:ZoomCredentials,id:string){
 let meetingId:string|null=null,cleaned=false;
 try{
  const r=await zoomRequest(c,'users/'+encodeURIComponent(c.hostEmail)+'/meetings',{method:'POST',body:JSON.stringify(zoomMeetingBody({id,starts_at:new Date(Date.now()+3600000).toISOString(),ends_at:new Date(Date.now()+3900000).toISOString()}))});
  if(!r.ok)throw Error('zoom_test_creation_failed');
  const d=await r.json();
  if(/^\d{9,12}$/.test(String(d.id)))meetingId=String(d.id);
  safeZoomMeeting(d);
  const check=await zoomRequest(c,'meetings/'+meetingId);
  if(!check.ok)throw Error('zoom_test_read_failed');
  const read=await check.json();if(read.agenda!=='Mindbanger booking '+id||String(read.host_email||'').toLowerCase()!==c.hostEmail)throw Error('zoom_test_mismatch');
  const update=await zoomRequest(c,'meetings/'+meetingId,{method:'PATCH',body:JSON.stringify({duration:5})});
  if(!update.ok)throw Error('zoom_test_update_failed');
 }finally{
  if(meetingId){const r=await zoomRequest(c,'meetings/'+meetingId,{method:'DELETE'});cleaned=r.ok||r.status===404;}
  if(!cleaned)throw Error('zoom_test_cleanup_required');
 }
}
