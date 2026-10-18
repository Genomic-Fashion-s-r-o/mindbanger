import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { getSecureAudioUrl } from '@/lib/cloudflare-r2';
import AudioPlayer from '@/components/AudioPlayer';
import Link from 'next/link';
import { ArrowLeft, Headphones } from 'lucide-react';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { getDictionary } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MyAudioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/mindbanger_daily/login');
  }

  const dict = await getDictionary('sk');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const language = profile?.language || 'sk';

  // Fetch individual recordings
  const { data: recordings, error } = await supabase
    .from('individual_recordings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching recordings", error);
  }

  // Pre-generate secure URLs for each recording
  const secureRecordings = await Promise.all((recordings || []).map(async (rec) => {
      let secureUrl = '';
      if (rec.audio_url) {
         secureUrl = await getSecureAudioUrl(rec.audio_url);
      }
      return {
          ...rec,
          secureUrl
      };
  }));

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      {/* Dynamic Background Noise */}
      <div className="fixed inset-0 pointer-events-none opacity-20 transition-all duration-1000 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-[#020617] to-[#020617]"></div>

      <div className="max-w-4xl mx-auto px-4 pt-16 pb-32 relative z-10">
        
        {/* Nav Header */}
        <div className="flex items-center mb-8 pt-4">
          <Link href="/mindbanger_daily/app/today" className="text-slate-400 hover:text-white transition-colors flex items-center bg-slate-900/50 p-2 rounded-xl backdrop-blur-md border border-white/5">
             <ArrowLeft size={18} className="mr-2" />
             <span>Späť</span>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Headphones className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-serif font-medium bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Moje audio
              </h1>
              <p className="text-slate-400">Tvoje individuálne a osobné nahrávky</p>
            </div>
        </div>

        <div className="space-y-12">
            {!secureRecordings || secureRecordings.length === 0 ? (
                <div className="bg-slate-900/50 border border-white/5 p-12 rounded-[2rem] text-center backdrop-blur-sm">
                    <Headphones className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-slate-300 mb-2">Zatiaľ tu nič nie je</h3>
                    <p className="text-slate-500">
                        Zatiaľ si nedostal žiadne špeciálne individuálne nahrávky. <br/>
                        Akonáhle ti ich vytvoríme, zobrazia sa práve tu.
                    </p>
                </div>
            ) : (
                secureRecordings.map((rec) => (
                    <div key={rec.id} className="group relative">
                        {/* Glow effect behind player */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        
                        <div className="relative">
                            <div className="flex justify-between items-end mb-3 px-2">
                                <h2 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors drop-shadow-sm">{rec.title}</h2>
                                <span className="text-xs font-bold text-blue-400/80 bg-blue-900/20 px-3 py-1 rounded-full border border-blue-500/10">
                                    {format(new Date(rec.created_at), "d.M.yyyy", { locale: sk })}
                                </span>
                            </div>
                            
                            {rec.secureUrl ? (
                                <AudioPlayer
                                   src={rec.secureUrl}
                                   title={rec.title}
                                   author="Mindbanger Osobn� Audio"
                                   recordingId={rec.id}
                                />
                            ) : (
                                <div className="text-center p-8 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-500">
                                    Súbor audia nie je momentálne dostupný.
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </main>
  );
}