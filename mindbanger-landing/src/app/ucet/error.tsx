'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="client-card client-empty"><h1>Účet sa nepodarilo načítať.</h1><p>Skúste stránku načítať znova. Ak problém pretrváva, prihláste sa opäť.</p><button className="client-button" onClick={reset}>Skúsiť znova</button><p><Link href="/prihlasenie">Späť na prihlásenie</Link></p></section>;
}
