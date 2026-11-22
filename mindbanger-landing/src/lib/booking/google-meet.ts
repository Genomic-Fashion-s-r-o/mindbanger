import 'server-only';
import { createHash } from 'node:crypto';
import { googleRefreshToken, googleOAuthConfigured, GOOGLE_OWNER } from './google-connection';

export type MeetingBooking = { id:string; starts_at:string; ends_at:string; customer_name:string|null; email:string|null; meeting_event_id?:string|null };
type GoogleEvent = { id:string; status?:string; etag?:string; hangoutLink?:string; conferenceData?:{createRequest?:{status?:{statusCode?:string}};entryPoints?:{entryPointType:string;uri:string}[]} };
let tokenCache:{value:string;until:number}|null=null;
let tokenRequest:Promise<string>|null=null;
async function accessToken(){
 if(tokenCache&&tokenCache.until>Date.now()+60000)return tokenCache.value;
 if(tokenRequest)return tokenRequest;
 tokenRequest=(async()=>{
  const id=process.env.GOOGLE_CALENDAR_CLIENT_ID,secret=process.env.GOOGLE_CALENDAR_CLIENT_SECRET,refresh=await googleRefreshToken();
  if(!id||!secret||!refresh)throw Error('google_calendar_not_connected');
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:id,client_secret:secret,refresh_token:refresh,grant_type:'refresh_token'}),signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!r.ok)throw Error('google_calendar_authorization_failed');
  const data=await r.json();if(typeof data.access_token!=='string')throw Error('google_calendar_authorization_failed');
  tokenCache={value:data.access_token,until:Date.now()+Math.min(Number(data.expires_in)||3600,3600)*1000};return data.access_token as string;
 })();
 try{return await tokenRequest;}finally{tokenRequest=null;}
}
export function meetingEventId(bookingId:string){return 'mb'+createHash('sha256').update(bookingId).digest('hex');}
export function googleCalendarId(){return process.env.GOOGLE_CALENDAR_ID||'primary';}
export function googleMeetUrl(event:GoogleEvent){
 const raw=event.hangoutLink||event.conferenceData?.entryPoints?.find(e=>e.entryPointType==='video')?.uri;
 if(!raw)return null;const u=new URL(raw);
 if(u.protocol!=='https:'||u.hostname!=='meet.google.com'||!/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(u.pathname))throw Error('invalid_meeting_url');
 return u.origin+u.pathname;
}
async function calendarRequest(path:string,init:RequestInit={}){
 const token=await accessToken();
 return fetch('https://www.googleapis.com/calendar/v3/'+path,{...init,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...init.headers},cache:'no-store',signal:AbortSignal.timeout(12000)});
}
const calendarPath=()=> 'calendars/'+encodeURIComponent(googleCalendarId());
export async function googleMeetReadiness(){
 if(!googleOAuthConfigured())return {ready:false,connected:false,configured:false,owner:GOOGLE_OWNER};
 try{await googleRefreshToken();}catch{return {ready:false,connected:false,configured:true,owner:GOOGLE_OWNER};}
 const r=await calendarRequest(calendarPath());if(!r.ok)throw Error('google_calendar_unavailable');const data=await r.json();
 const eligible=Array.isArray(data.conferenceProperties?.allowedConferenceSolutionTypes)&&data.conferenceProperties.allowedConferenceSolutionTypes.includes('hangoutsMeet');
 const ownerMatches=googleCalendarId()==='primary'&&String(data.id||'').toLowerCase()===GOOGLE_OWNER;
 return {ready:eligible&&ownerMatches,connected:true,configured:true,owner:GOOGLE_OWNER,ownerMatches,calendar:data.summary||'',meetAvailable:eligible};
}
export async function ensureGoogleMeet(b:MeetingBooking){
 if(!b.email)throw Error('missing_client_email');
 const id=b.meeting_event_id||meetingEventId(b.id),path=calendarPath()+'/events/'+id;
 let r=await calendarRequest(path);
 if(r.status===404){
  r=await calendarRequest(calendarPath()+'/events?conferenceDataVersion=1&sendUpdates=none',{method:'POST',body:JSON.stringify({id,summary:'Mindbanger · Individuálny online coaching',description:'Súkromné online stretnutie · '+Math.round((Date.parse(b.ends_at)-Date.parse(b.starts_at))/60000)+' minút. Číslo rezervácie: '+b.id,visibility:'private',guestsCanInviteOthers:false,guestsCanSeeOtherGuests:false,start:{dateTime:b.starts_at,timeZone:'Europe/Bratislava'},end:{dateTime:b.ends_at,timeZone:'Europe/Bratislava'},conferenceData:{createRequest:{requestId:id,conferenceSolutionKey:{type:'hangoutsMeet'}}},extendedProperties:{private:{mindbangerBookingId:b.id}}})});
  if(r.status===409)r=await calendarRequest(path);
 }
 if(!r.ok)throw Error('google_meeting_creation_failed');let event=await r.json() as GoogleEvent;
 if(event.status==='cancelled')throw Error('google_meeting_cancelled');
 // Keep a stable event and conference when a paid appointment is rescheduled.
 const update=await calendarRequest(path+'?conferenceDataVersion=1&sendUpdates=none',{method:'PATCH',headers:event.etag?{'If-Match':event.etag}:{},body:JSON.stringify({start:{dateTime:b.starts_at,timeZone:'Europe/Bratislava'},end:{dateTime:b.ends_at,timeZone:'Europe/Bratislava'}})});
 if(!update.ok)throw Error('google_meeting_update_failed');event=await update.json();
 if(event.conferenceData?.createRequest?.status?.statusCode==='failure')throw Error('google_meeting_conference_failed');
 return {eventId:id,joinUrl:googleMeetUrl(event)};
}
export async function cancelGoogleMeet(b:MeetingBooking){
 const r=await calendarRequest(calendarPath()+'/events/'+(b.meeting_event_id||meetingEventId(b.id))+'?sendUpdates=none',{method:'DELETE'});
 if(!r.ok&&r.status!==404&&r.status!==410)throw Error('google_meeting_cancellation_failed');
}
