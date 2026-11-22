'use client';
import {useCallback,useEffect,useState} from 'react';
import {timeWindows,timeRequestStates,type TimeRequest} from '@/lib/time-request-model';
import './time-requests-admin.css';

export default function TimeRequests() {
  const [rows,setRows]=useState<TimeRequest[]>([]),[filter,setFilter]=useState('new'),[page,setPage]=useState(0),[total,setTotal]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const load=useCallback(async(signal?:AbortSignal)=>{
    const r=await fetch('/api/admin/availability-requests?'+new URLSearchParams({state:filter,offset:String(page*50)}),{cache:'no-store',signal});
    const b=await r.json();if(!r.ok)throw Error(b.error);setRows(b.requests);setTotal(b.total);
  },[filter,page]);
  useEffect(()=>{const controller=new AbortController();setBusy(true);setError('');void load(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[load]);
  async function update(row:TimeRequest,state:string) {
    setBusy(true);setError('');setNotice('');
    try{const r=await fetch('/api/admin/availability-requests',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:row.id,revision:row.revision,state})});const b=await r.json();if(!r.ok)throw Error(b.error);await load();setNotice('Stav požiadavky je uložený.');}catch(e){setError(e instanceof Error?e.message:'Zmenu sa nepodarilo uložiť.');}finally{setBusy(false);}
  }
  return <div className="time-requests-admin"><header><p className="time-requests-eyebrow">INDIVIDUÁLNA DOHODA</p><h1>Požiadavky na uvoľnenie termínu</h1><p>Kontakty od ľudí, ktorí nenašli vhodný voľný čas. Kontaktuj ich osobne a po dohode vytvor rezerváciu v kalendári. Zmena stavu tu žiadny termín sama neotvára ani nerezervuje.</p></header>
    <div className="time-requests-toolbar"><label>Zobraziť<select aria-label="Zobraziť" value={filter} disabled={busy} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="all">Všetky požiadavky</option>{Object.entries(timeRequestStates).map(([state,label])=><option key={state} value={state}>{label}</option>)}</select></label><button disabled={busy} onClick={()=>{setBusy(true);setError('');void load().catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Obnoviť</button><p>Počet podľa filtra: {total}</p></div>
    {error&&<p className="time-requests-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{busy&&<p role="status">Načítavam…</p>}
    <div className="time-requests-list">{rows.map(row=><article key={row.id}><div className="time-request-admin-heading"><div><h2>{row.first_name} {row.last_name}</h2><p>{new Intl.DateTimeFormat('sk-SK',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Bratislava'}).format(new Date(row.created_at))} · Bratislava</p></div><span className={'time-request-badge state-'+row.state}>{timeRequestStates[row.state]}</span></div>
      <div className="time-request-contacts"><a href={'mailto:'+row.email}>{row.email}</a><a href={'tel:'+row.phone.replace(/[^+\d]/g,'')}>{row.phone}</a></div>
      <p><strong>Služba:</strong> {row.service_name||'Zatiaľ nevybraná'} · {row.locale==='cs'?'Čeština':'Slovenčina'}</p><p><strong>Možné začiatky stretnutia:</strong></p><ul className="time-request-preferences">{timeWindows.filter(w=>row.time_windows.includes(w.id)).map(w=><li key={w.id}>{w.sk} {w.hours}</li>)}</ul>
      {row.note&&<div className="time-request-admin-note"><h3>Upresnenie časových možností</h3><p>{row.note}</p></div>}
      <label>Stav požiadavky<select aria-label="Stav požiadavky" value={row.state} disabled={busy} onChange={e=>void update(row,e.target.value)}>{Object.entries(timeRequestStates).map(([state,label])=><option key={state} value={state}>{label}</option>)}</select></label>
    </article>)}</div>
    {!busy&&!rows.length&&!error&&<p className="time-requests-empty">Žiadne požiadavky podľa tohto filtra.</p>}
    <div className="time-requests-toolbar"><button disabled={!page||busy} onClick={()=>setPage(p=>p-1)}>Predchádzajúce</button><span>Strana {page+1}</span><button disabled={busy||(page+1)*50>=total} onClick={()=>setPage(p=>p+1)}>Ďalšie</button></div><p className="time-requests-retention">Údaje slúžia iba na osobnú dohodu termínu a automaticky sa odstránia po 90 dňoch. Požiadavky sú súkromné a dostupné iba overenému administrátorovi.</p>
  </div>;
}
