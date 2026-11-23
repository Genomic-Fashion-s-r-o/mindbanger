'use client';
import React, { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { CZECH_PREFIX, stripLocalePrefix } from '@/lib/site-locale';
import './language-switcher.css';
import{useDictionary}from './LanguageProvider';
import{normalizeLocale,portalPath}from '@/lib/portal-locale';

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const [lang, setLang] = useState(normalizeLocale(useDictionary().lang));

  useEffect(() => {
    const cookies = document.cookie.split('; ');
    const langCookie = cookies.find(c => c.startsWith('user-lang='));
    if (langCookie) {
      setLang(pathname.startsWith('/en/')?'en':pathname.startsWith('/cz/')?'cs':normalizeLocale(langCookie.split('=')[1]));
    } else {
      const browserLang = navigator.language.slice(0, 2);
      if (browserLang === 'sk' || browserLang === 'cs') {
        setLang(normalizeLocale(browserLang));
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = normalizeLocale(e.target.value);
    setLang(newLang);
    document.cookie = `user-lang=${newLang}; path=/; max-age=31536000`;
    const bare=stripLocalePrefix(pathname);
    const target=portalPath(bare,newLang);
    window.location.assign(target+window.location.search+window.location.hash);
  };

  return (
    <div className="language-switcher flex items-center space-x-1 text-gray-300 hover:text-white transition-colors">
      <Globe size={16} />
      <select 
        aria-label={lang==='en'?'Page language':'Jazyk stránky'}
        value={lang} 
        onChange={handleChange} 
        className="bg-transparent text-sm focus:outline-none cursor-pointer appearance-none uppercase font-medium"
      >
        <option value="sk" className="text-slate-900 font-sans">SK</option>
        <option value="cs" className="text-slate-900 font-sans">CZ</option>
        <option value="en" className="text-slate-900 font-sans">EN</option>
      </select>
    </div>
  );
}
