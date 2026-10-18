'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
export default function ClientActions() {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function logout() {
    setBusy(true); setError('');
    const { error } = await supabase.auth.signOut();
    if (error) { setError('Odhlásenie sa nepodarilo. Skúste to znova.'); setBusy(false); return; }
    window.location.assign('/prihlasenie');
  }
  return <div className="client-logout"><button type="button" onClick={logout} disabled={busy}>{busy ? 'Odhlasujem…' : 'Odhlásiť sa'}</button>{error && <p role="alert">{error}</p>}</div>;
}
