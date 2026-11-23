'use client';
import Link from 'next/link';
import SiteRequestOverview from './SiteRequestOverview';
import { marketingListHref, marketingMetricLabels, type MarketingMetric } from '@/lib/marketing-drilldown';
import { useCallback, useEffect, useRef, useState } from 'react';
import { campaignLink, campaignSources } from '@/lib/marketing-attribution';
import { SERVICE_CATALOG } from '@/lib/booking/catalog';
import { localDate, money } from '@/lib/booking/model';
import './marketing-dashboard.css';
type Metrics={requests:number;confirmed_paid:number;paying_clients:number;net_cents:number;cancelled:number;refunded:number;package_sessions:number;authorized:number;needs_review:number;captured_payments:number};
type Campaign={id:string;name:string;campaign_name:string;source:'facebook'|'instagram';active:boolean;is_test:boolean;landing_path:string};
type Row=Metrics&{id:string|null;name:string;campaign_name:string;source:string;browsers:number;active:boolean};
type Report={rows:Row[];totals:Metrics;campaigns:Campaign[]};
export default function MarketingDashboard({initialFrom,initialTo}:{initialFrom?:string;initialTo?:string}) {
 const [{today,monthAgo}]=useState(()=>({today:localDate(new Date()),monthAgo:localDate(new Date(Date.now()-29*86400000))}));
 const [from,setFrom]=useState(initialFrom||monthAgo),[to,setTo]=useState(initialTo||today),[report,setReport]=useState<Report|null>(null);
 const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [name,setName]=useState(''),[campaignName,setCampaignName]=useState(''),[source,setSource]=useState<'facebook'|'instagram'>('facebook'),[landing,setLanding]=useState('/'),[isTest,setIsTest]=useState(false);
 const sequence=useRef(0);
 const load=useCallback(async()=>{const request=++sequence.current;setLoading(true);setReport(null);setError('');try{const response=await fetch(`/api/admin/marketing?from=${from}&to=${to}`,{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error);if(request===sequence.current)setReport(data);}catch(e){if(request===sequence.current)setError(e instanceof Error?e.message:'Prehľad sa nepodarilo načítať.');}finally{if(request===sequence.current)setLoading(false);}},[from,to]);
 useEffect(()=>{void load();},[load]);
 async function mutate(body:unknown){setSaving(true);setError('');setNotice('');try{const r=await fetch('/api/admin/marketing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error);await load();setNotice('Odkaz je uložený. Reklamná kampaň sa tým nespúšťa.');return true;}catch(e){setError(e instanceof Error?e.message:'Uloženie zlyhalo.');return false;}finally{setSaving(false);}}
 const totals=report?.totals;
 const countLink=(value:number,metric:MarketingMetric,campaign:string|null)=><Link href={marketingListHref(from,to,metric,campaign||'unknown')} aria-label={marketingMetricLabels[metric]+': '+value+' – zobraziť zoznam'}>{metric==='net_cents'?money(value/100):value}</Link>;
 return <div className="marketing-dashboard personal-site"><header><p className="personal-eyebrow">OD REKLAMY K REZERVÁCII</p><h1>Marketing</h1><p>Zisti, ktorý označený odkaz prináša žiadosti, potvrdené rezervácie a skutočné úhrady. Údaje rezervácií zostávajú v Mindbangeri.</p></header>
  <div className="marketing-toolbar"><label>Rezervácie vytvorené od<input type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></label><label>Do<input type="date" value={to} min={from} max={today} onChange={e=>setTo(e.target.value)}/></label><button className="personal-button" disabled={loading||saving} onClick={()=>void load()}>Obnoviť prehľad</button></div>
  <p>Posledných najviac 90 dní · čas Bratislava · aktuálny stav rezervácií vytvorených v zvolenom období, nie výpis úhrad podľa dátumu platby.</p>
  {error&&<p className="personal-notice" role="alert">{error}</p>}{notice&&<p className="personal-notice" role="status">{notice}</p>}{loading&&<p role="status">Načítavam prehľad…</p>}
  <SiteRequestOverview from={from} to={to}/>
  {totals&&<><section className="marketing-metrics" aria-label="Výsledky rezervácií">{(['requests','confirmed_paid','paying_clients','net_cents','authorized','needs_review'] as const).map(metric=><Link className="marketing-metric-link" key={metric} href={marketingListHref(from,to,metric)}><span>{marketingMetricLabels[metric]}</span><strong>{metric==='net_cents'?money(totals[metric]/100):totals[metric]}</strong><small>Zobraziť zoznam ↗</small></Link>)}</section>
   <section><h2>Výsledky podľa reklamy</h2><div className="marketing-table-wrap"><table><caption>Každá rezervácia má najviac jeden zdroj. Interné a označené testy sú vylúčené.</caption><thead><tr><th>Reklama / kampaň</th><th>Zdroj</th><th>Prehliadače so súhlasom</th><th>Žiadosti</th><th>Potvrdené a zaplatené</th><th>Platiaci klienti</th><th>Úhrady po refundáciách</th><th>Refundácie</th></tr></thead><tbody>{report.rows.map(r=><tr key={r.id||'unknown'}><th scope="row">{r.name}{r.campaign_name&&<small>{r.campaign_name}</small>}</th><td>{campaignSources[r.source as keyof typeof campaignSources]||'Nezistený'}</td><td>{r.id?r.browsers:'—'}</td><td>{countLink(r.requests,'requests',r.id)}</td><td>{countLink(r.confirmed_paid,'confirmed_paid',r.id)}</td><td>{countLink(r.paying_clients,'paying_clients',r.id)}</td><td>{countLink(r.net_cents,'net_cents',r.id)}</td><td>{countLink(r.refunded,'refunded',r.id)}</td></tr>)}</tbody></table></div>
    <p>Potvrdené a zaplatené: správcom potvrdená rezervácia s overenou úhradou, bez otvoreného platobného posúdenia a plnej refundácie. Úhrady zahŕňajú aj zaplatené, neskôr zrušené rezervácie; odpočítané sú vrátené sumy. Blokácia karty nie je úhrada. Čerpanie balíčka je samostatné sedenie, nie ďalší predaj.</p>
    <p>Zrušené / vypršané: {totals.cancelled} · Rezervácie s refundáciou: {totals.refunded} · Potvrdené čerpania balíčka: {totals.package_sessions}. Jeden klient môže byť v riadkoch viacerých reklám; súhrn ho započíta raz.</p>
    <p>Prehliadače sú orientačný počet rozpoznaných prehliadačov s návštevou označeného odkazu a súhlasom v období. Nie je to počet ľudí ani všetkých návštev. Bez súhlasu, označeného odkazu alebo po 30 dňoch zdroj neodhadujeme. Staršie rezervácie sa spätne nepriraďujú.</p>
   </section></>}
  <section><h2>Odkazy pre jednotlivé reklamy</h2><p>Pre každú reklamu vytvor vlastný odkaz a použi ho ako cieľ reklamy alebo príbehu. Môže smerovať rovno na službu. Samotné vytvorenie odkazu nič nezverejní ani nespustí.</p>
   <form className="marketing-link-form" onSubmit={async e=>{e.preventDefault();if(await mutate({action:'create',name,campaignName,source,landing,isTest})){setName('');}}}>
    <label>Názov kampane<input value={campaignName} onChange={e=>setCampaignName(e.target.value)} maxLength={80} placeholder="Napríklad Online stretnutia – jeseň"/></label>
    <label>Názov konkrétnej reklamy / odkazu<input required value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={80} placeholder="Napríklad Video 1 – príbeh"/></label>
    <label>Sieť<select value={source} onChange={e=>setSource(e.target.value as 'facebook'|'instagram')}><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select></label>
    <label>Vstupná stránka<select value={landing} onChange={e=>setLanding(e.target.value)}><option value="/">Úvodná stránka</option>{SERVICE_CATALOG.map(s=><option key={s.id} value={'/sluzby/'+s.id}>{s.name}</option>)}</select></label>
    <label className="marketing-test-choice"><input type="checkbox" checked={isTest} onChange={e=>setIsTest(e.target.checked)}/>Testovací odkaz · mimo marketingových výsledkov</label><button className="personal-button" disabled={saving}>Vytvoriť odkaz</button>
   </form>
   <div className="marketing-links">{report?.campaigns.map(c=><article key={c.id}><div><h3>{c.name}</h3><p>{campaignSources[c.source]}{c.campaign_name?' · '+c.campaign_name:''}{c.is_test?' · TEST':''}{!c.active?' · Pozastavený':''}</p><label>Označený odkaz<input readOnly value={campaignLink(c.id,c.landing_path,c.source)} onFocus={e=>e.currentTarget.select()}/></label></div><div className="marketing-link-actions"><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(campaignLink(c.id,c.landing_path,c.source));setNotice('Odkaz je skopírovaný.');}catch{setNotice('Odkaz označ a skopíruj z poľa.');}}}>Kopírovať odkaz</button><button type="button" disabled={saving} onClick={()=>void mutate({action:'active',id:c.id,active:!c.active})}>{c.active?'Pozastaviť priradenie':'Povoliť priradenie'}</button></div></article>)}</div>
   {report&&!report.campaigns.length&&<p>Zatiaľ nemáš vytvorený žiadny reklamný odkaz.</p>}
  </section>
 </div>;
}
