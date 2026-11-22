'use client';

import { useEffect, useState } from 'react';
import { getDictionary, Locale, dictionaries } from './i18n';

export function useDictionary() {
  const [lang, setLang] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const langMatch = document.cookie.match(/(^| )user-lang=([^;]+)/);
    if (langMatch && langMatch[2] in dictionaries) {
      setLang(langMatch[2] as Locale);
    } else {
      const navLang = navigator.language.slice(0, 2);
      if (navLang in dictionaries) {
        setLang(navLang as Locale);
      }
    }
    setMounted(true);
  }, []);

  return { dict: getDictionary(lang), lang, mounted };
}