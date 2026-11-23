'use client';
import {useEffect,useRef,useState} from 'react';
import '../client/support-context.css';
export default function AdminSupportContext({id}:{id:string}){
 const [text,setText]=useState<string|null>(null),[open,setOpen]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const dialog=useRef<HTMLDialogElement>(null);
 const opener=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();},[open]);
 function clear(){setOpen(false);setText(null);opener.current?.focus();}
 async function show(){setLoading(true);setError('');try{const r=await fetch('/api/admin/appointments/support-context?id='+encodeURIComponent(id),{cache:'no-store'});const b=await r.json();if(!r.ok)throw Error(b.error);setText(b.context?.text||null);setOpen(true);}catch(e){setError(e instanceof Error?e.message:'Opis nie je dostupný.');}finally{setLoading(false);}}
 return <div className="support-context-admin">
  <button ref={opener} type="button" onClick={show} disabled={loading}>{loading?'Overujem prístup…':'Otvoriť dôverný opis klienta'}</button>
  {open&&<dialog ref={dialog} className="support-context-reader" aria-labelledby={'support-reader-title-'+id} onClose={clear}>
   <h2 id={'support-reader-title-'+id}>Dôverný opis klienta</h2>
   <p className="support-context-reader-note">Osobitné údaje · iba pre obsluhu tohto stretnutia</p>
   <p className="support-context-admin-text">{text||'Klient dôverný opis neposkytol alebo bol vymazaný.'}</p>
   <button type="button" onClick={()=>dialog.current?.close()}>Skryť dôverný opis</button>
  </dialog>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}
