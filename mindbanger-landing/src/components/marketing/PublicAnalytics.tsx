'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {CONSENT_KEY,ANALYTICS_CONSENT_VERSION,marketingPage,marketingReferrer,readAnalyticsConsent,readMarketingConsent,readAttributionConsent} from '@/lib/marketing';
import {analyticsSections} from '@/lib/analytics-schema';
import {analyticsGranted,analyticsCampaign,clearAnalyticsState,drainAnalytics} from '@/lib/analytics-client';
import './public-analytics.css';
import ClarityRecorder from './ClarityRecorder';
import {CLARITY_CONSENT_KEY,CLARITY_SUPPORT_CONSENT_KEY,clarityConsentKeyForPage,readClarityConsent,clarityChoiceForAction} from '@/lib/clarity-consent';

export default function PublicAnalytics(){
 const pathname=usePathname(),page=marketingPage(pathname),cs=page?.locale==='cs';
 const [consent,setConsent]=useState<boolean|null>(null),[marketing,setMarketing]=useState<boolean|null>(null),[attribution,setAttribution]=useState<boolean|null>(null);
 const [draftAnalytics,setDraftAnalytics]=useState(false),[draftMarketing,setDraftMarketing]=useState(false),[draftAttribution,setDraftAttribution]=useState(false);
 const [loaded,setLoaded]=useState(false),[open,setOpen]=useState(false),[ready,setReady]=useState(false);
 const [dismissed,setDismissed]=useState(false);
 const [clarity,setClarity]=useState<boolean|null>(null),[draftClarity,setDraftClarity]=useState(false);
 const frame=useRef<HTMLIFrameElement>(null),previous=useRef('');
 const path=page?.path,id=page?.id,locale=page?.locale;
 const clarityEligible=id==='program01'||id==='s03',clarityConsentKey=clarityConsentKeyForPage(id);
 const [clarityScope,setClarityScope]=useState('');
 useEffect(()=>{
  const sync=()=>{try{const raw=localStorage.getItem(CONSENT_KEY),ga=readAnalyticsConsent(raw),meta=readMarketingConsent(raw),attr=readAttributionConsent(raw);setConsent(ga);setMarketing(meta);setAttribution(attr);setDraftAnalytics(ga===true);setDraftMarketing(meta===true);setDraftAttribution(attr===true);if(ga!==true)clearAnalyticsState();}catch{setConsent(null);setMarketing(null);setAttribution(null);}setLoaded(true);};
  sync();window.addEventListener('storage',sync);window.addEventListener('mindbanger-consent-change',sync);
  return()=>{window.removeEventListener('storage',sync);window.removeEventListener('mindbanger-consent-change',sync);};
 },[]);
 useEffect(()=>{
  const sync=()=>{let choice:boolean|null=null;try{choice=readClarityConsent(localStorage.getItem(clarityConsentKey));}catch{/* Optional storage may be unavailable. */}setClarity(choice);setDraftClarity(choice===true);setClarityScope(clarityConsentKey);};
  sync();window.addEventListener('storage',sync);window.addEventListener('mindbanger-consent-change',sync);
  return()=>{window.removeEventListener('storage',sync);window.removeEventListener('mindbanger-consent-change',sync);};
 },[clarityConsentKey]);
 useEffect(()=>{if(!path||!consent)setReady(false);},[path,consent]);
 useEffect(()=>{
  if(!id||!path||!consent||!ready||!frame.current?.contentWindow)return;
  const target=frame.current.contentWindow,origin=location.origin;
  const send=(name:string,values:Record<string,string|number>={})=>{if(analyticsGranted())target.postMessage({type:'mindbanger-analytics',name,values},origin);};
  send('init',{page_id:id,locale:locale!,previous_id:previous.current,page_referrer:marketingReferrer(document.referrer),...analyticsCampaign()});previous.current=id;
  const flush=()=>{for(const event of drainAnalytics(id))send(event.name,event.values);};flush();
  let visibleAt:number|null=document.visibilityState==='visible'?performance.now():null,activeMs=0,maxScroll=0;
  const milestones=new Set<number>(),sections=new Set<string>(),videos=new WeakMap<HTMLVideoElement,Set<number>>();
  const seconds=()=>Math.floor((activeMs+(visibleAt===null?0:performance.now()-visibleAt))/1000);
  const progress=()=>send('page_progress',{active_seconds:Math.min(86400,seconds()),scroll_percent:maxScroll});
  const visibility=()=>{if(document.visibilityState==='hidden'){if(visibleAt!==null)activeMs+=performance.now()-visibleAt;visibleAt=null;progress();}else if(visibleAt===null)visibleAt=performance.now();};
  const scroll=()=>{const distance=document.documentElement.scrollHeight-innerHeight,max=distance>0?Math.min(100,Math.max(0,Math.round(scrollY/distance*100))):100;maxScroll=Math.max(maxScroll,max);for(const threshold of [25,50,75,90])if(max>=threshold&&!milestones.has(threshold)){milestones.add(threshold);send('scroll_depth',{percent_scrolled:threshold});}};
  const click=(event:MouseEvent)=>{
   if(!(event.target instanceof Element))return;const link=event.target.closest('a[href]');if(!link)return;
   const href=link.getAttribute('href')||'';let destination=id,kind='',section='none';
   if(href.startsWith('mailto:')||href.startsWith('tel:'))kind='contact';
   else try{const url=new URL(href,location.href);if(url.origin===origin){const dest=marketingPage(url.pathname);if(analyticsSections.includes(url.hash.slice(1)))section=url.hash.slice(1);if(!dest){if(/^\/(?:cz\/)?ucet(?:\/|$)/.test(url.pathname)){destination='account';kind='page';}else return;}else{destination=dest.id;kind=url.pathname===location.pathname&&url.hash?'section':'page';}}else if(url.protocol==='https:')kind='external';}catch{return;}
   if(!kind)return;
   const area=link.closest('header')?'header':link.closest('footer')?'footer':link.closest('[data-analytics-related],.related-services,.related-programs')?'related':'content';
   send('navigation_click',{destination_id:destination,destination_section:section,link_area:area,link_kind:kind});
  };
  const toggle=(event:Event)=>{if(event.target instanceof HTMLDetailsElement&&event.target.open)send(event.target.closest('.personal-mobile-menu')?'menu_open':'faq_open');};
  const video=(event:Event)=>{const v=event.target;if(!(v instanceof HTMLVideoElement)||!(v.dataset.analyticsVideo==='intro'||id==='program01'&&v===document.querySelector('main video')))return;let seen=videos.get(v);if(!seen){seen=new Set();videos.set(v,seen);}if(event.type==='play'&&!seen.has(0)){seen.add(0);send('video_start',{video_id:'intro'});}if(event.type==='ended'&&!seen.has(100)){seen.add(100);send('video_complete',{video_id:'intro'});}if(event.type==='timeupdate'&&Number.isFinite(v.duration)&&v.duration>0)for(const n of [25,50,75])if(v.currentTime/v.duration*100>=n&&!seen.has(n)){seen.add(n);send('video_progress',{video_id:'intro',video_percent:n});}};
  const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting&&!sections.has(e.target.id)){sections.add(e.target.id);send('section_view',{section:e.target.id});}},{threshold:0.2});
  for(const section of analyticsSections){const element=document.getElementById(section);if(element)observer.observe(element);}
  const timer=window.setInterval(()=>{for(const n of [10,30,60,120])if(seconds()>=n&&!milestones.has(1000+n)){milestones.add(1000+n);send('active_time',{active_seconds:n});}},1000);
  window.addEventListener('mindbanger-analytics-event',flush);window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('pagehide',progress);document.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);document.addEventListener('toggle',toggle,true);
  for(const name of ['play','timeupdate','ended'])document.addEventListener(name,video,true);
  return()=>{progress();clearInterval(timer);observer.disconnect();window.removeEventListener('mindbanger-analytics-event',flush);window.removeEventListener('scroll',scroll);window.removeEventListener('pagehide',progress);document.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('toggle',toggle,true);for(const name of ['play','timeupdate','ended'])document.removeEventListener(name,video,true);};
 },[id,path,locale,consent,ready]);
 function choose(ga:boolean,meta:boolean,attr:boolean,recording?:boolean){
  if(!ga){setReady(false);clearAnalyticsState();}
  setConsent(ga);setMarketing(meta);setAttribution(attr);setDraftAnalytics(ga);setDraftMarketing(meta);setDraftAttribution(attr);setOpen(false);
  try{localStorage.setItem(CONSENT_KEY,JSON.stringify({version:ANALYTICS_CONSENT_VERSION,analytics:ga,marketing:meta,attribution:attr,at:Date.now()}));}catch{/* Choice still applies to this document. */}
  const recordingChoice=clarityChoiceForAction(clarityEligible,recording,draftClarity);
  if(recordingChoice!==null){setClarity(recordingChoice);setDraftClarity(recordingChoice);setClarityScope(clarityConsentKey);try{localStorage.setItem(clarityConsentKey,JSON.stringify({version:1,allowed:recordingChoice,at:Date.now()}));if(recording===false)for(const key of [CLARITY_CONSENT_KEY,CLARITY_SUPPORT_CONSENT_KEY])localStorage.setItem(key,JSON.stringify({version:1,allowed:false,at:Date.now()}));}catch{/* Choice still applies to this document. */}}
  window.dispatchEvent(new Event('mindbanger-consent-change'));
  if(!ga)for(const name of document.cookie.split(';').map(c=>c.trim().split('=')[0]))if(/^_ga($|_)/.test(name))for(const domain of ['',location.hostname,'.mindbanger.com'])document.cookie=`${name}=; Max-Age=0; Path=/; SameSite=Lax${domain?'; Domain='+domain:''}`;
 }
 if(!page||!loaded)return null;
 const c=(sk:string,cz:string)=>cs?cz:sk;
 const needsChoice=consent===null||marketing===null||attribution===null||(clarityEligible&&(clarityScope!==clarityConsentKey||clarity===null));
 return <>
  <ClarityRecorder allowed={clarityEligible&&clarityScope===clarityConsentKey&&clarity===true}/>
  {consent&&<iframe ref={frame} title="Meranie návštevnosti" src="/marketing-measurement" hidden sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" onLoad={()=>setReady(true)}/>}
  {marketing&&id==='home'&&<iframe key={'meta-'+pathname} title="Meranie Meta" src="/marketing-meta" hidden sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={e=>e.currentTarget.contentWindow?.postMessage({type:'mindbanger-meta-init',page:'home'},'*')}/>}
  {(open||(needsChoice&&!dismissed))?<section className={`marketing-consent ${open?'marketing-consent--expanded':'marketing-consent--compact'}`} data-clarity-mask="true" aria-label={c('Nastavenia cookies','Nastavení cookies')}>
   <button type="button" className="marketing-consent-close" aria-label={c('Zavrieť bez zmeny súhlasu','Zavřít beze změny souhlasu')} onClick={()=>{setOpen(false);setDismissed(true);}}>×</button>
   <div className="marketing-consent-copy"><strong>{open?c('Nastavenia cookies','Nastavení cookies'):c('Cookies pre lepší web','Cookies pro lepší web')}</strong><p>{c('Voliteľné cookies nám pomáhajú zlepšovať web a vyhodnocovať reklamu. Stránku môžeš používať aj bez súhlasu.','Volitelné cookies nám pomáhají zlepšovat web a vyhodnocovat reklamu. Stránku můžeš používat i bez souhlasu.')} <a href={cs?'/cz/cookies':'/cookies'}>{c('Viac','Více')}</a></p>
    {open&&<div id="marketing-cookie-choices" className="marketing-consent-choices">
    <label className="marketing-choice"><input type="checkbox" checked={draftAnalytics} onChange={e=>setDraftAnalytics(e.target.checked)}/><span>{c('Google Analytics — stránky, navigácia, čas a úspešné odoslanie prihlášky či žiadosti o rezerváciu.','Google Analytics — stránky, navigace, čas a úspěšné odeslání přihlášky či žádosti o rezervaci.')}</span></label>
    <label className="marketing-choice"><input type="checkbox" checked={draftMarketing} onChange={e=>setDraftMarketing(e.target.checked)}/><span>{c('Meta Pixel — návšteva úvodnej stránky. Bez údajov účtu a rezervácie.','Meta Pixel — návštěva úvodní stránky. Bez údajů účtu a rezervace.')}</span></label>
    <label className="marketing-choice"><input type="checkbox" checked={draftAttribution} onChange={e=>setDraftAttribution(e.target.checked)}/><span>{c('Zdroj rezervácie — označený reklamný odkaz priradíme k rezervácii. Údaje zostanú u nás.','Zdroj rezervace — označený reklamní odkaz přiřadíme k rezervaci. Údaje zůstanou u nás.')}</span></label>
    {clarityEligible&&<label className="marketing-choice"><input type="checkbox" checked={draftClarity} onChange={e=>setDraftClarity(e.target.checked)}/><span>{c('Microsoft Clarity — mapy kliknutí, posúvania a prehrávanie návštevy tejto verejnej stránky. Text a formuláre sú maskované. Rezervácie sa nenahrávajú.','Microsoft Clarity — mapy kliknutí, posouvání a přehrávání návštěvy této veřejné stránky. Text a formuláře jsou maskované. Rezervace se nenahrávají.')}</span></label>}
    </div>}
   </div><div className="marketing-consent-actions"><button type="button" onClick={()=>choose(true,true,true,true)}>{c('Prijať všetko','Přijmout vše')}</button><button type="button" onClick={()=>choose(false,false,false,false)}>{c('Odmietnuť','Odmítnout')}</button>{open?<button type="button" onClick={()=>choose(draftAnalytics,draftMarketing,draftAttribution)}>{c('Uložiť výber','Uložit výběr')}</button>:<button type="button" aria-expanded={false} aria-controls="marketing-cookie-choices" onClick={()=>setOpen(true)}>{c('Nastavenia','Nastavení')}</button>}</div>
  </section>:<button type="button" className="marketing-consent-settings" aria-expanded={open} onClick={()=>setOpen(true)}>{c('Nastavenia cookies','Nastavení cookies')}</button>}
 </>;
}
