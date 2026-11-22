'use client';
import {analyticsPage,cleanAnalyticsEvent} from './analytics-schema';
import {CONSENT_KEY,readAnalyticsConsent,marketingCampaign} from './marketing';
const campaignKey='mindbanger-ga-campaign-v1',dedupKey='mindbanger-ga-completed-v1';
type Pending={pageId:string;name:string;values:Record<string,string|number>};
let pending:Pending[]=[];
export function analyticsGranted(){try{return readAnalyticsConsent(localStorage.getItem(CONSENT_KEY))===true;}catch{return false;}}
export function clearAnalyticsState(){pending=[];try{sessionStorage.removeItem(campaignKey);sessionStorage.removeItem(dedupKey);}catch{/* Storage may be blocked. */}}
export function analyticsCampaign(){
 if(!analyticsGranted())return {};
 const incoming=marketingCampaign(location.search);
 try{
  if(Object.keys(incoming).length){sessionStorage.setItem(campaignKey,JSON.stringify({at:Date.now(),values:incoming}));return incoming;}
  const saved=JSON.parse(sessionStorage.getItem(campaignKey)||'null');
  if(saved&&Date.now()-saved.at<30*60*1000&&saved.at<=Date.now()){
   const params=new URLSearchParams();for(const [k,v] of Object.entries(saved.values||{}))params.set(k.replace('campaign_','utm_'),String(v));
   // campaign_name uses utm_campaign, not utm_name.
   if(params.has('utm_name')){params.set('utm_campaign',params.get('utm_name')!);params.delete('utm_name');}
   return marketingCampaign(params.toString());
  }
 }catch{/* Measurement never blocks the page. */}
 return {};
}
export function trackAnalytics(name:string,values:Record<string,unknown>={},onceKey?:string){
 if(typeof window==='undefined'||!analyticsGranted())return false;
 const page=analyticsPage(location.pathname),event=cleanAnalyticsEvent(name,values);if(!page||!event)return false;
 if(onceKey){try{const prior=JSON.parse(sessionStorage.getItem(dedupKey)||'[]') as string[];const key=name+':'+onceKey;if(prior.includes(key))return false;sessionStorage.setItem(dedupKey,JSON.stringify([...prior.slice(-199),key]));}catch{/* In-memory queue remains safe when storage is disabled. */}}
 pending.push({pageId:page.id,...event});pending=pending.slice(-50);window.dispatchEvent(new Event('mindbanger-analytics-event'));return true;
}
export function drainAnalytics(pageId:string){const events=pending.filter(e=>e.pageId===pageId);pending=[];return events;}
