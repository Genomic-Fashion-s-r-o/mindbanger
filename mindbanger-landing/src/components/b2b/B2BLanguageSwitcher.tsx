'use client';

import React, { useEffect, useState } from 'react';

export default function B2BLanguageSwitcher({ initialLang }: { initialLang: 'sk' | 'cs' | 'en' }) {
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    // Client-side initialization to reflect current cookie (if we navigated without searchParams)
    const cookies = document.cookie.split('; ');
    const langCookie = cookies.find(c => c.startsWith('user-lang='));
    if (langCookie) {
      const val = langCookie.split('=')[1] as 'sk' | 'cs' | 'en';
      if (['sk', 'cs', 'en'].includes(val)) {
         setLang(val);
      }
    }
  }, []);

  const handleChange = (newLang: 'sk' | 'cs' | 'en') => {
    setLang(newLang);
    document.cookie = `user-lang=${newLang}; path=/; max-age=31536000`;
    // Update url search params as fallback but strictly reload to apply cookie to server elements
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLang);
    window.location.href = url.toString();
  };

  return (
    <div className="flex gap-4">
      <button onClick={() => handleChange('en')} className={`text-sm font-medium ${lang === 'en' ? 'text-white' : 'text-slate-500'}`}>EN</button>
      <button onClick={() => handleChange('sk')} className={`text-sm font-medium ${lang === 'sk' ? 'text-white' : 'text-slate-500'}`}>SK</button>
      <button onClick={() => handleChange('cs')} className={`text-sm font-medium ${lang === 'cs' ? 'text-white' : 'text-slate-500'}`}>CZ</button>
    </div>
  );
}
