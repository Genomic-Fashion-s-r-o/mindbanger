import { getVerifiedSession } from '@/lib/supabase-server';
import React from 'react';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n';
import { cookies } from 'next/headers';
import LockedDashboard from '@/components/app/LockedDashboard';

export const revalidate = 0; // Always dynamic due to day calculation and temporal content lock

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ArchivePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentTab = params.tab === 'products' ? 'products' : 'daily';

  const supabase = await createClient();
  const { data: { session } } = await getVerifiedSession(supabase);

  // Get user profile (language + registration date for temporal lock)
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language, created_at, subscription_status')
    .eq('id', session?.user.id)
    .single();

  const cookieStore = await cookies();
  const cookieLang = cookieStore.get('user-lang')?.value;
  const userLang = cookieLang || profile?.preferred_language || 'en';

  // Check premium access
  const hasAccess = profile?.subscription_status === 'premium';
  const dict = getDictionary(userLang);
  const t = dict.archive;
  
  // Get date from which user has access (Temporal Content Lock)
  // Ak existuje predplatne s earlier date, dalo by sa zobrazit to, ale pre jednoduchost berieme vytvorenie profilu.
  const tempNow = new Date();
  const accessStartDate = new Date(profile?.created_at || tempNow.toISOString());
  const formattedLockDate = accessStartDate.toISOString().split('T')[0];

  // Dnešný dátum pre obmedzenie do kedy zobrazovať (nepredbiehať)
  const today = new Date().toISOString().split('T')[0];

  // Načítať archív s obmedzeniami len ak sme v 'daily' tabe
  let signals: any[] = [];
  let quickResets: any[] = [];

  if (currentTab === 'daily' && hasAccess) {
    const { data } = await supabase
      .from('daily_signals')
      // Map legacy/wrong fields to schema: title->theme, signal_text->focus_text
      .select('id, date, theme, focus_text, affirmation, status, script') 
      .eq('language', userLang)
      .eq('status', 'published') // Changed from is_published
      .gte('date', formattedLockDate)
      .lte('date', today)
      .order('date', { ascending: false });
    
    // Map database fields to UI components expectations
    signals = data?.map((item: any) => ({
      ...item,
      title: item.theme, 
      signal_text: item.script || item.focus_text || item.affirmation
    })) || [];
  } else {
    // Načítať samostatné produkty - Quick Resets
    const { data } = await supabase
      .from('quick_resets')
      .select('id, title, description, audio_url, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    quickResets = data || [];
  }

  // Pre vizuálnu pestrosť Quick Resetov
  const visualPresets = [
    { icon: '🌊', color: 'from-blue-500/20 to-cyan-500/5' },
    { icon: '⚡', color: 'from-amber-500/20 to-orange-500/5' },
    { icon: '🌙', color: 'from-indigo-500/20 to-purple-500/5' },
    { icon: '🧠', color: 'from-emerald-500/20 to-teal-500/5' },
  ];

  // Naformátovať dátum pre zobrazenie UI hlavičky
  const formatter = new Intl.DateTimeFormat(userLang, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="py-2 md:py-6 space-y-8">
      
      {/* Header */}
      <header className="space-y-6 mb-10">
         <h1 className="text-3xl md:text-4xl font-serif text-white">
           {t.title}
         </h1>
         <p className="text-slate-400 max-w-lg leading-relaxed">{t.subtitle}</p>
         
         {/* Custom Tabs */}
         <div className="flex bg-slate-900/40 p-1.5 rounded-full w-fit border border-white/5 shadow-xl backdrop-blur-md">
           <Link href="?tab=daily" className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${currentTab === 'daily' ? 'bg-amber-500/10 text-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>{t.tabDaily}</Link>
           <Link href="?tab=products" className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${currentTab === 'products' ? 'bg-amber-500/10 text-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>{t.tabProducts}</Link>
         </div>
      </header>

      {currentTab === 'daily' ? (
        /* Grid of Past Signals */
        signals && signals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {signals.map((signal) => (
            <Link href={`/mindbanger_daily/app/archive/${signal.id}`} key={signal.id} className="group block">
              <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 h-full hover:bg-slate-800/80 transition-all duration-300 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(234,179,8,0.05)] relative overflow-hidden flex flex-col">
                
                {/* Jemný glow on hover */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/0 group-hover:bg-amber-500/10 rounded-full blur-2xl transition-all duration-500 pointer-events-none" />
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-500/80 group-hover:text-amber-400 transition-colors">
                    {signal.theme}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatter.format(new Date(signal.date))}
                  </span>
                </div>
                
                <h3 className="text-xl font-serif text-white mb-3 group-hover:text-amber-50 transition-colors">
                  {signal.title}
                </h3>
                
                <p className="text-slate-400 text-sm line-clamp-3 mb-6 mt-1 flex-grow">
                  {signal.signal_text}
                </p>

                <div className="flex items-center text-amber-500/70 text-sm font-medium mt-auto group-hover:text-amber-400 transition-colors">
                  {t.readReset} <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-12 text-center flex flex-col justify-center items-center h-[300px]">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 text-2xl">
            🕰️
          </div>
          <h2 className="text-xl font-serif text-white mb-2">{t.libraryEmpty}</h2>
          <p className="text-slate-400 max-w-sm text-sm">
            {t.temporalLockText}
          </p>
        </div>
      )) : (
        /* Products / Quick Resets Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
          {quickResets.map((product, idx) => {
            const preset = visualPresets[idx % visualPresets.length];
            return (
              <Link href={`/mindbanger_daily/app/resets/${product.id}`} key={product.id} className="group relative block rounded-[32px] overflow-hidden bg-slate-900 border border-white/5 hover:border-amber-500/20 transition-all duration-500 hover:shadow-[0_8px_40px_rgba(234,179,8,0.06)] cursor-pointer">
                {/* Animated Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${preset.color} opacity-30 group-hover:opacity-100 transition-opacity duration-700`} />
                
                {/* Noise overlay */}
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>

                <div className="relative p-8 md:p-10 h-full flex flex-col z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500 shadow-xl">
                      {preset.icon}
                    </div>
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t.audioAdjust}</span>
                    </div>
                  </div>

                  <h3 className="text-2xl font-serif text-white mb-3 group-hover:text-amber-50 transition-colors">
                    {product.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-grow">
                    {product.description}
                  </p>

                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">{t.quickReset}</span>
                    <div className="flex items-center text-amber-500 text-sm font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
                      {t.startReset} <span className="ml-2 group-hover:translate-x-1.5 transition-transform duration-300">→</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          {quickResets.length === 0 && (
            <div className="md:col-span-2 bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-12 text-center flex flex-col justify-center items-center h-[300px]">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 text-2xl">
                🎧
              </div>
              <h2 className="text-xl font-serif text-white mb-2">{t.preparing}</h2>
              <p className="text-slate-400 max-w-sm text-sm">
                {t.noResetsText}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// trigger ts server update
