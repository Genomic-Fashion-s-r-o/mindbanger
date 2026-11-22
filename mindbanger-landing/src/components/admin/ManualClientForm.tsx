'use client';
import { useState } from 'react';
import { manualContactSchema } from '@/lib/booking/manual-model';
import './manual-booking.css';
export type ManualClientChoice = { id: string; name: string; email: string };

export default function ManualClientForm({ onCreated }: { onCreated: (client: ManualClientChoice) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    const c = manualContactSchema.safeParse(fields);
    if (!c.success) { setError('Skontroluj meno, priezvisko, platný email a kontakty.'); return; }
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/admin/manual-clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c.data) }), b = await r.json();
      if (!r.ok) throw Error(b.error);
      onCreated({ id: b.user, name: c.data.firstName + ' ' + c.data.lastName, email: c.data.email });
    } catch (err) { setError(err instanceof Error ? err.message : 'Klienta sa nepodarilo uložiť.'); }
    finally { setBusy(false); }
  }
  return <form className="manual-form" onSubmit={save}>
    <div className="manual-two"><label>Meno<input name="firstName" required maxLength={60} autoComplete="given-name" /></label><label>Priezvisko<input name="lastName" required maxLength={60} autoComplete="family-name" /></label></div>
    <label>Email klienta / rodiča<input type="email" name="email" required maxLength={254} autoComplete="email" /></label>
    <div className="manual-two"><label>Telefón<input type="tel" name="phone" maxLength={40} autoComplete="tel" /></label><label>Mesto<input name="city" maxLength={100} autoComplete="address-level2" /></label></div>
    <label>Štát<select name="country" defaultValue="SK"><option value="SK">Slovensko (SR)</option><option value="CZ">Česko (ČR)</option><option value="other">Iný štát</option></select></label>
    <p>Klient sa teraz nemusí prihlasovať. Existujúci email priradíme k jeho účtu; nevytvorí sa druhý klient. Toto nie je nákup ani potvrdenie klientových súhlasov.</p>
    {error && <p role="alert" className="manual-error">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? 'Ukladám klienta…' : 'Uložiť klienta'}</button>
  </form>;
}
