import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

export default async function PrivacyPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('user-lang')?.value || 'en';

  let dict: any = {};
  try {
    const dictPath = path.join(process.cwd(), 'src/dictionaries/legal', lang + '.json');
    dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  } catch (err) {
    const fbPath = path.join(process.cwd(), 'src/dictionaries/legal/en.json');
    dict = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
  }

  const { title, lastUpdated, content } = dict.privacy;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/mindbanger_daily" className="text-amber-500 hover:text-amber-400 mb-8 inline-block text-sm transition-colors">
          &larr; Back to Home
        </Link>
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4">{title}</h1>
        <p className="text-sm text-slate-500 mb-12">Last updated: {lastUpdated}</p>
        
        <div 
          className="text-slate-300 space-y-4 leading-relaxed [&>h1]:text-2xl [&>h1]:text-white [&>h1]:font-serif [&>h1]:mb-6 [&>h2]:text-xl [&>h2]:text-white [&>h2]:font-serif [&>h2]:mt-8 [&>h2]:mb-4 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-2"
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      </div>
    </div>
  );
}
