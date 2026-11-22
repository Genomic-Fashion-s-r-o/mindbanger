'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { marketingMetricLabels, type MarketingMetric } from '@/lib/marketing-drilldown';
import { campaignSources } from '@/lib/marketing-attribution';
import { dateLabel, localDate, money, statusLabels, type Appointment } from '@/lib/booking/model';
import { paymentStateLabel } from '@/lib/booking/payment-state';
import './marketing-dashboard.css';
type Row=Pick<Appointment,'id'|'user_id'|'customer_name'|'email'|'service_name'|'starts_at'|'created_at'|'status'|'paid'|'payment_review'|'payment_flow'|'payment_state'|'funding_type'> & {net_cents:number;stripe_refunded_amount:number;payment_refunded:boolean;campaign_id:string|null;ad_name:string|null;campaign_name:string|null;source:'facebook'|'instagram'|null};
export default function MarketingBookingList({from,to,metric,campaign}:{from:string;to:string;metric:MarketingMetric;campaign:string}) {
 const [offset,setOffset]=useState(0),[result,setResult]=useState<{rows:Row[];total:number}|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  setLoading(true);setResult(null);setError('');
  void (async()=>{try {
   const r=await fetch('/api/admin/marketing/bookings?'+new URLSearchParams({from,to,metric,campaign,offset:String(offset)}),{cache:'no-store',signal:controller.signal});
   const data=await r.json();if(!r.ok)throw Error(data.error);
   if(!controller.signal.aborted)setResult(data);
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Zoznam sa nepodarilo načítať.');}
  finally{if(!controller.signal.aborted)setLoading(false);}})();
  return ()=>controller.abort();
 },[from,to,metric,campaign,offset,retry]);
 const back='/mindbanger_daily/admin/marketing?'+new URLSearchParams({from,to});
 return <main className="marketing-dashboard personal-site"><Link href={back}>← Späť na marketingový prehľad</Link><h1>{marketingMetricLabels[metric]}</h1>
  <p>Rezervácie vytvorené od {from.split('-').reverse().join('. ')} do {to.split('-').reverse().join('. ')} · čas Bratislava.</p>
  <p>{campaign==='all'?'Všetky reklamné zdroje':campaign==='unknown'?'Bez priradeného reklamného odkazu':'Vybraný reklamný odkaz'} · interné a označené testy sú vylúčené.</p>
  {metric==='paying_clients'&&<p>Každý platiaci klient je uvedený raz so svojou najnovšou vyhovujúcou rezerváciou v období.</p>}
  {error&&<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Skúsiť znova</button></p>}
  {loading&&<p role="status">Načítavam zoznam…</p>}
  {result&&<><p role="status"><strong>Počet: {result.total}</strong></p>
   {result.rows.length>0?<div className="marketing-table-wrap"><table><caption>{marketingMetricLabels[metric]} · menovitý zoznam dostupný iba administrátorovi</caption><thead><tr><th>Klient</th><th>Služba a termín</th><th>Vytvorené</th><th>Stav rezervácie a platby</th><th>Reklamný zdroj</th><th>Detail</th></tr></thead><tbody>
    {result.rows.map(row=><tr key={row.id}><th scope="row">{row.customer_name||'Meno neuvedené'}<small>{row.email&&<a href={'mailto:'+row.email}>{row.email}</a>}</small></th><td>{row.service_name}<small>{dateLabel(row.starts_at)}</small></td><td>{dateLabel(row.created_at)}</td><td>{statusLabels[row.status]}<small>{paymentStateLabel(row)}</small>{row.payment_refunded&&<small>Plná refundácia</small>}{row.stripe_refunded_amount>0&&<small>Vrátené: {money(row.stripe_refunded_amount/100)}</small>}{metric==='net_cents'&&<small>Po refundáciách: {money(row.net_cents/100)}</small>}</td><td>{row.ad_name||'Bez priradeného odkazu'}<small>{row.source?campaignSources[row.source]:'Zdroj nezistený'}{row.campaign_name&&' · '+row.campaign_name}</small></td><td><Link href={'/mindbanger_daily/admin/rezervacie?'+new URLSearchParams({day:localDate(new Date(row.starts_at)),booking:row.id})+'#booking-'+row.id}>Otvoriť rezerváciu ↗</Link>{row.user_id&&<small><Link href={'/mindbanger_daily/admin/klienti/'+row.user_id}>Karta klienta ↗</Link></small>}</td></tr>)}
   </tbody></table></div>:<p>V tomto období a filtri nie sú žiadne záznamy.</p>}
   <nav className="marketing-toolbar" aria-label="Stránkovanie zoznamu"><button disabled={loading||offset===0} onClick={()=>setOffset(n=>Math.max(0,n-50))}>← Predchádzajúce</button><span>Strana {Math.floor(offset/50)+1}</span><button disabled={loading||offset+50>=result.total} onClick={()=>setOffset(n=>n+50)}>Ďalšie →</button></nav>
  </>}
 </main>;
}
