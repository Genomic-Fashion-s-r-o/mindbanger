import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { getSecureAudioUrl } from '@/lib/cloudflare-r2';
import AudioPlayer from '@/components/AudioPlayer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function ArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const signalId = resolvedParams.id;
  
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // 1. Ochrana + zistenie user constraints
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language, created_at')
    .eq('id', session?.user.id)
    .single();

  const userLang = profile?.preferred_language || 'en';
  const now = new Date();
  const accessStartDate = new Date(profile?.created_at || now);
  const formattedLockDate = accessStartDate.toISOString().split('T')[0];

  // 2. Načítať konkrétny signál (overiť či sa zmestí do temporal locku)
  const { data: signal } = await supabase
    .from('daily_signals')
    .select('*')
    .eq('id', signalId)
    .eq('language', userLang)
    .eq('status', 'published') // Changed from is_published
    .gte('date', formattedLockDate) // Striktne overíme či má nárok
    .single();

  // Ak signál neexistuje, alebo používateľ porušil Temporal Content Lock, odkopneme ho na výpis
  if (!signal) {
    redirect('/mindbanger_daily/app/archive');
  }

  // 3. Audio logic for dual tracks
  let mainAudioUrl = '';
  let backgroundAudioUrl = '';
  
  if (signal?.meditation_audio_url) {
    mainAudioUrl = await getSecureAudioUrl(signal.meditation_audio_url);
    if (signal.audio_url) {
      backgroundAudioUrl = await getSecureAudioUrl(signal.audio_url);
    }
  } else if (signal?.audio_url) {
    mainAudioUrl = await getSecureAudioUrl(signal.audio_url);
  }

  const displayDate = new Intl.DateTimeFormat(userLang, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(signal.date));

  return (
    <div className="py-2 md:py-6 space-y-6">
      
      {/* Back to archive */}
      <Link href="/mindbanger_daily/app/archive" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Späť do archívu
      </Link>

      <div className="bg-slate-900 border border-white/5 rounded-[2rem] p-6 md:p-10 relative overflow-hidden shadow-xl mt-4">
        {/* Subtle Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Date & Theme Badge */}
        <div className="mb-6 flex flex-wrap gap-3 items-center">
            <span className="px-4 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold tracking-widest rounded-full">
              {displayDate}
            </span>
            <span className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest rounded-full">
              {signal.theme}
            </span>
        </div>

        <h1 className="text-3xl md:text-5xl font-serif text-white mb-6 leading-tight">
          {signal.title}
        </h1>
        
        <div className="prose prose-invert prose-slate max-w-none mb-10 text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">
          {signal.signal_text}
        </div>

        {/* Audio Player Injection */}
        {mainAudioUrl && (
          <div className="mb-10">
            <AudioPlayer 
              src={mainAudioUrl}
              backgroundSrc={backgroundAudioUrl}
              title={`Archive • ${signal.theme}`}
            />
          </div>
        )}

        {/* Focus & Affirmation Block */}
        <div className="grid md:grid-cols-2 gap-4">
          {signal.focus_text && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
              <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-2">Focus dňa</h3>
              <p className="text-slate-200 font-medium">{signal.focus_text}</p>
            </div>
          )}
          
          {signal.affirmation && (
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 text-amber-500/10 text-8xl font-serif leading-none">"</div>
              <h3 className="text-xs text-amber-500 uppercase tracking-widest mb-2">Afirmácia</h3>
              <p className="text-amber-100/90 italic">"{signal.affirmation}"</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}