
"use client";
import toast from 'react-hot-toast';
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Edit2, Trash2, Calendar, CheckCircle2, Languages, FileAudio, Sparkles } from "lucide-react";

type CorporateOnboardingSignal = {
  id: string;
  day_number: number;
  theme: string;       
  script: string | null; 
  focus: string | null;
  affirmation: string | null;
  meditation_text?: string | null;
  push_text?: string | null;
  audio_url: string | null; 
  spoken_audio_url?: string | null; 
  meditation_audio_url?: string | null; 
  language: string;
  generation_metadata?: any;
  OMITTED_PROGRESS?: { count: number }[];
};

export default function B2BOnboardingManager() {
  const [signals, setSignals] = useState<CorporateOnboardingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSignal, setEditingSignal] = useState<CorporateOnboardingSignal | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchSignals();
  }, []);

  async function fetchSignals() {
    setLoading(true);
    const { data, error } = await supabase
      .from('corporate_onboarding_signals')
      .select('*')
      .order('day_number', { ascending: true });
    
    if (!error && data) {
      // Map legacy fields if necessary, though new table is clean
      // Just to be safe with naming conventions matching daily_signals logic
      const mapped = data.map(d => ({
        ...d,
        theme: d.theme || d.title,
        script: d.script || d.signal_text,
        focus: d.focus || d.focus_text,
      }));
      setSignals(mapped);
    } else {
        console.error(error);
        if (error?.code === "42P01") {
            toast.error("Table corporate_onboarding_signals not found! Run migration.");
        }
    }
    setLoading(false);
  }

  function handleNew() {
    // Determine next day number
    const maxDay = signals.length > 0 ? Math.max(...signals.map(s => s.day_number)) : 0;
    setEditingSignal({
      id: '',
      day_number: maxDay + 1,
      theme: '',
      script: '',
      focus: '',
      affirmation: '',
      audio_url: '',
      spoken_audio_url: '',
      meditation_audio_url: '',
      push_text: '',
      language: 'sk',
      meditation_text: ''
    });
    setIsFormOpen(true);
  }

  function handleEdit(signal: CorporateOnboardingSignal) {
    setEditingSignal(signal);
    setIsFormOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Naozaj vymazať?')) return;
    const { error } = await supabase.from('corporate_onboarding_signals').delete().eq('id', id);
    if (!error) {
       toast.success('Zmazané');
       fetchSignals();
    } else {
       toast.error('Chyba pri mazaní');
    }
  }

  async function saveSignal(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSignal) return;

    // Payload for DB
    const dbPayload: any = {
        day_number: Number(editingSignal.day_number), // Ensure number
        language: editingSignal.language,
        
        theme: editingSignal.theme,
        title: editingSignal.theme, 

        script: editingSignal.script,
        signal_text: editingSignal.script,

        focus_text: editingSignal.focus, 
        focus: editingSignal.focus,
        
        affirmation: editingSignal.affirmation,
        meditation_text: editingSignal.meditation_text,
        push_text: editingSignal.push_text,

        audio_url: editingSignal.audio_url,
        spoken_audio_url: editingSignal.spoken_audio_url,
        meditation_audio_url: editingSignal.meditation_audio_url,

        generation_metadata: editingSignal.generation_metadata
    };

    try {
        if (!editingSignal.id) {
          // INSERT
          const { error } = await supabase.from('corporate_onboarding_signals').insert([dbPayload]);
          if (error) throw error;
          
          setIsFormOpen(false);
          fetchSignals();
          toast.success('Vytvorené!');
        } else {
          // UPDATE
          const { error } = await supabase.from('corporate_onboarding_signals')
            .update(dbPayload)
            .eq('id', editingSignal.id);
          
          if (error) throw error;

          setIsFormOpen(false);
          fetchSignals();
          toast.success('Uložené!');
        }
    } catch (error: any) {
        console.error('Save Error:', error);
        toast.error('Chyba: ' + (error.message || 'Nepodarilo sa uložiť'));
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, field: 'audio_url' | 'spoken_audio_url' | 'meditation_audio_url' = 'audio_url') {
    const file = e.target.files?.[0];
    if (!file || !editingSignal) return;

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      toast.error('Prosím, nahrajte iba .mp3 súbory.');
      return;
    }

    setIsUploading(true);

    try {
      // 1. Get presigned URL via API (reusing existing endpoint)
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: `b2b-onboarding-day-${editingSignal.day_number}-${field}-${file.name}`, contentType: file.type }),
      });

      if (!res.ok) throw new Error('Chyba pri získavaní linku');

      const { uploadUrl, publicUrl } = await res.json();

      // 2. Upload file to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Chyba pri nahrávaní súboru');

      // 3. Update state
      setEditingSignal(prev => prev ? ({ ...prev, [field]: publicUrl }) : null);
      toast.success('Súbor nahratý!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  }

  if (loading && signals.length === 0) return <div className="p-10 text-slate-400">Načítavam onboarding...</div>;

  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-white mb-2">Editor prvých dní (1-7+)</h2>
          <p className="text-slate-400">Pevná postupnosť obsahu pre nových používateľov.</p>
        </div>
        <button
          onClick={handleNew}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-3 rounded-xl font-bold flex items-center transition-colors"
        >
          <Plus size={20} className="mr-2" /> Pridať Deň
        </button>
      </div>

      {!isFormOpen ? (
        <div className="grid gap-4">
            {signals.map(s => (
                <div key={s.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-amber-500 font-mono text-xl">
                            {s.day_number}
                        </div>
                        <div>
                            <div className="font-bold text-white flex items-center gap-2">
                                <span>{s.theme}</span>
                                <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-400 uppercase">{s.language}</span>

                            </div>
                            <div className="text-sm text-slate-400 truncate max-w-md">{s.script || s.focus || 'Bez textu...'}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => handleEdit(s)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"><Edit2 size={18} /></button>
                         <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-red-900/20 rounded-lg text-slate-600 hover:text-red-400"><Trash2 size={18} /></button>
                    </div>
                </div>
            ))}
             {signals.length === 0 && (
                <div className="text-center p-10 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Žiadne signály pre on-boarding. Kliknite na "Pridať Deň".
                </div>
            )}
        </div>
      ) : editingSignal && (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 md:p-8 mb-10 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl text-white font-bold">
                {editingSignal.id ? `Upraviť Deň ${editingSignal.day_number}` : 'Nový Deň'}
            </h2>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">Zavrieť</button>
          </div>
          
          <form onSubmit={saveSignal} className="space-y-6">
            {/* Metadata Row */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Jazyk</label>
                <select value={editingSignal.language} onChange={e => setEditingSignal({...editingSignal, language: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500" required>
                  <option value="sk">Slovenčina (sk)</option>
                  <option value="en">English (en)</option>
                  <option value="cs">Čeština (cs)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Poradové číslo dňa (1 = Prvý deň)</label>
                <input type="number" min="1" max="99" value={editingSignal.day_number} onChange={e => setEditingSignal({...editingSignal, day_number: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500" required />
              </div>
            </div>

            {/* Content Row */}
            <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm text-slate-400 mb-2">Téma (Theme)</label>
                    <input type="text" value={editingSignal.theme} onChange={e => setEditingSignal({...editingSignal, theme: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500" required placeholder="Napr. VITAJ V SYSTÉME" />
                 </div>
                 <div>
                    <label className="block text-sm text-slate-400 mb-2">Fokus dňa (Short Focus)</label>
                    <input type="text" value={editingSignal.focus || ''} onChange={e => setEditingSignal({...editingSignal, focus: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500" placeholder="Krátka veta pre UI..." />
                 </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Hlavný Skript (Script - TTS)</label>
              <p className="text-xs text-slate-500 mb-2">Toto je text, ktorý bude čítať AI (TTS) a zobrazí sa v detaile.</p>
              <textarea 
                value={editingSignal.script || ''} 
                onChange={e => setEditingSignal({...editingSignal, script: e.target.value})} 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-white focus:outline-none focus:border-amber-500 min-h-[150px]" 
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Afirmácia</label>
              <textarea value={editingSignal.affirmation || ''} onChange={e => setEditingSignal({...editingSignal, affirmation: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500 mb-4" rows={2} />
              
              <label className="block text-sm text-indigo-400 mb-2 font-bold">Meditácia (Text/Script)</label>
              <textarea 
                value={editingSignal.meditation_text || ''} 
                onChange={e => setEditingSignal({...editingSignal, meditation_text: e.target.value})} 
                className="w-full bg-slate-950/50 border border-indigo-500/30 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600" 
                placeholder="Text pre riadenú meditáciu..." 
                rows={4} 
              />
            </div>

             <div>
                <label className="block text-sm text-slate-400 mb-2">Push Notifikácia</label>
                <input type="text" value={editingSignal.push_text || ''} onChange={e => setEditingSignal({...editingSignal, push_text: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500" placeholder="Text pre notifikáciu..." />
             </div>

            {/* Audio Files */}
            <div className="grid md:grid-cols-3 gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
               {/* 1. Spoken Word (Daily Text) */}
               <div>
                  <label className="block text-xs text-amber-500 mb-2 font-bold uppercase tracking-wider flex items-center gap-2">
                     <FileAudio size={14}/> Text Dňa (Hovorené)
                  </label>
                  <input type="text" value={editingSignal.spoken_audio_url || ''} onChange={e => setEditingSignal({...editingSignal, spoken_audio_url: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs mb-2" placeholder="URL k .mp3" />
                  <input type="file" accept=".mp3" onChange={e => handleFileUpload(e, 'spoken_audio_url')} disabled={isUploading} className="text-xs text-slate-500 w-full" />
               </div>

               {/* 2. Guided Meditation */}
               <div>
                  <label className="block text-xs text-indigo-400 mb-2 font-bold uppercase tracking-wider flex items-center gap-2">
                     <FileAudio size={14}/> Meditácia (Sprievodca)
                  </label>
                  <input type="text" value={editingSignal.meditation_audio_url || ''} onChange={e => setEditingSignal({...editingSignal, meditation_audio_url: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs mb-2" placeholder="URL k .mp3" />
                  <input type="file" accept=".mp3" onChange={e => handleFileUpload(e, 'meditation_audio_url')} disabled={isUploading} className="text-xs text-slate-500 w-full" />
               </div>

               {/* 3. Background Music */}
               <div>
                  <label className="block text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider flex items-center gap-2">
                     <FileAudio size={14}/> Hudba (Pozadie/Ambient)
                  </label>
                  <input type="text" value={editingSignal.audio_url || ''} onChange={e => setEditingSignal({...editingSignal, audio_url: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs mb-2" placeholder="URL k .mp3" />
                  <input type="file" accept=".mp3" onChange={e => handleFileUpload(e, 'audio_url')} disabled={isUploading} className="text-xs text-slate-500 w-full" />
               </div>
            </div>

            <button disabled={isUploading} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-4 rounded-xl transition-colors disabled:opacity-50">
               {isUploading ? 'Nahrávam súbory...' : 'Uložiť Deň'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
