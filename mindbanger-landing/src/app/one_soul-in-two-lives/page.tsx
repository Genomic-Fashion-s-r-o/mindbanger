import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import LanguagePicker from '@/components/readers/LanguagePicker';
import { bookRegistrationSource, SOUL_BOOK_PATH } from '@/lib/readers/book-source';
import { asBookLocale, bookLanguages, bookPath, mainHomePath, type BookLocale } from '@/lib/readers/book-languages';
import { bookText } from '@/lib/readers/book-text';
import './soul-book.css';

const origin = 'https://www.mindbanger.com';
type Props = { params?: Promise<{ locale?: string }>; searchParams: Promise<{ from?: string }> };
async function pageLocale(params: Props['params']): Promise<BookLocale> {
  const value = (await params)?.locale;
  const locale = value ? asBookLocale(value) : 'en';
  if (!locale || (value && value !== locale)) notFound();
  return locale;
}
function BookInline({ text }: { text: string }) { const parts = text.split('{book}'); return <>{parts.map((part, i) => <Fragment key={i}>{i > 0 && <cite lang="en">The Soul That Met Itself</cite>}{part}</Fragment>)}</>; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await pageLocale(params), t = bookText(locale), url = origin + bookPath(locale);
  return {
    title: 'The Soul That Met Itself | Mindbanger', description: t.heroIntro,
    alternates: { canonical: url, languages: { 'x-default': origin + SOUL_BOOK_PATH, ...Object.fromEntries(bookLanguages.map(l => [l.code, origin + bookPath(l.code)])) } },
    openGraph: { title: 'The Soul That Met Itself', description: t.heroIntro, url, type: 'website', locale: bookLanguages.find(l => l.code === locale)!.og, alternateLocale: bookLanguages.filter(l => l.code !== locale).map(l => l.og), images: [{ url: '/images/books/soul-encounter.png', width: 1536, height: 1024, alt: 'The Soul That Met Itself' }] },
    twitter: { card: 'summary_large_image', title: 'The Soul That Met Itself', description: t.heroIntro, images: ['/images/books/soul-encounter.png'] },
  };
}

export default async function SoulBookPage({ params, searchParams }: Props) {
  const locale = await pageLocale(params), t = bookText(locale), { from } = await searchParams;
  const registration = '/readers/' + locale + '/register?source=' + bookRegistrationSource(from), home = mainHomePath(locale);
  return <div className="soul-page" lang={locale}>
    <a className="soul-skip" href="#book-content">{t.skip}</a>
    <header className="soul-header">
      <a className="soul-brand" href={home} aria-label={t.home}>mindbanger<span>{t.tagline}</span></a>
      <div className="soul-header-tools"><nav aria-label={t.navigation}><a href="#inside">{t.insideLink}</a><a href="#readers">{t.readersLink}</a></nav><LanguagePicker locale={locale} label={t.languageLabel}/></div>
    </header>
    <main id="book-content">
      <section className="soul-hero" aria-labelledby="book-title">
        <Image src="/images/books/soul-encounter.png" alt="" fill loading="eager" sizes="100vw" className="soul-hero-image"/>
        <div className="soul-hero-shade"/>
        <div className="soul-hero-layout soul-width">
          <div className="soul-hero-copy"><p className="soul-eyebrow">{t.eyebrow}</p><h1 id="book-title" lang="en">The Soul<br/>That Met <em>Itself</em></h1><p className="soul-hero-intro">{t.heroIntro}</p><a className="soul-button" href="#inside">{t.discover}</a><p className="soul-edition">Miroslav Jobus · {t.edition}</p></div>
          <figure className="soul-book-figure"><Image src="/images/books/the-soul-that-met-itself-3d.png" alt={t.coverAlt} width={1122} height={1402} preload sizes="(max-width: 620px) 74vw, (max-width: 900px) 40vw, 430px" className="soul-book-cover"/></figure>
        </div><p className="soul-hero-note">{t.freeWills}</p>
      </section>
      <section className="soul-intro soul-width" aria-labelledby="encounter-title"><div><p className="soul-eyebrow">{t.introEyebrow}</p><h2 id="encounter-title">{t.introTitle}</h2></div><div className="soul-prose">{t.introParagraphs.map((p, i) => <p key={i}><BookInline text={p}/></p>)}</div></section>
      <section id="inside" className="soul-inside" aria-labelledby="inside-title"><div className="soul-width"><div className="soul-section-heading"><div><p className="soul-eyebrow">{t.insideEyebrow}</p><h2 id="inside-title">{t.insideTitle}</h2></div><p>{t.insideIntro}</p></div><div className="soul-parts">{t.parts.map(([title, text], i) => <article className="soul-part" key={i}><span className="soul-part-number">{String(i + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
      <section className="soul-model soul-width" aria-labelledby="model-title"><div><p className="soul-eyebrow">{t.modelEyebrow}</p><h2 id="model-title">{t.modelTitle.map((line, i) => <Fragment key={i}>{i > 0 && <br/>}{i === 2 ? <em>{line}</em> : line}</Fragment>)}</h2></div><div className="soul-prose">{t.modelParagraphs.map((p, i) => <p key={i}>{p}</p>)}<p className="soul-model-emphasis">{t.modelEmphasis}</p><p className="soul-small">{t.modelNote}</p></div></section>
      <section className="soul-quote" aria-label={t.quoteEyebrow}><div className="soul-width"><p className="soul-eyebrow">{t.quoteEyebrow}</p><blockquote>“{t.quote}”</blockquote><p className="soul-quote-credit"><BookInline text={t.quoteCredit}/></p></div></section>
      <section id="readers" className="soul-readers soul-width" aria-labelledby="readers-title"><div><p className="soul-eyebrow">{t.readersEyebrow}</p><h2 id="readers-title">{t.readersTitle}</h2><p>{t.readersBody}</p><p className="soul-small">{t.sameAccount}</p></div><div className="soul-registration"><p className="soul-registration-label">{t.registrationLabel}</p><h3>{t.registrationTitle}</h3><Link className="soul-button" href={registration}>{t.join}</Link><p>{t.free}</p><Link className="soul-login" href={'/readers/' + locale + '/login'}>{t.signIn}</Link></div></section>
    </main>
    <footer className="soul-footer soul-width"><a href={home} className="soul-footer-brand">mindbanger</a><p>{t.footerTagline}</p><nav aria-label={t.legalNavigation}><Link href={'/readers/' + locale + '/privacy'}>{t.privacy}</Link><Link href={'/readers/' + locale + '/terms'}>{t.terms}</Link><a href="mailto:miroslav@mindbanger.com">{t.contact}</a></nav></footer>
  </div>;
}
