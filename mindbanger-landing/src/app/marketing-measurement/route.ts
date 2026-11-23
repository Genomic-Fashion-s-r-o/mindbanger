import {randomBytes} from 'node:crypto';
import {ANALYTICS_ID} from '@/lib/marketing';
import {analyticsPages,analyticsEventRules} from '@/lib/analytics-schema';
export const dynamic='force-dynamic';
export function GET(){
 const nonce=randomBytes(18).toString('base64');
 const script=`
 const id=${JSON.stringify(ANALYTICS_ID)},pages=${JSON.stringify(analyticsPages)},events=${JSON.stringify(analyticsEventRules)},canonical='https://www.mindbanger.com';
 let initialized=false,current='',context={};
 window.dataLayer=[];function gtag(){dataLayer.push(arguments);}
 gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',false);
 addEventListener('message',event=>{
  if(!['mindbanger.com','www.mindbanger.com'].includes(location.hostname)||parent===window||event.source!==parent||event.origin!==location.origin)return;
  const m=event.data,v=m?.values;if(m?.type!=='mindbanger-analytics'||!v||typeof v!=='object')return;
  if(m.name==='init'){
   if(!Object.hasOwn(pages,v.page_id)||!['sk','cs'].includes(v.locale))return;
   const key=v.locale+':'+v.page_id;if(current===key)return;
   const p=pages[v.page_id],path=(v.locale==='cs'?'/cz':'')+(p.path==='/'&&v.locale==='cs'?'':p.path);
   const settings={page_location:canonical+path,page_title:p.title,page_id:v.page_id,page_group:p.group,language:v.locale,page_referrer:'',send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:5184000,cookie_update:false};
   if(Object.hasOwn(pages,v.previous_id))settings.page_referrer=canonical+(v.locale==='cs'?'/cz':'')+pages[v.previous_id].path;
   else if(typeof v.page_referrer==='string'&&/^https:\\/\\/([a-z0-9-]+\\.)*(google\\.[a-z.]+|facebook\\.com|instagram\\.com|bing\\.com|t\\.co)$/.test(v.page_referrer))settings.page_referrer=v.page_referrer;
   for(const key of ['campaign_source','campaign_medium','campaign_name','campaign_id','campaign_content','campaign_term'])if(typeof v[key]==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v[key]))settings[key]=v[key];
   gtag('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   gtag('set',{page_location:settings.page_location,page_title:settings.page_title,page_referrer:settings.page_referrer,page_id:settings.page_id,page_group:settings.page_group,language:settings.language});
   context={page_location:settings.page_location,page_title:settings.page_title,page_referrer:settings.page_referrer,page_id:settings.page_id,page_group:settings.page_group,language:settings.language};
   if(initialized)settings.update=true;
   else{initialized=true;gtag('js',new Date());}
   gtag('config',id,settings);current=key;gtag('event','page_view',{...context});
   if(!document.getElementById('google-tag')){const tag=document.createElement('script');tag.id='google-tag';tag.async=true;tag.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.appendChild(tag);}return;
  }
  if(!initialized)return;const clean={};
  if(m.name==='page_progress'){if(!Number.isInteger(v.active_seconds)||v.active_seconds<0||v.active_seconds>86400||!Number.isInteger(v.scroll_percent)||v.scroll_percent<0||v.scroll_percent>100)return;clean.active_seconds=v.active_seconds;clean.scroll_percent=v.scroll_percent;}
  else{if(!Object.hasOwn(events,m.name))return;for(const [key,allowed] of Object.entries(events[m.name])){if(!allowed.includes(v[key]))return;clean[key]=v[key];}}
  gtag('event',m.name,{...context,...clean});
 });`;
 return new Response(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Mindbanger – meranie</title></head><body><script nonce="${nonce}">${script}</script></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}' https://www.googletagmanager.com; connect-src https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; img-src https://*.google-analytics.com https://*.analytics.google.com; frame-ancestors 'self'; base-uri 'none'; form-action 'none'`}});
}
