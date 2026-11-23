'use client';
import Link from 'next/link';
import { useState } from 'react';
import LanguagePicker from './LanguagePicker';
import type { BookLocale } from '@/lib/readers/book-languages';
import type { BookText } from '@/lib/readers/book-text';
import type { ReaderText } from '@/lib/readers/locale';

export default function Register({ locale, copy, text, languageLabel, sourceCode, bookTitle, email = '' }: { locale: BookLocale; copy: BookText['registration']; text: ReaderText; languageLabel: string; sourceCode?: string; bookTitle?: string; email?: string }) {
  const [value, setValue] = useState(email), [busy, setBusy] = useState(false), [sent, setSent] = useState(false), [error, setError] = useState('');
  const sourceParts = copy.source.split('{book}');
  return <div className="reader-narrow"><LanguagePicker locale={locale} label={languageLabel} registration/><p className="reader-kicker">{copy.kicker}</p><h1>{copy.title}</h1><p>{copy.intro}</p>{bookTitle && <p>{sourceParts[0]}<cite>{bookTitle}</cite>{sourceParts[1]}</p>}
    {sent ? <div className="reader-card" role="status"><h2>{text.sentTitle}</h2><p>{text.sentBody}</p><button className="reader-secondary" onClick={() => setSent(false)}>{text.resend}</button></div> : <form className="reader-card" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError(''); const form = new FormData(e.currentTarget);
      try {
        const response = await fetch('/api/readers/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: value, locale, registration: true, ...(sourceCode ? { sourceCode } : {}), accepted: form.get('terms') === 'on' && form.get('adult') === 'on', marketing: form.get('marketing') === 'on' }) });
        const data = await response.json(); if (!response.ok) throw Error(); if (data.redirect) window.location.assign(data.redirect); else setSent(true);
      } catch { setError(text.error); } finally { setBusy(false); }
    }}>
      <label htmlFor="registration-email">{text.email}</label><input id="registration-email" type="email" autoComplete="email" required maxLength={254} value={value} onChange={e => setValue(e.target.value)}/>
      <label className="reader-check"><input type="checkbox" name="adult" required/><span>{text.adult}</span></label>
      <label className="reader-check"><input type="checkbox" name="terms" required/><span>{copy.termsBefore}<Link href={'/readers/' + locale + '/terms'} target="_blank" rel="noreferrer">{copy.termsLink}</Link>{copy.termsBetween}<Link href={'/readers/' + locale + '/privacy'} target="_blank" rel="noreferrer">{copy.privacyLink}</Link>.</span></label>
      <label className="reader-check"><input type="checkbox" name="marketing"/><span>{copy.marketing}</span></label>
      <button disabled={busy} type="submit">{busy ? copy.busy : copy.submit}</button>{error && <p role="alert">{error}</p>}
    </form>}
    <p>{copy.disclaimer}</p><p><Link href={'/readers/' + locale + '/login'}>{copy.existing}</Link></p>
  </div>;
}
