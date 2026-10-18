import { getVerifiedSession } from '@/lib/supabase-server';
import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { getDictionary } from '@/lib/i18n';
import { cookies } from 'next/headers';
import Link from 'next/link';

export const revalidate = 0;

export default async function ResetsPage() {
  const supabase = await createClient();
  const { data: { session } } = await getVerifiedSession(supabase);

  // Get user profile for language
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language, subscription_status')
    .eq('id', session?.user.id)
    .single();

  const cookieStore = await cookies();
  const cookieLang = cookieStore.get('user-lang')?.value;
  const userLang = cookieLang || profile?.preferred_language || 'en';
  const dict = getDictionary(userLang);
  
  // Custom texts based on language (fallback if not in dict)
  const texts = {
    en: { title: 'Mindsets', empty: "You don't have any targeted mindsets yet.", audioAdjust: "AUDIO RESET", quickReset: "Reset", startReset: "Start Reset" },
    sk: { title: 'Mindsety', empty: "Zatiaľ nemáte žiadne cielené mindsety.", "audioAdjust": "AUDIO RESET", quickReset: "Reset", startReset: "Spustiť" },
    cs: { title: 'Mindsety', empty: "Zatím nemáte žádné cílené mindsety.", "audioAdjust": "AUDIO RESET", quickReset: "Reset", startReset: "Spustit" }
  };
  const t = texts[userLang as keyof typeof texts] || texts.en;

  // Visual Presets
  const visualPresets = [
    { icon: '🌊', color: 'from-blue-500/20 to-cyan-500/5' },
    { icon: '⚡', color: 'from-amber-500/20 to-orange-500/5' },
    { icon: '🌌', color: 'from-indigo-500/20 to-purple-500/5' },
    { icon: '🧠', color: 'from-emerald-500/20 to-teal-500/5' },
  ];

  /* 
   * "Resets" usually point to some form of targeted product or bought reset.
   * If there are no resets available for the user, they will see the empty message.
   */
  const { data } = await supabase
    .from('quick_resets')
    .select('id, title, description, audio_url, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  const quickResets: any[] = data || [];

  return (
    <div className="py-2 md:py-6 space-y-8 animate-fade-in pb-24 md:pb-0">
      <header className="space-y-2 mb-10">
         <h1 className="text-3xl md:text-4xl font-serif text-white">
           {t.title}
         </h1>
      </header>

      {quickResets.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-12 text-center flex flex-col justify-center items-center h-[400px]">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/5">
            <span className="text-3xl opacity-60">🎧</span>
          </div>
          <h2 className="text-xl font-serif text-white mb-3 tracking-wide">{t.empty}</h2>
          <div className="flex gap-2 justify-center mt-4 opacity-50">
             <div className="h-1.5 w-12 bg-amber-500/40 rounded-full"></div>
             <div className="h-1.5 w-4 bg-slate-700 rounded-full"></div>
             <div className="h-1.5 w-4 bg-slate-700 rounded-full"></div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
          {quickResets.map((product, idx) => {
            const preset = visualPresets[idx % visualPresets.length];
            return (
              <Link href={`/mindbanger_daily/app/resets/${product.id}`} key={product.id} className="group relative block rounded-[32px] overflow-hidden bg-slate-900 border border-white/5 hover:border-amber-500/20 transition-all duration-500 hover:shadow-[0_8px_40px_rgba(234,179,8,0.06)] cursor-pointer">
                <div className={`absolute inset-0 bg-gradient-to-br ${preset.color} opacity-30 group-hover:opacity-100 transition-opacity duration-700`} />
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
        </div>
      )}
    </div>
  );
}