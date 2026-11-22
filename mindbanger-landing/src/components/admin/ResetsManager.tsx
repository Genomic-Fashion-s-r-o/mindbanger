"use client";
import toast from 'react-hot-toast';
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Edit2, Trash2, Radio, CheckCircle2, Circle, Calendar } from "lucide-react";

type QuickReset = {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  is_published: boolean;
  created_at?: string;
};

export default function ResetsManager() {
  const [resets, setResets] = useState<QuickReset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReset, setEditingReset] = useState<QuickReset | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchResets();
  }, []);

  async function fetchResets() {
    setLoading(true);
    const { data, error } = await supabase
      .from('quick_resets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setResets(data);
    }
    setLoading(false);
  }

  function handleEdit(reset: QuickReset) {
    setEditingReset(reset);
    setIsFormOpen(true);
  }

  function handleNew() {
    setEditingReset({
      id: '',
      title: '',
      description: '',
      audio_url: '',
      is_published: false
    });
    setIsFormOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Naozaj vymazať?')) return;
    const { error } = await supabase.from('quick_resets').delete().eq('id', id);
    if (!error) fetchResets();
  }

  async function saveReset(e: React.FormEvent) {
    e.preventDefault();
    if (!editingReset) return;

    const payload = { ...editingReset };
    if (!payload.id) {
      delete (payload as any).id;
      delete (payload as any).created_at;
    }

    if (editingReset.id) {
      // Update
      const { error } = await supabase.from('quick_resets').update(payload).eq('id', editingReset.id);
      if (!error) {
        setIsFormOpen(false);
        fetchResets();
      } else {
        toast.error(error.message);
      }
    } else {
      // Insert
      const { error } = await supabase.from('quick_resets').insert([payload]);
      if (!error) {
        setIsFormOpen(false);
        fetchResets();
      } else {
        toast.error(error.message);
      }
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingReset) return;

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      toast.error('Prosím, nahrajte iba .mp3 súbory.');
      return;
    }

    setIsUploading(true);

    try {
      // 1. Get presigned URL
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!res.ok) {
        throw new Error('Nepodarilo sa získať link pre nahratie súboru');
      }

      const { uploadUrl, publicUrl } = await res.json();

      // 2. Upload file to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Nepodarilo sa nahrať súbor na server');
      }

      // 3. Update state with public URL
      setEditingReset({ ...editingReset, audio_url: publicUrl });
      toast.success('Súbor bol úspešne nahratý!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Nastala chyba pri nahrávaní súboru.');
    } finally {
      setIsUploading(false);
    }
  }

  if (loading && resets.length === 0) return <div className="p-10 text-slate-400">Načítavam admin panel...</div>;

  return (
    <div className="py-6 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-serif text-white mb-2">Editor Resetov</h2>
          <p className="text-slate-400">Správa rýchlych zvukových resetov</p>
        </div>
        <button
          onClick={handleNew}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-3 rounded-xl font-bold flex items-center transition-colors"
        >
          <Plus size={20} className="mr-2" /> Pridať Reset
        </button>
      </div>

      {isFormOpen && editingReset && (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 md:p-8 mb-10 relative">
          <h2 className="text-xl text-white font-bold mb-6">
            {editingReset.id ? 'Upraviť reset' : 'Nový reset'}
          </h2>
          <form onSubmit={saveReset} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Názov (Title)</label>
                <input type="text" value={editingReset.title} onChange={e => setEditingReset({...editingReset, title: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500" required placeholder="Napr. Sústredenie" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Popis (Description)</label>
              <textarea 
                value={editingReset.description || ''} 
                onChange={e => setEditingReset({...editingReset, description: e.target.value})} 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500" 
                rows={3} 
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Audio Súbor (.mp3)</label>
                <div className="flex flex-col space-y-2">
                  <input 
                    type="file" 
                    accept=".mp3" 
                    onChange={handleFileUpload} 
                    disabled={isUploading}
                    className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-500/10 file:text-amber-500 hover:file:bg-amber-500/20"
                  />
                  {isUploading && <span className="text-amber-500 text-sm">Nahrávam...</span>}
                  <input type="text" value={editingReset.audio_url || ''} onChange={e => setEditingReset({...editingReset, audio_url: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500 text-sm mt-2" placeholder="URL súboru (vyplní sa po nahraní)" required />
                </div>
              </div>
              <div className="flex items-end pb-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={editingReset.is_published} onChange={e => setEditingReset({...editingReset, is_published: e.target.checked})} className="w-5 h-5 accent-amber-500 rounded bg-slate-900 border-slate-700" />
                  <span className="text-white font-medium">Publikovať viditeľné pre používateľov</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t border-slate-800">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2 rounded-lg text-slate-400 hover:text-white transition-colors">
                Zrušiť
              </button>
              <button type="submit" className="px-8 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors">
                Uložiť Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-4 font-medium">Stav</th>
                <th className="p-4 font-medium">Názov</th>
                <th className="p-4 font-medium">Audio</th>
                <th className="p-4 font-medium">Vytvorené</th>
                <th className="p-4 font-medium text-right">Akcie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {resets.map((reset) => (
                <tr key={reset.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    {reset.is_published 
                      ? <CheckCircle2 size={18} className="text-emerald-500" /> 
                      : <Circle size={18} className="text-slate-600" />}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-white mb-0.5">{reset.title}</div>
                    <div className="text-xs text-slate-500 line-clamp-1">{reset.description}</div>
                  </td>
                  <td className="p-4">
                    {reset.audio_url ? <Radio size={16} className="text-amber-500" /> : <span className="text-slate-600">-</span>}
                  </td>
                  <td className="p-4 text-slate-500">
                    {reset.created_at ? new Date(reset.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => handleEdit(reset)} className="p-2 text-slate-400 hover:text-amber-500 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(reset.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {resets.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Zatiaľ žiadne resety
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
