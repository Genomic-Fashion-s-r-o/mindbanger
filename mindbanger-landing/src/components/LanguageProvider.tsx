'use client';
import React, { createContext, useContext } from 'react';

const LanguageContext = createContext<any>(null);

export function LanguageProvider({ children, dict, lang = 'sk' }: { children: React.ReactNode, dict: any, lang?: string }) {
  return (
    <LanguageContext.Provider value={{ dict, lang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useDictionary() {
  const context = useContext(LanguageContext);
  if (!context) {
    return { dict: null, lang: 'sk' };
  }
  return context;
}
