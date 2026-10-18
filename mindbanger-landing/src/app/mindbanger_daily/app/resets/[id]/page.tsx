import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { getSecureAudioUrl } from '@/lib/cloudflare-r2';
import AudioPlayer from '@/components/AudioPlayer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n';

export const revalidate = 0;

export default async function ResetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const resetId = resolvedParams.id;
  
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Overenie profilu
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language')
    .eq('id', session?.user.id)
    .single();

  const userLang = profile?.preferred_language || 'en';
  const dict = getDictionary(userLang);

  // Načítať konkrétny reset (musí byť published)
  const { data: resetData } = await supabase
    .from('quick_resets')
    .select('*')
    .eq('id', resetId)
    .eq('is_published', true)
    .single();

  // Ak reset neexistuje, návrat na tab produktov
  if (!resetData) {
    redirect('/mindbanger_daily/app/archive?tab=products');
  }

  // Audio presigned URL
  let audioSignatureUrl = '';
  if (resetData?.audio_url) {
    audioSignatureUrl = await getSecureAudioUrl(resetData.audio_url);
  }

  const displayDate = resetData.created_at 
    ? new Intl.DateTimeFormat(userLang, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(new Date(resetData.created_at))
    : '';

  return (
    <div className="py-2 md:py-6 space-y-6">
      
      {/* Back to archive tab products */}
      <Link href="/mindbanger_daily/app/archive?tab=products" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={16} className="mr-2" /> {dict.resets?.backToProducts || "Back to products"}
      </Link>

      <div className="bg-slate-900 border border-white/5 rounded-[2rem] p-6 md:p-10 relative overflow-hidden shadow-xl mt-4">
        {/* Subtle Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Badge */}
        <div className="mb-6 flex flex-wrap gap-3 items-center">
            <span className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest rounded-full">
              Quick Reset
            </span>
            {displayDate && (
              <span className="px-4 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold tracking-widest rounded-full">
                {displayDate}
              </span>
            )}
        </div>

        <h1 className="text-3xl md:text-5xl font-serif text-white mb-6 leading-tight">
          {resetData.title}
        </h1>
        
        {resetData.description && (
          <div className="prose prose-invert prose-slate max-w-none mb-10 text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">
            {resetData.description}
          </div>
        )}

        {/* Audio Player Injection */}
        {audioSignatureUrl ? (
          <div className="mb-10">
            <AudioPlayer 
              src={audioSignatureUrl} 
              title={`Reset • ${resetData.title}`} 
            />
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-8 text-center text-slate-500">
            {dict.resets?.audioNotAvailable || "Audio not available yet."}
          </div>
        )}
      </div>
    </div>
  );
}