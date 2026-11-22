"use client";

import React, { useState } from 'react';
import AudioPlayer from '@/components/AudioPlayer';
import CompleteButton from '@/components/CompleteButton';
import { Building2, User } from 'lucide-react';

type Signal = any; // Replace with proper type from DB

type TodayClientViewProps = {
  userLang: string;
  firstName: string;
  t: any; // Dictionary
  displayDate: string;
  personalSignal: Signal | null;
  corporateSignal: Signal | null;
  isOnboardingWait: boolean;
  corporateName?: string;
};

export default function TodayClientView({ 
  userLang, 
  firstName, 
  t, 
  displayDate, 
  personalSignal, 
  corporateSignal, 
  isOnboardingWait,
  corporateName 
}: TodayClientViewProps) {
  
  const [activeTab, setActiveTab] = useState<'personal' | 'corporate'>('personal');

  // Helper to render signal card
  const renderSignal = (signal: Signal, isCorporate: boolean) => {
    if (!signal) return (
      <div className="bg-slate-900 border border-white/5 rounded-[2rem] p-10 text-center flex flex-col justify-center items-center min-h-[300px]">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">{isOnboardingWait && !isCorporate ? "⏳" : "?"}</span>
        </div>
        <h2 className="text-2xl font-serif text-white mb-2">
           {isCorporate ? (userLang === 'sk' ? "Žiadny firemný signál na dnes" : "No company signal for today") : 
            (isOnboardingWait ? (userLang === 'sk' ? "Tvoja cesta začína zajtra" : "Your journey starts tomorrow") : t.tuning)}
        </h2>
        <p className="text-slate-400 max-w-sm">
           {isCorporate ? (userLang === 'sk' ? "Skús skontrolovať neskôr." : "Check back later.") :
            (isOnboardingWait 
               ? (userLang === 'sk' ? "Pripravujeme tvoj prvý signál." : "We are preparing your first signal.") 
               : t.notBroadcasted)}
        </p>
      </div>
    );

    return (
        <div className={`bg-slate-900 border ${isCorporate ? 'border-amber-500/30' : 'border-white/5'} rounded-[2rem] p-6 md:p-10 relative overflow-hidden shadow-2xl transition-all duration-500`}>
          {/* Subtle Glow */}
          <div className={`absolute top-0 right-0 w-64 h-64 ${isCorporate ? 'bg-blue-500/10' : 'bg-amber-500/5'} rounded-full blur-3xl pointer-events-none`} />

          {/* Theme Badge */}
          <div className="mb-6 inline-block">
              <span className={`px-4 py-1.5 ${isCorporate ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'} border text-xs font-bold uppercase tracking-widest rounded-full`}>
                {signal.day_number ? `Day ${signal.day_number}` : signal.theme}
              </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-serif text-white mb-6 leading-tight">
             {signal.day_number ? signal.theme : (signal.title || t.todaysSignal)}
          </h2>

          {/* Spoken Audio Player */}
          {signal.spoken_audio_url_signed && (
            <div className="mb-8">
              <AudioPlayer
                src={signal.spoken_audio_url_signed}
                title={t.listenToText || "Daily Listen"}
                author="Mindbanger"
                compact={true}
              />
            </div>
          )}

          <div className="prose prose-invert prose-slate max-w-none mb-10 text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">
            {signal.signal_text}
          </div>

          {/* Audio Player Injection */}
          {signal.main_audio_url_signed && (
            <div className="mb-10">
              <AudioPlayer 
                src={signal.main_audio_url_signed} 
                backgroundSrc={signal.background_audio_url_signed}
                title={`${t.dailyReset} • ${signal.theme}`}
              />
            </div>
          )}
        </div>
    );
  };

  const currentSignal = activeTab === 'corporate' ? corporateSignal : personalSignal;

  return (
    <div className="py-2 md:py-6 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <header className="space-y-1 flex justify-between items-end">
         <div>
            <h1 className="text-3xl md:text-4xl font-serif text-white mb-2">
              {t.goodMorning}, {firstName}.
            </h1>
            <p className="text-slate-400 capitalize">{displayDate}</p>
         </div>
         
         {/* Tabs if Corporate available */}
         {corporateSignal && (
            <div className="flex bg-slate-800/50 p-1 rounded-full border border-white/10">
               <button 
                 onClick={() => setActiveTab('personal')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'personal' ? 'bg-white text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
               >
                 <User size={14} />
                 {userLang === 'sk' ? "Osobné" : "Personal"}
               </button>
               <button 
                 onClick={() => setActiveTab('corporate')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'corporate' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
               >
                 <Building2 size={14} />
                 {corporateName || (userLang === 'sk' ? "Firemné" : "Company")}
               </button>
            </div>
         )}
      </header>

      {/* Focus Block */}
      {currentSignal && currentSignal.focus_text && (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-lg">
          <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-2">{t.todaysFocus}</h3>
          <p className="text-slate-200 font-medium text-lg">{currentSignal.focus_text}</p>
        </div>
      )}

      {/* Main Signal Card */}
      {renderSignal(currentSignal, activeTab === 'corporate')}
      
      {/* Affirmation Block */}
      {currentSignal && currentSignal.affirmation && (
        <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="absolute -right-4 -bottom-4 text-amber-500/10 text-8xl font-serif leading-none">"</div>
          <h3 className="text-xs text-amber-500 uppercase tracking-widest mb-2">{t.affirmation}</h3>
          <p className="text-amber-100/90 italic text-lg">"{currentSignal.affirmation}"</p>
        </div>
      )}

      {/* Done Button */}
      {currentSignal && (
        <div className="pt-4 flex justify-center pb-8">
          <CompleteButton 
            signalId={currentSignal.id} 
            label={t.markCompleted}
            completedLabel={t.completedLabel || "Denný Mindset Nastavený"}
            type={currentSignal.type || 'daily'}
             />
        </div>
      )}

    </div>
  );
}