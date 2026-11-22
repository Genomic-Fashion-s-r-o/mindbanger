'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function Register({ sourceCode, bookTitle, email = '' }: { sourceCode?: string; bookTitle?: string; email?: string }) {
  const [value, setValue] = useState(email), [busy, setBusy] = useState(false), [sent, setSent] = useState(false), [error, setError] = useState('');
  return <div className="reader-narrow"><p className="reader-kicker">ONE MINDBANGER ACCOUNT</p><h1>Continue your journey</h1><p>Create your free Mindbanger account, or use the email address of your existing account.</p>{bookTitle && <p>You arrived through <cite>{bookTitle}</cite>. We will remember this as your registration source.</p>}
    {sent ? <div className="reader-card" role="status"><h2>Check your email</h2><p>Open the secure link we sent you to confirm your email address and continue. Check your spam folder if it does not arrive.</p><button className="reader-secondary" onClick={() => setSent(false)}>Send a new link</button></div> : <form className="reader-card" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError(''); const form = new FormData(e.currentTarget);
      try {
        const response = await fetch('/api/readers/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: value, locale: 'en', registration: true, ...(sourceCode ? { sourceCode } : {}), accepted: form.get('terms') === 'on' && form.get('adult') === 'on', marketing: form.get('marketing') === 'on' }) });
        const data = await response.json(); if (!response.ok) throw Error(); if (data.redirect) window.location.assign(data.redirect); else setSent(true);
      } catch { setError('We could not complete your registration. Please try again.'); } finally { setBusy(false); }
    }}>
      <label htmlFor="registration-email">Email address</label><input id="registration-email" type="email" autoComplete="email" required maxLength={254} value={value} onChange={e => setValue(e.target.value)}/>
      <label className="reader-check"><input type="checkbox" name="adult" required/><span>I confirm that I am at least 18 years old.</span></label>
      <label className="reader-check"><input type="checkbox" name="terms" required/><span>I accept the <Link href="/readers/en/terms" target="_blank" rel="noreferrer">reader account terms</Link> and have read the <Link href="/readers/en/privacy" target="_blank" rel="noreferrer">privacy notice</Link>.</span></label>
      <label className="reader-check"><input type="checkbox" name="marketing"/><span>I would like news about future meditations, reader materials and special offers by email. I can unsubscribe at any time.</span></label>
      <button disabled={busy} type="submit">{busy ? 'Please wait…' : 'Confirm and continue'}</button>{error && <p role="alert">{error}</p>}
    </form>}
    <p>Registration is free. It does not require or verify a book purchase. Future extras will appear as they become available.</p><p><Link href="/readers/en/login">Already registered? Sign in</Link></p>
  </div>;
}
