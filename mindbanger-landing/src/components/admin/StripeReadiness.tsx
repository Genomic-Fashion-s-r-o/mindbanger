'use client';
import { useState } from 'react';
type Status = { live: boolean; company: string; companyMatches: boolean; chargesEnabled: boolean; payoutsEnabled: boolean; webhookEventsReady: boolean; signingSecretConfigured: boolean; requirementsDue: number; ready: boolean };
export default function StripeReadiness() {
  const [status, setStatus] = useState<Status | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState('');
  async function check() {
    setLoading(true); setError('');
    try { const response = await fetch('/api/admin/appointments/stripe-status', { cache: 'no-store' }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setStatus(result); }
    catch (e) { setError(e instanceof Error ? e.message : 'Kontrola zlyhala.'); }
    finally { setLoading(false); }
  }
  return <div className="personal-notice"><button type="button" className="personal-text-link" disabled={loading} onClick={check}>{loading ? 'Overujem Stripe…' : 'Overiť pripravenosť Stripe'}</button>{error && <p role="alert">{error}</p>}{status && <><p role="status"><strong>{status.ready ? 'Stripe je pripravené na ostré platby.' : 'Pred spustením treba dokončiť Stripe.'}</strong></p><p>Účet: {status.company || 'Názov poskytovateľa nie je uvedený'}{!status.companyMatches && ' — musí byť Milkam s.r.o.'}</p><ul>{[['Ostrý režim', status.live], ['Príjem platieb', status.chargesEnabled], ['Výplaty poskytovateľovi', status.payoutsEnabled], ['Potvrdenia úhrad a refundácií', status.webhookEventsReady], ['Podpisovanie webhooku', status.signingSecretConfigured], ['Doplnené údaje účtu', status.requirementsDue === 0]].map(([label, ok]) => <li key={String(label)}>{ok ? '✓' : '○'} {label}</li>)}</ul><p>Kontrola je iba na čítanie. Nestrháva peniaze ani nevytvára platbu.</p></>}</div>;
}
