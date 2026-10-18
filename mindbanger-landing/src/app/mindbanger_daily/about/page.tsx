import React from 'react';
import { getDictionary } from '@/lib/i18n';
import { cookies } from 'next/headers';
import { LanguageProvider } from '@/components/LanguageProvider';
import AboutContent from '@/components/AboutContent';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AboutPage({ searchParams }: PageProps) {
  // Try to determine language from cookies or default to 'en'
  const cookieStore = await cookies();
  const langCookie = cookieStore.get('user-lang');
  
  // Use a type-safe fallback
  let lang = 'en';
  if (langCookie?.value === 'sk') lang = 'sk';
  if (langCookie?.value === 'cs') lang = 'cs';
  
  // Fetch dictionary on server
  const dict = getDictionary(lang as 'en' | 'sk' | 'cs');

  return (
    <LanguageProvider dict={dict}>
      <AboutContent />
    </LanguageProvider>
  );
}