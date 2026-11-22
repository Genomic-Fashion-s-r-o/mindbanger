import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { bookRegistrationSource, SOUL_BOOK_PATH } from '@/lib/readers/book-source';
import './soul-book.css';

const url = 'https://www.mindbanger.com' + SOUL_BOOK_PATH;
export const metadata: Metadata = {
  title: 'The Soul That Met Itself | Mindbanger',
  description: 'An exploration of love, time and the evolution of consciousness. What if meeting another person could bring you back to yourself?',
  alternates: { canonical: url },
  openGraph: { title: 'The Soul That Met Itself', description: 'One soul. Two lives. A journey back to yourself.', url, type: 'website', locale: 'en_US', images: [{ url: '/images/books/soul-encounter.png', width: 1536, height: 1024, alt: 'Two figures on separate shores beneath a shared arc of light' }] },
  twitter: { card: 'summary_large_image', title: 'The Soul That Met Itself', images: ['/images/books/soul-encounter.png'] },
};

const parts = [
  ['01', 'When someone changes our life', 'The feeling of recognition. The tension between heart and mind. The encounters that leave us asking why.'],
  ['02', 'A story older than us', 'An invitation to look beyond our everyday identity and ask who we are when the mind grows quiet.'],
  ['03', 'The soul’s journey through time', 'A philosophical exploration of consciousness, continuity and the possibility of one soul encountering itself in two lives.'],
  ['04', 'Love, freedom and fulfilment', 'Loving without possession. Respecting another person’s choices. Beginning to live the life that is already yours.'],
];

export default async function SoulBookPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const registration = '/readers/en/register?source=' + bookRegistrationSource(from);
  return <div className="soul-page" lang="en">
    <a className="soul-skip" href="#book-content">Skip to content</a>
    <header className="soul-header">
      <Link className="soul-brand" href="/en" aria-label="Mindbanger home">mindbanger<span>A SPACE TO RETURN TO YOURSELF</span></Link>
      <nav aria-label="Book navigation"><a href="#inside">Inside the book</a><a href="#readers">For readers</a></nav>
    </header>
    <main id="book-content">
      <section className="soul-hero" aria-labelledby="book-title">
        <Image src="/images/books/soul-encounter.png" alt="Two people on separate shores, connected by an arc of golden light above a quiet sea" fill priority sizes="100vw" className="soul-hero-image"/>
        <div className="soul-hero-shade"/>
        <div className="soul-hero-copy soul-width">
          <p className="soul-eyebrow">A BOOK ABOUT LOVE, TIME & CONSCIOUSNESS</p>
          <h1 id="book-title">The Soul<br/>That Met <em>Itself</em></h1>
          <p className="soul-hero-intro">What if meeting another person<br className="soul-desktop-break"/> could bring you back to yourself?</p>
          <a className="soul-button" href="#inside">Discover the book</a>
          <p className="soul-edition">The English edition</p>
        </div>
        <p className="soul-hero-note">ONE SOUL. TWO LIVES. TWO FREE WILLS.</p>
      </section>

      <section className="soul-intro soul-width" aria-labelledby="encounter-title">
        <div><p className="soul-eyebrow">THE ENCOUNTER IS ONLY THE BEGINNING</p><h2 id="encounter-title">Some people change<br/>the way we see <em>everything.</em></h2></div>
        <div className="soul-prose"><p>A stranger feels familiar. A connection arrives at the wrong time. Someone touches a part of you that you thought you had lost.</p><p><cite>The Soul That Met Itself</cite> follows these moments into deeper questions about love, identity and the evolution of consciousness. It explores an unusual possibility: a soul meeting itself through two overlapping human lives.</p><p>At its heart is a very human invitation: to understand what an encounter awakens in you, honour another person’s freedom, and return to your own life.</p></div>
      </section>

      <section id="inside" className="soul-inside" aria-labelledby="inside-title"><div className="soul-width">
        <div className="soul-section-heading"><div><p className="soul-eyebrow">INSIDE THE BOOK</p><h2 id="inside-title">A journey in four parts.</h2></div><p>From the mystery of connection<br/>to the freedom to live.</p></div>
        <div className="soul-parts">{parts.map(([number, title, text]) => <article className="soul-part" key={number}><span className="soul-part-number">{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </div></section>

      <section className="soul-model soul-width" aria-labelledby="model-title"><div><p className="soul-eyebrow">A DIFFERENT WAY TO ASK THE QUESTION</p><h2 id="model-title">One soul.<br/>Two lives.<br/><em>Two free wills.</em></h2></div><div className="soul-prose"><p>The book introduces MIRIEC — the Model of Incarnational Recursive Interaction and Evolution of Consciousness — as a philosophical framework for exploring soul identity and human experience.</p><p>It considers the possibility that two people may share a deeper continuity of consciousness while remaining distinct individuals, each with their own body, mind and choices.</p><p className="soul-model-emphasis">No connection takes away someone’s freedom. No spiritual label asks you to put your life on hold.</p><p className="soul-small">MIRIEC is presented as a spiritual and philosophical exploration, rather than an established scientific theory.</p></div></section>

      <section className="soul-quote" aria-label="A thought from the book"><div className="soul-width"><p className="soul-eyebrow">A THOUGHT TO TAKE WITH YOU</p><blockquote>“Your life is not a waiting room for destiny. It is where destiny meets your decisions.”</blockquote><p className="soul-quote-credit">From <cite>The Soul That Met Itself</cite></p></div></section>

      <section id="readers" className="soul-readers soul-width" aria-labelledby="readers-title"><div><p className="soul-eyebrow">CONTINUE THE JOURNEY WITH MINDBANGER</p><h2 id="readers-title">The last page can be<br/>a new <em>beginning.</em></h2><p>Create your free Mindbanger account and stay connected beyond the book. You can choose to receive news about future meditations, reader materials and special offers.</p><p className="soul-small">Already have a Mindbanger account? Use the same email address. One account brings it all together.</p></div><div className="soul-registration"><p className="soul-registration-label">FOR READERS</p><h3>A little space<br/>for what comes next.</h3><Link className="soul-button" href={registration}>Join Mindbanger Readers</Link><p>Free registration · No purchase required</p><Link className="soul-login" href="/readers/en/login">Already registered? Sign in</Link></div></section>
    </main>
    <footer className="soul-footer soul-width"><Link href="/en" className="soul-footer-brand">mindbanger</Link><p>A space to return to yourself.</p><nav aria-label="Legal and contact"><Link href="/readers/en/privacy">Privacy</Link><Link href="/readers/en/terms">Terms</Link><a href="mailto:miroslav@mindbanger.com">Contact</a></nav></footer>
  </div>;
}
