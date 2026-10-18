'use client';
import Link from 'next/link';
import { useState } from 'react';
import { CLIENT_TERMS_VERSION, safeClientReturn } from '@/lib/client-platform';
export default function ClientProfileForm({ name, email, language = 'sk', timezone = 'Europe/Bratislava', onboarding = false, next = '/ucet' }: { name: string; email: string; language?: string; timezone?: string; onboarding?: boolean; next?: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/client/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: form.get('name'), language: form.get('language'), timezone: form.get('timezone'), ...(onboarding ? { accepted: true, termsVersion: CLIENT_TERMS_VERSION } : {}) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      if (onboarding) { window.location.assign(safeClientReturn(next)); return; }
      setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Uloženie sa nepodarilo.'); }
    finally { setBusy(false); }
  }
  return <form className="client-form" onSubmit={save}><label htmlFor="client-name">Meno a priezvisko<input id="client-name" name="name" required minLength={2} maxLength={100} autoComplete="name" defaultValue={name} /></label><label htmlFor="client-email">Prihlasovací email<input id="client-email" type="email" value={email} disabled /><small>Email je overený pri prihlásení. Jeho zmenu riešime samostatným overením.</small></label><div className="client-form-row"><label htmlFor="client-language">Preferovaný jazyk<select id="client-language" name="language" defaultValue={language}><option value="sk">Slovenčina</option><option value="cs">Čeština</option><option value="en">English</option></select></label><label htmlFor="client-timezone">Časové pásmo<input id="client-timezone" name="timezone" defaultValue={timezone} required list="client-timezones" /><datalist id="client-timezones"><option value="Europe/Bratislava" /><option value="Europe/Prague" /><option value="Europe/London" /><option value="UTC" /></datalist></label></div>{onboarding && <label className="client-check"><input type="checkbox" required /><span>Súhlasím s <Link href="/podmienky-uctu" target="_blank" rel="noopener noreferrer">podmienkami bezplatného účtu</Link> a oboznámil/a som sa s <Link href="/ochrana-udajov" target="_blank" rel="noopener noreferrer">ochranou osobných údajov</Link>. Tento krok nie je nákupom ani prihlásením na marketing.</span></label>}{error && <p className="client-error" role="alert">{error}</p>}{saved && <p className="client-success" role="status">Údaje sú uložené.</p>}<button className="client-button" disabled={busy}>{busy ? 'Ukladám…' : onboarding ? 'Otvoriť môj účet' : 'Uložiť údaje'} <span aria-hidden="true">↗</span></button></form>;
}
