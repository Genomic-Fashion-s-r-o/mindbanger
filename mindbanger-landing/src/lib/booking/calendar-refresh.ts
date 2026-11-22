const channelName='mindbanger-booking-availability';
const changedEvent='mindbanger:booking-availability-changed';
// Only a public invalidation signal crosses tabs: never booking IDs or contacts.
export function notifyCalendarAvailability(){
 if(typeof window==='undefined')return;
 try{const channel=new BroadcastChannel(channelName);channel.postMessage('changed');channel.close();}
 catch{window.dispatchEvent(new Event(changedEvent));/* Other tabs still refresh on focus/interval. */}
}
export function watchCalendarAvailability(refresh:()=>void){
 let channel:BroadcastChannel|undefined,last=-Infinity,pending:ReturnType<typeof setTimeout>|undefined;
 const run=()=>{if(document.visibilityState==='hidden')return;last=Date.now();refresh();};
 const request=()=>{
  if(document.visibilityState==='hidden'||pending)return;
  // Coalesce focus/visibility/channel bursts, but retain a trailing update so
  // a quick cancellation after creation cannot be lost.
  const remaining=1000-(Date.now()-last);
  if(remaining<=0)run();else pending=setTimeout(()=>{pending=undefined;run();},remaining);
 };
 window.addEventListener('focus',request);
 window.addEventListener(changedEvent,request);
 document.addEventListener('visibilitychange',request);
 const timer=window.setInterval(request,60000);
 try{channel=new BroadcastChannel(channelName);channel.onmessage=e=>{if(e.data==='changed')request();};}catch{/* Optional cross-tab acceleration. */}
 return()=>{window.removeEventListener('focus',request);window.removeEventListener(changedEvent,request);document.removeEventListener('visibilitychange',request);window.clearInterval(timer);if(pending)clearTimeout(pending);channel?.close();};
}
