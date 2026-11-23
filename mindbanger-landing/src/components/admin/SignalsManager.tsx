"use client";
import toast from 'react-hot-toast';
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Edit2, Trash2, Calendar, CheckCircle2, Languages, FileAudio, Sparkles, Play } from "lucide-react";

type DailySignal = {
  id: string;
  date: string;
  theme: string;       // Was title
  script: string | null; // Was signal_text
  focus: string | null; // Was focus_text
  affirmation: string | null;
  meditation_text?: string | null; // NEW FIELD
  audio_url: string | null; // Background / Meditation
  spoken_audio_url?: string | null; // Spoken word
  push_text?: string | null;
  language: string;
  status: 'draft' | 'generated' | 'published'; // Was is_published boolean
  generation_metadata?: any;
  meditation_audio_url?: string | null; // NEW: Guided meditation
};

export default function SignalsManager() {
  const [signals, setSignals] = useState<DailySignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSignal, setEditingSignal] = useState<DailySignal | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatingAudioField, setGeneratingAudioField] = useState<'spoken_audio_url' | 'meditation_audio_url' | null>(null);
  
  // Master Generator State
  const [generateDate, setGenerateDate] = useState(new Date().toISOString().split('T')[0]);
  const [generateTheme, setGenerateTheme] = useState('');
  const [isMasterGenerating, setIsMasterGenerating] = useState(false);

  useEffect(() => {
    fetchSignals();
  }, []);

  async function fetchSignals() {
    setLoading(true);
    const { data, error } = await supabase
      .from('daily_signals')
      .select('*')
      .order('date', { ascending: false });
    
    if (!error && data) {
      // Map DB columns to UI state shape
      const mapped = data.map(d => ({
        ...d,
        theme: d.theme || d.title, // Backend uses 'title' or 'theme'
        script: d.script || d.signal_text, // Backend uses 'signal_text'
        focus: d.focus || d.focus_text, // Backend uses 'focus_text'
        
        // Ensure new fields exist
        meditation_text: d.meditation_text,
        meditation_audio_url: d.meditation_audio_url
      }));
      setSignals(mapped);
    }
    setLoading(false);
  }

  async function handleMasterGenerate() {
    if (!generateDate) return toast.error("Zadajte dátum.");
    
    if (!confirm(`Vygenerovať Master Content pre ${generateDate} (EN, SK, CS)?\n\nToto prepíše existujúci obsah pre tento deň vo všetkých jazykoch.`)) return;

    setIsMasterGenerating(true);
    const toastId = toast.loading("Generujem Master Content (EN, SK, CS)...");
    
    try {
        const res = await fetch('/api/admin/generate-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                date: generateDate,
                themeHint: generateTheme || undefined
            }) 
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Generovanie zlyhalo');
        }
        
        toast.success("Obsah vygenerovaný pre všetky jazyky!", { id: toastId });
        setGenerateTheme(''); // Clear theme after success
        fetchSignals(); // Refresh list to see new items
    } catch (e: any) {
        console.error(e);
        toast.error("Chyba: " + e.message, { id: toastId });
    } finally {
        setIsMasterGenerating(false);
    }
  }

  async function handleTranslateToOtherLanguages(signal: DailySignal) {
    if (!confirm(`Naozaj chcete preložiť tento slovenský mindset (Dátum: ${signal.date}) do ďalších jazykov (CS, EN)?`)) return;
    const toastId = toast.loading(`Prekladám ${signal.date} do iných jazykov...`);
    try {
        const res = await fetch('/api/admin/translate-mindset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceId: signal.id, type: 'personal', targetLanguages: ['cs', 'en'] })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Preklad zlyhal');
        }
        toast.success('Preklad úspešne dokončený!', { id: toastId });
        fetchSignals();
    } catch (error: any) {
        toast.error(error.message, { id: toastId });
    }
  }

  async function handleQuickGenerate(signal: DailySignal) {
    if (!signal.date) return toast.error('Signál nemá dátum.');
    if (!confirm(`Vygenerovať obsah pre ${signal.date} (${signal.language})?\nPrepíše existujúci text.`)) return;

    setGeneratingId(signal.id);
    const toastId = toast.loading('Generujem obsah... (cca 15s)');

    try {
        const res = await fetch('/api/admin/generate-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: signal.date,
                language: signal.language,
                themeHint: signal.theme
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Chyba generovania');
        }

        const data = await res.json();
        
        // Update local state directly
        const updatedSignal: DailySignal = {
            ...signal,
            theme: data.theme || signal.theme,
            focus: data.focus_text || data.focus || "",
            affirmation: data.affirmation,
            script: data.script,
            meditation_text: data.meditation_text || "",
            status: 'generated',
            generation_metadata: data.generation_metadata
        };

        // Save to DB immediately to persist generation
        const { error } = await supabase.from('daily_signals')
            .update({
                theme: updatedSignal.theme,
                title: updatedSignal.theme,
                focus_text: updatedSignal.focus, // Correct column mapping
                // focus: updatedSignal.focus,  // REMOVED: Extra key
                affirmation: updatedSignal.affirmation,
                script: updatedSignal.script,
                signal_text: updatedSignal.script,
                meditation_text: updatedSignal.meditation_text,
                status: 'generated',
                is_published: false,
                generation_metadata: data.generation_metadata
            })
            .eq('id', signal.id);

        if (error) throw error;

        // Update UI
        setSignals(prev => prev.map(s => s.id === signal.id ? updatedSignal : s));
        toast.success('Obsah vygenerovaný a uložený!', { id: toastId });

    } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Chyba AI', { id: toastId });
    } finally {
        setGeneratingId(null);
    }
  }

  async function handleGenerateAI() {
    if (!editingSignal?.date) return toast.error('Zadajte najprv dátum');
    if (!confirm(`Vygenerovať obsah pre ${editingSignal.date} (${editingSignal.language})?\nPozor: Toto prepíše polia Téma, Fokus, Skript a Afirmácia.`)) return;

    setIsGenerating(true);
    const toastId = toast.loading('Generujem obsah s AI... (cca 15s)');

    try {
        const res = await fetch('/api/admin/generate-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: editingSignal.date,
                language: editingSignal.language,
                themeHint: editingSignal.theme // Use title as hint if provided
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Chyba generovania');
        }

        const data = await res.json();
        
        setEditingSignal(prev => prev ? ({
            ...prev,
            theme: data.theme,
            focus: data.focus_text || data.focus || "",
            affirmation: data.affirmation,
            script: data.script,
            status: 'generated',
            generation_metadata: data.generation_metadata
        }) : null);

        toast.success('Obsah úspešne vygenerovaný!', { id: toastId });
    } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Chyba AI', { id: toastId });
    } finally {
        setIsGenerating(false);
    }
  }

  function handleNew() {
    const today = new Date().toISOString().split('T')[0];
    setEditingSignal({
      id: '',
      date: today,
      theme: '',
      script: '',
      focus: '',
      affirmation: '',
      audio_url: '',
      spoken_audio_url: '',
      push_text: '',
      language: 'sk',
      status: 'draft'
    });
    setIsFormOpen(true);
  }

  function handleEdit(signal: DailySignal) {
    setEditingSignal(signal);
    setIsFormOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Naozaj vymazať?')) return;
    const { error } = await supabase.from('daily_signals').delete().eq('id', id);
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

    // Robust payload construction to satisfy all legacy DB columns
    const dbPayload: any = {
        date: editingSignal.date,
        language: editingSignal.language,
        
        // Theme & Title (Fill both to be safe)
        theme: editingSignal.theme,
        title: editingSignal.theme, 

        // Script & Signal Text (Fill both to be safe)
        script: editingSignal.script,
        signal_text: editingSignal.script,

        // Focus Text
        focus_text: editingSignal.focus, 
        
        affirmation: editingSignal.affirmation,
        meditation_text: editingSignal.meditation_text,
        push_text: editingSignal.push_text,
        
        // Audio
        audio_url: editingSignal.audio_url,
        spoken_audio_url: editingSignal.spoken_audio_url,
        meditation_audio_url: editingSignal.meditation_audio_url,

        // Status & Published Flag
        status: editingSignal.status,
        is_published: editingSignal.status === 'published',
        
        // Metadata
        generation_metadata: editingSignal.generation_metadata
    };

    try {
        if (!editingSignal.id) {
          // INSERT
          const { error } = await supabase.from('daily_signals').insert([dbPayload]);
          if (error) throw error;
          
          setIsFormOpen(false);
          fetchSignals();
          toast.success('Vytvorené!');
        } else {
          // UPDATE
          const { error } = await supabase.from('daily_signals')
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

  async function handleGenerateAudio(field: 'spoken_audio_url' | 'meditation_audio_url') {
      if (!editingSignal?.id) {
          toast.error('Najprv vytvorte a uložte signál do databázy.');
          return;
      }
      
      // Let's actually check if the text exists locally and maybe warn them?
      // but the route fetches from DB anyway.
      setGeneratingAudioField(field);
      const toastId = toast.loading('Generujem AI Hlas (ElevenLabs)...');
      try {
          const res = await fetch('/api/admin/generate-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sourceId: editingSignal.id, type: 'personal', field })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Generovanie zlyhalo');
          
          setEditingSignal(prev => prev ? { ...prev, [field]: data.publicUrl } : null);
          toast.success('Audio vytvorené a uložené!', { id: toastId });
          // refresh visual state
          fetchSignals();
      } catch (e: any) {
          toast.error(e.message, { id: toastId });
      } finally {
          setGeneratingAudioField(null);
      }
  }

  async function handlePlayAudio(fileName: string | null | undefined) {
      if (!fileName) {
          toast.error('Žiadny súbor na prehratie.');
          return;
      }
      
      const toastId = toast.loading('Pripravujem prehrávač...');
      try {
          const res = await fetch(`/api/admin/get-audio-url?fileKey=${encodeURIComponent(fileName)}`);
          if (!res.ok) throw new Error('Chyba pri získavaní URL');
          
          const data = await res.json();
          toast.success('Spúšťam', { id: toastId });
          
          // Open in a new tab to play natively
          window.open(data.signedUrl, '_blank');
      } catch (err: any) {
          console.error(err);
          toast.error(err.message || 'Chyba prehrávania', { id: toastId });
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
      // 1. Get presigned URL
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
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

  if (loading && signals.length === 0) return <div className="p-10 text-slate-400">Načítavam admin panel...</div>;

  return (
    <div className="py-6 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-white mb-2">Editor obsahu</h2>
          <p className="text-slate-400">Správa denných signálov a obsahu (Mindbanger Daily)</p>
        </div>
        <button
          onClick={handleNew}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-3 rounded-xl font-bold flex items-center transition-colors"
        >
          <Plus size={20} className="mr-2" /> Pridať Signál
        </button>
      </div>

      {!isFormOpen ? (
        <>
        {/* Master Generator UI */}
        <div className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-6 mb-8 flex flex-col md:flex-row gap-4 items-end shadow-xl shadow-indigo-500/10 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="flex-1 w-full relative z-10">
                <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={14} className="text-indigo-500" /> Dátum (Master Origin)
                </label>
                <input 
                    type="date" 
                    value={generateDate} 
                    onChange={e => setGenerateDate(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                />
            </div>
            
            <div className="flex-[2] w-full relative z-10">
                 <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-500" /> Téma (Hint pre AI - Voliteľné)
                </label>
                <input 
                    type="text" 
                    value={generateTheme} 
                    onChange={e => setGenerateTheme(e.target.value)} 
                    placeholder="Napr. Odpustenie, Stratégia, Nové začiatky..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600 shadow-inner"
                />
            </div>
            
            <button 
                onClick={handleMasterGenerate}
                disabled={isMasterGenerating}
                className="relative z-10 w-full md:w-auto bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-wait whitespace-nowrap bg-[length:200%_auto] hover:bg-right duration-500"
            >
                {isMasterGenerating ? (
                    <> <span className="animate-spin mr-2">⏳</span> Generujem (3x LANG)... </>
                ) : (
                    <> <Sparkles size={18} className="animate-pulse" /> GENERATE ALL (En/Sk/Cs) </>
                )}
            </button>
        </div>

        <div className="grid gap-4">
            {signals.map(s => (
                <div key={s.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${s.status === 'published' ? 'bg-green-500' : s.status === 'generated' ? 'bg-blue-500' : 'bg-slate-500'}`} />
                        <div>
                            <div className="font-bold text-white flex items-center gap-2">
                                <span className="text-amber-500 font-mono">{s.date}</span>
                                <span>{s.theme}</span>
                                <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-400 uppercase">{s.language}</span>
                            </div>
                            <div className="text-sm text-slate-400 truncate max-w-md">{s.script || s.focus || 'Bez textu...'}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         {s.language === 'sk' && (
                            <button
                                onClick={() => handleTranslateToOtherLanguages(s)}
                                title="Preniesť do ostatných jazykov"
                                className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
                            >
                                <Languages size={18} />
                            </button>
                         )}
                         {/* MOVED GENERATE BUTTON HERE */}
                         <button 
                            onClick={() => handleQuickGenerate(s)}
                            disabled={!!generatingId}
                            title="Vygenerovať s AI"
                            className="p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white rounded-lg transition-colors"
                         >
                            <Sparkles size={18} className={generatingId === s.id ? "animate-spin" : ""} />
                         </button>
                         <button onClick={() => handleEdit(s)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"><Edit2 size={18} /></button>
                         <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-red-900/20 rounded-lg text-slate-600 hover:text-red-400"><Trash2 size={18} /></button>
                    </div>
                </div>
            ))}
        </div>
        </>
      ) : editingSignal && (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 md:p-8 mb-10 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl text-white font-bold">
                {editingSignal.id ? 'Upraviť signál' : 'Nový signál'}
            </h2>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">Zavrieť</button>
          </div>
          
          <form onSubmit={saveSignal} className="space-y-6">
            {/* Metadata Row */}
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Jazyk</label>
                <select value={editingSignal.language} onChange={e => setEditingSignal({...editingSignal, language: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500" required>
                  <option value="sk">Slovenčina (sk)</option>
                  <option value="en">English (en)</option>
                  <option value="cs">Čeština (cs)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Dátum</label>
                <input type="date" value={editingSignal.date} onChange={e => setEditingSignal({...editingSignal, date: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500" required />
              </div>
              <div>
                 <label className="block text-sm text-slate-400 mb-2">Status</label>
                 <select value={editingSignal.status} onChange={e => setEditingSignal({...editingSignal, status: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500">
                    <option value="draft">Draft (Koncept)</option>
                    <option value="generated">Generated (Vygenerované)</option>
                    <option value="published">Published (Zverejnené)</option>
                 </select>
              </div>
            </div>

            {/* Content Row */}
            <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm text-slate-400">Téma (Theme)</label>
                        <button 
                          type="button" 
                          onClick={handleGenerateAI} 
                          disabled={isGenerating || !editingSignal.date} 
                          className="bg-purple-900/50 hover:bg-purple-800 text-purple-300 text-xs px-3 py-1 rounded-full flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/30"
                        >
                           {isGenerating ? 'Generujem...' : <><Sparkles size={14} className="mr-1" /> Generovať obsah</>}
                        </button>
                    </div>
                    <input type="text" value={editingSignal.theme} onChange={e => setEditingSignal({...editingSignal, theme: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500" required placeholder="Napr. OCHRANA / STRATÉGIA" />
                    <p className="text-xs text-slate-500 mt-1">Zadajte tému ako hint pre AI, alebo nechajte prázdne pre auto-výber.</p>
                 </div>
                 <div>
                    <label className="block text-sm text-slate-400 mb-2">Fokus dňa (Short Focus)</label>
                    <input type="text" value={editingSignal.focus || ''} onChange={e => setEditingSignal({...editingSignal, focus: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500" placeholder="Krátka veta pre UI..." />
                 </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Hlavný Skript (Script)</label>
              <p className="text-xs text-slate-500 mb-2">Toto je text, ktorý bude čítať AI (TTS) a zobrazí sa v detaile.</p>
              <textarea 
                value={editingSignal.script || ''} 
                onChange={e => setEditingSignal({...editingSignal, script: e.target.value})} 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-white focus:outline-none focus:border-amber-500 min-h-[200px]" 
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
                  <div className="flex justify-between items-center mb-2">
                     <label className="text-xs text-amber-500 font-bold uppercase tracking-wider flex items-center gap-2">
                        <FileAudio size={14}/> Text Dňa (Hovorené)
                     </label>
                     <div className="flex items-center gap-2">
                        {editingSignal.spoken_audio_url && (
                           <button type="button" onClick={() => handlePlayAudio(editingSignal.spoken_audio_url)} className="bg-amber-900/50 hover:bg-amber-800 text-amber-300 px-2 py-1 rounded text-[10px] flex items-center gap-1 transition">
                              <Play size={12}/> Prehrať
                           </button>
                        )}
                        <button type="button" onClick={() => handleGenerateAudio('spoken_audio_url')} disabled={generatingAudioField === 'spoken_audio_url'} className="bg-amber-900/50 disabled:opacity-50 hover:bg-amber-800 text-amber-300 px-2 py-1 rounded text-[10px] flex items-center gap-1 transition">
                           {generatingAudioField === 'spoken_audio_url' ? <span className="animate-pulse flex items-center gap-1"><Sparkles size={12}/> Generujem...</span> : <><Sparkles size={12}/> AI Hlas</>}
                        </button>
                     </div>
                  </div>
                  <input type="text" value={editingSignal.spoken_audio_url || ''} onChange={e => setEditingSignal({...editingSignal, spoken_audio_url: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs mb-2" placeholder="URL k .mp3" />
                  <input type="file" accept=".mp3" onChange={e => handleFileUpload(e, 'spoken_audio_url')} disabled={isUploading} className="text-xs text-slate-500 w-full" />
               </div>

               {/* 2. Guided Meditation */}
               <div>
                  <div className="flex justify-between items-center mb-2">
                     <label className="text-xs text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-2">
                        <FileAudio size={14}/> Meditácia (Sprievodca)
                     </label>
                     <div className="flex items-center gap-2">
                        {editingSignal.meditation_audio_url && (
                           <button type="button" onClick={() => handlePlayAudio(editingSignal.meditation_audio_url)} className="bg-indigo-900/50 hover:bg-indigo-800 text-indigo-300 px-2 py-1 rounded text-[10px] flex items-center gap-1 transition">
                              <Play size={12}/> Prehrať
                           </button>
                        )}
                        <button type="button" onClick={() => handleGenerateAudio('meditation_audio_url')} disabled={generatingAudioField === 'meditation_audio_url'} className="bg-indigo-900/50 disabled:opacity-50 hover:bg-indigo-800 text-indigo-300 px-2 py-1 rounded text-[10px] flex items-center gap-1 transition">
                           {generatingAudioField === 'meditation_audio_url' ? <span className="animate-pulse flex items-center gap-1"><Sparkles size={12}/> Generujem...</span> : <><Sparkles size={12}/> AI Hlas</>}
                        </button>
                     </div>
                  </div>
                  <input type="text" value={editingSignal.meditation_audio_url || ''} onChange={e => setEditingSignal({...editingSignal, meditation_audio_url: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs mb-2" placeholder="URL k .mp3" />
                  <input type="file" accept=".mp3" onChange={e => handleFileUpload(e, 'meditation_audio_url')} disabled={isUploading} className="text-xs text-slate-500 w-full" />
               </div>

               {/* 3. Background Music */}
               <div>
                  <div className="flex justify-between items-center mb-2">
                     <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                        <FileAudio size={14}/> Hudba (Pozadie/Ambient)
                     </label>
                     <div className="flex items-center gap-2">
                        {editingSignal.audio_url && (
                           <button type="button" onClick={() => handlePlayAudio(editingSignal.audio_url)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-[10px] flex items-center gap-1 transition">
                              <Play size={12}/> Prehrať
                           </button>
                        )}
                     </div>
                  </div>
                  <input type="text" value={editingSignal.audio_url || ''} onChange={e => setEditingSignal({...editingSignal, audio_url: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs mb-2" placeholder="URL k .mp3" />
                  <input type="file" accept=".mp3" onChange={e => handleFileUpload(e, 'audio_url')} disabled={isUploading} className="text-xs text-slate-500 w-full" />
               </div>
            </div>

            {/* Master System Payload */}
            {editingSignal.generation_metadata && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-900 border border-indigo-500/30 rounded-xl p-5 shadow-lg shadow-indigo-500/5">
                    <h3 className="text-indigo-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Sparkles size={16} /> Master System Content
                    </h3>
                    <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                                <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Microstep</span>
                                <input 
                                    type="text"
                                    value={editingSignal.generation_metadata.microstep || ''}
                                    onChange={e => setEditingSignal({
                                        ...editingSignal, 
                                        generation_metadata: { ...editingSignal.generation_metadata, microstep: e.target.value } 
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                                <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Journal Question</span>
                                <input 
                                    type="text"
                                    value={editingSignal.generation_metadata.journal || ''}
                                    onChange={e => setEditingSignal({
                                        ...editingSignal, 
                                        generation_metadata: { ...editingSignal.generation_metadata, journal: e.target.value } 
                                    })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white italic focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-slate-500 uppercase font-bold block">Meditation Script (For Audio Generator)</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(editingSignal.generation_metadata.meditation);
                                        toast.success('Skopírované do schránky');
                                    }}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                >
                                    Copy
                                </button>
                            </div>
                            <textarea
                                value={editingSignal.generation_metadata.meditation || ''}
                                onChange={e => setEditingSignal({
                                    ...editingSignal, 
                                    generation_metadata: { ...editingSignal.generation_metadata, meditation: e.target.value } 
                                })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-slate-300 font-sans whitespace-pre-wrap focus:outline-none focus:border-indigo-500 min-h-[150px]"
                            />
                        </div>

                        <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                            <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Keywords</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {editingSignal.generation_metadata.keywords?.split(',').map((k: string, i: number) => (
                                    <span key={i} className="bg-indigo-900/30 text-indigo-300 text-xs px-2 py-1 rounded border border-indigo-500/20">{k.trim()}</span>
                                )) || '-'}
                            </div>
                        </div>

                        <details className="group">
                            <summary className="cursor-pointer text-xs text-slate-600 hover:text-slate-400 transition-colors list-none flex items-center gap-2">
                                <span className="group-open:rotate-90 transition-transform">▸</span> Raw JSON Payload
                            </summary>
                            <pre className="mt-2 bg-slate-950 p-3 rounded-lg overflow-x-auto text-[10px] text-green-500/80 font-mono border border-slate-800">
                                {JSON.stringify(editingSignal.generation_metadata, null, 2)}
                            </pre>
                        </details>
                    </div>
                </div>
            )}

            <div className="flex justify-end space-x-4 pt-4 border-t border-slate-800">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2 rounded-lg text-slate-400 hover:text-white transition-colors">
                Zrušiť
              </button>
              <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-2 rounded-lg font-bold transition-colors">
                Uložiť Signál
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
