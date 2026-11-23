'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface RequireNameProps {
  userId: string;
  initialName: string | null;
  lang: string;
}

export default function RequireName({ userId, initialName, lang }: RequireNameProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If name is completely missing or empty, ask for it.
    if (!initialName || initialName.trim() === '') {
      setIsOpen(true);
    }
  }, [initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name.trim() })
        .eq('id', userId);

      if (error) throw error;
      
      // Attempt to update auth metadata too.
      await supabase.auth.updateUser({
        data: { full_name: name.trim() }
      });

      toast.success(lang === 'sk' ? 'Meno bolo uložene!' : lang === 'cs' ? 'Jméno bylo uloženo!' : 'Name saved!');
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(lang === 'sk' ? 'Nepodarilo sa uložne.' : 'Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
        <div className="flex justify-center mb-6">
          <div className="bg-amber-500/10 p-4 rounded-full ring-1 ring-amber-500/20 text-amber-500">
            <User size={32} />
          </div>
        </div>
        
        <h2 className="text-2xl font-serif text-white text-center mb-2">
          {lang === 'sk' ? 'Ako ťa smieme oslovovať?' : lang === 'cs' ? 'Jak tě smíme oslovovat?' : 'How should we call you?'}
        </h2>
        <p className="text-slate-400 text-center text-sm mb-6">
          {lang === 'sk' 
            ? 'Aby sme náš zážitok spravili osobnejším, prezraď nám tvoje (krstné) meno.' 
            : lang === 'cs' 
              ? 'Abychom náš zážitek udělali osobnějším, prozraď nám tvé (křestní) jméno.' 
              : 'To make the experience more personal, please enter your (first) name.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="sr-only">Meno</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'sk' ? 'Tvoje meno (napr. Adam)' : lang === 'cs' ? 'Tvé jméno (např. Adam)' : 'Your name (e.g. Adam)'}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
              autoFocus
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || !name.trim()}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-4 rounded-xl transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (lang === 'sk' ? 'Pokračovať' : lang === 'cs' ? 'Pokračovat' : 'Continue')}
          </button>
        </form>
      </div>
    </div>
  );
}