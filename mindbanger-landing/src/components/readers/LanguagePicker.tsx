'use client';
import { bookLanguages, bookPath, type BookLocale } from '@/lib/readers/book-languages';
import './language-picker.css';

export default function LanguagePicker({ locale, label, registration = false }: { locale: BookLocale; label: string; registration?: boolean }) {
  return <label className="book-language-picker"><span>{label}</span><select aria-label={label} value={locale} onChange={event => {
    const language = event.target.value as BookLocale;
    const target = new URL(window.location.href);
    target.pathname = registration ? '/readers/' + language + '/register' : bookPath(language);
    target.searchParams.set('lang', language);
    window.location.assign(target.href);
  }}>{bookLanguages.map(language => <option key={language.code} value={language.code} lang={language.code}>{language.name}</option>)}</select></label>;
}
