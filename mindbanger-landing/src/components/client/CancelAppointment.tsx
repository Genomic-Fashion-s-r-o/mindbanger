'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function CancelAppointment({ id }: {id:string}) {
  const router=useRouter();const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function cancel(){setBusy(true);setError('');try{const response=await fetch('/api/client/appointments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action:'cancel'})});const result=await response.json();if(!response.ok)throw new Error(result.error);setConfirm(false);router.refresh();}catch(e){setError(e instanceof Error?e.message:'Zrušenie sa nepodarilo.');}finally{setBusy(false);}}
  return <div className="client-cancel">{confirm?<><p>Zrušiť tento termín? Zrušenie je bezplatné.</p><div className="client-cancel-actions"><button className="client-button" disabled={busy} onClick={cancel}>{busy?'Ruším…':'Áno, zrušiť termín'}</button><button className="client-text-link" disabled={busy} onClick={()=>setConfirm(false)}>Ponechať termín</button></div></>:<button className="client-text-link" onClick={()=>setConfirm(true)}>Zrušiť rezerváciu</button>}{error&&<p className="client-error" role="alert">{error}</p>}</div>;
}
