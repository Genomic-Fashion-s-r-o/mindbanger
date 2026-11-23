"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, Plus, Users, Search, Play, FileAudio, Check, X, Loader2, Save, Trash, Edit, Edit2, Languages, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

type Organization = {
  id: string;
  name: string;
  industry: string | null;
  seats_limit: number;
  subscription_status: string;
  created_at: string;
};

type CorporateSignal = {
  id: string;
  organization_id: string | null;
  industry: string | null;
  date: string;
  language: string;
  theme: string;
  signal_text: string;
  focus_text: string;
  affirmation: string;
  audio_url: string;
  spoken_audio_url: string;
  meditation_audio_url: string;
  is_published: boolean;
  created_at: string;
  organizations?: { name: string } | null;
  user_progress_corporate?: { count: number }[];
};

type SignalDraft = {
  organization_id: string | null;
  industry: string | null;
  date: string;
  language: string;
  theme: string;
  signal_text: string;
  focus_text: string;
  affirmation: string;
  audio_url: string;
  spoken_audio_url: string;
  meditation_audio_url: string;
  is_published: boolean;
};

export default function B2BManager() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [signals, setSignals] = useState<CorporateSignal[]>([]);
  const [loading, setLoading] = useState(true);  const [isUploading, setIsUploading] = useState(false);  const [activeView, setActiveView] = useState<'list' | 'signals-list' | 'create-signal'>('list');
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'registered' | 'inactive'>('all');
  
  // Signal Form State
  const [draft, setDraft] = useState<SignalDraft>({
    organization_id: null, // Specific Org or NULL for Industry/General
    industry: null,
    date: new Date().toISOString().split('T')[0],
    language: 'sk',
    theme: '',
    signal_text: '',
    focus_text: '',
    affirmation: '',
    audio_url: '',
    spoken_audio_url: '',
    meditation_audio_url: '',
    is_published: false
  });

  useEffect(() => {
    fetchOrgs();
    fetchSignals();
  }, []);

  const fetchOrgs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
       toast.error('Failed to load organizations');
       console.error(error);
    } else {
       setOrganizations(data || []);
    }
    setLoading(false);
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    const { error } = await supabase
      .from('organizations')
      .update({
          seats_limit: editingOrg.seats_limit,
          subscription_status: editingOrg.subscription_status,
          industry: editingOrg.industry
      })
      .eq('id', editingOrg.id);

    if (error) {
        toast.error('Failed to update organization');
    } else {
        toast.success('Organization updated');
        setEditingOrg(null);
        fetchOrgs();
    }
  };

  const handleActivate = async (org: Organization) => {
      if (!confirm(`Are you sure you want to activate ${org.name}? This will grant key access.`)) return;

      const { error } = await supabase
        .from('organizations')
        .update({ subscription_status: 'active' })
        .eq('id', org.id);

      if (error) {
          toast.error('Failed to activate');
      } else {
          toast.success('Organization Activated');
          fetchOrgs();
      }
  };
  
  const fetchSignals = async () => {
    const { data, error } = await supabase
      .from('corporate_signals')
      .select('*, organizations(name), user_progress_corporate(count)') 
      .order('date', { ascending: false });
    
    if (error) {
       console.error('Error fetching signals:', error);
       toast.error('Failed to load signals');
    } else {
       // Type assertion or adjust type to match
       // The 'count' will be returned inside nested array
       setSignals(data as any as CorporateSignal[] || []);
    }
  };

  const handleTranslateToOtherLanguages = async (signal: CorporateSignal) => {
      if (!confirm(`Naozaj chcete preložiť tento slovenský B2B mindset (Dátum: ${signal.date}) do ďalších jazykov (CS, EN)?`)) return;
      const toastId = toast.loading(`Prekladám ${signal.date} do iných jazykov...`);
      try {
          const res = await fetch('/api/admin/translate-mindset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sourceId: signal.id, type: 'b2b', targetLanguages: ['cs', 'en'] })
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
  };

  const deleteSignal = async (id: string) => {
      if(!confirm('Are you sure you want to delete this signal?')) return;
      
      const { error } = await supabase
        .from('corporate_signals')
        .delete()
        .eq('id', id);
        
      if(error) {
          toast.error('Failed to delete');
      } else {
          toast.success('Signal deleted');
          fetchSignals();
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'audio_url' | 'spoken_audio_url' | 'meditation_audio_url' = 'audio_url') => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.mp3')) {
        toast.error('Prosím, nahrajte iba .mp3 súbory.');
        return;
      }

      setIsUploading(true);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });

        if (!res.ok) throw new Error('Chyba pri získavaní linku');

        const { uploadUrl, publicUrl } = await res.json();

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!uploadRes.ok) throw new Error('Chyba pri nahrávaní súboru');

        setDraft({...draft, [field]: publicUrl});
        toast.success(`Súbor nahraný!`);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsUploading(false);
      }
  };

  const handleCreateSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading('Creating Signal...');

    try {
       // Validate
       if (!draft.theme || !draft.signal_text || !draft.date) {
           throw new Error('Theme, Text and Date are required');
       }

       // Prepare Payload
       const payload = {
           ...draft,
           // Ensure empty strings are null for nullable fields if needed, or keep as string
           // Only one targeting method should be active ideally
           organization_id: draft.organization_id === '' ? null : draft.organization_id,
           industry: draft.industry === '' ? null : draft.industry
       };

       const { error } = await supabase.from('corporate_signals').insert(payload);

       if (error) throw error;

       toast.success('Signal Created!', { id: toastId });
       setActiveView('signals-list'); 
       fetchSignals();
       // Reset form?
    } catch (err: any) {
        console.error(err);
        toast.error(err.message, { id: toastId });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
        
        {/* Header / Tabs */}
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Building2 className="text-blue-500" /> B2B Management
            </h2>
            <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveView('list')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'list' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    Organizations
                </button>
                <button 
                  onClick={() => { setActiveView('signals-list'); fetchSignals(); }}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'signals-list' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    Signals List
                </button>
                <button 
                  onClick={() => setActiveView('create-signal')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'create-signal' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    Create Signal
                </button>
            </div>
        </div>

        {/* VIEW: List Organizations */}
        {activeView === 'list' && (
            <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-white/5">
                        {(['all', 'active', 'registered', 'inactive'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 py-1.5 text-xs font-medium rounded capitalize transition-colors ${filterStatus === status ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-200 font-medium">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Industry</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Seats</th>
                                <th className="px-6 py-4">Created</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center">Loading...</td></tr>
                            ) : organizations.filter(org => {
                                const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase());
                                const matchesFilter = filterStatus === 'all' || org.subscription_status === filterStatus;
                                return matchesSearch && matchesFilter;
                            }).length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center">No organizations found.</td></tr>
                            ) : (
                                organizations.filter(org => {
                                    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase());
                                    const matchesFilter = filterStatus === 'all' || org.subscription_status === filterStatus;
                                    return matchesSearch && matchesFilter;
                                }).map(org => (
                                    <tr key={org.id} className="hover:bg-white/[0.02]">
                                        <td className="px-6 py-4 font-medium text-white">{org.name}</td>
                                        <td className="px-6 py-4">{org.industry || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${org.subscription_status === 'active' ? 'bg-green-500/10 border-green-500/20 text-green-400' : (org.subscription_status === 'registered' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-slate-800 border-white/10 text-slate-500')}`}>
                                                {org.subscription_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{org.seats_limit}</td>
                                        <td className="px-6 py-4">{new Date(org.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            {org.subscription_status === 'registered' && (
                                                <button
                                                    onClick={() => handleActivate(org)}
                                                    className="px-2 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded text-xs transition-colors border border-green-600/30"
                                                    title="Quick Activate"
                                                >
                                                    Activate
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => setEditingOrg(org)}
                                                className="p-2 hover:bg-blue-500/10 text-slate-500 hover:text-blue-500 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* VIEW: Signals List */}
        {activeView === 'signals-list' && (
             <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950 text-slate-200 font-medium">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Theme</th>
                            <th className="px-6 py-4">Target</th>
                            <th className="px-6 py-4">Lang</th>
                            <th className="px-6 py-4">Published</th>
                            <th className="px-6 py-4">Completions</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {signals.length === 0 ? (
                             <tr><td colSpan={7} className="px-6 py-8 text-center">No signals found.</td></tr>
                        ) : (
                            signals.map(signal => (
                                <tr key={signal.id} className="hover:bg-white/[0.02]">
                                    <td className="px-6 py-4 font-medium text-white">{new Date(signal.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{signal.theme}</td>
                                    <td className="px-6 py-4">
                                        {signal.organizations?.name ? (
                                            <span className="text-blue-400 flex items-center gap-1"><Building2 size={12}/> {signal.organizations.name}</span>
                                        ) : signal.industry ? (
                                             <span className="text-purple-400 capitalize">{signal.industry}</span>
                                        ) : (
                                            <span className="text-slate-500">General</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 uppercase text-xs">{signal.language}</td>
                                    <td className="px-6 py-4">
                                        {signal.is_published ? (
                                            <span className="text-green-400 flex items-center gap-1"><Check size={12}/> Yes</span>
                                        ) : (
                                            <span className="text-yellow-500 text-xs">Draft</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm">
                                        {signal.user_progress_corporate?.[0]?.count || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {signal.language === 'sk' && (
                                            <button
                                                onClick={() => handleTranslateToOtherLanguages(signal)}
                                                className="p-2 hover:bg-blue-500/10 text-slate-500 hover:text-blue-500 rounded transition-colors mr-2"
                                                title="Preniesť do ostatných jazykov"
                                            >
                                                <Languages size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteSignal(signal.id)}
                                            className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded transition-colors"
                                            title="Delete"
                                        >
                                            <Trash size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
             </div>
        )}

        {/* VIEW: Create Signal */}
        {activeView === 'create-signal' && (
            <form onSubmit={handleCreateSignal} className="max-w-2xl mx-auto space-y-6 bg-slate-900 p-8 rounded-2xl border border-white/5">
                
                <h3 className="text-xl font-medium text-white mb-6">Create Corporate Signal</h3>
                
                {/* Targeting */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Target Organization</label>
                        <select 
                           value={draft.organization_id || ''}
                           onChange={e => setDraft({...draft, organization_id: e.target.value || null, industry: null})}
                           className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="">-- All / Specific Industry --</option>
                            {organizations.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Target Industry</label>
                        <select 
                           value={draft.industry || ''}
                           onChange={e => setDraft({...draft, industry: e.target.value || null, organization_id: null})}
                           disabled={!!draft.organization_id}
                           className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        >
                            <option value="">-- All Industries --</option>
                            <option value="finance">Finance</option>
                            <option value="tech">Tech</option>
                            <option value="retail">Retail</option>
                            {/* Add unique industries from orgs */}
                        </select>
                    </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                        <input 
                          type="date" 
                          value={draft.date}
                          onChange={e => setDraft({...draft, date: e.target.value})}
                          className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Language</label>
                        <select 
                          value={draft.language}
                          onChange={e => setDraft({...draft, language: e.target.value})}
                          className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="sk">Slovak</option>
                            <option value="en">English</option>
                            <option value="cs">Czech</option>
                        </select>
                     </div>
                     <div className="bg-slate-950 border border-white/10 rounded-lg px-4 py-2 flex items-center gap-3">
                         <label className="text-sm font-medium text-white flex-1">Published</label>
                         <input 
                           type="checkbox"
                           checked={draft.is_published}
                           onChange={e => setDraft({...draft, is_published: e.target.checked})}
                           className="w-5 h-5 accent-blue-500"
                         />
                     </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Theme</label>
                    <input 
                        type="text" 
                        value={draft.theme}
                        onChange={e => setDraft({...draft, theme: e.target.value})}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. Stress Management"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Signal Text (Main Content)</label>
                    <textarea 
                        value={draft.signal_text}
                        onChange={e => setDraft({...draft, signal_text: e.target.value})}
                        className="w-full h-32 bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                        placeholder="Detailed content..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Focus Text</label>
                        <input 
                            type="text" 
                            value={draft.focus_text}
                            onChange={e => setDraft({...draft, focus_text: e.target.value})}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            placeholder="Daily mantra"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Affirmation</label>
                        <input 
                            type="text" 
                            value={draft.affirmation}
                            onChange={e => setDraft({...draft, affirmation: e.target.value})}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Audio URLs */}
                <div className="space-y-4 pt-6 border-t border-white/5">
                    <h4 className="text-sm font-bold text-slate-400 uppercase">Audio Assets (R2 Paths)</h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/50 p-6 rounded-xl border border-slate-800">
                         {/* 1. Spoken Word (Daily Text) */}
                         <div>
                            <label className="block text-xs text-amber-500 mb-2 font-bold uppercase tracking-wider flex items-center gap-2">
                               <FileAudio size={14}/> Text Dňa (Hovorené)
                            </label>
                            <input 
                                type="text" 
                                value={draft.spoken_audio_url || ''} 
                                onChange={e => setDraft({...draft, spoken_audio_url: e.target.value})} 
                                className="w-full font-mono bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 text-xs mb-3 shadow-inner" 
                                placeholder="URL k .mp3" 
                            />
                            <div className="relative">
                                <input type="file" accept=".mp3" onChange={e => handleFileUpload(e, 'spoken_audio_url')} disabled={isUploading} className="text-xs text-slate-500 w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer disabled:opacity-50" />
                            </div>
                         </div>

                         {/* 2. Guided Meditation */}
                         <div>
                            <label className="block text-xs text-indigo-400 mb-2 font-bold uppercase tracking-wider flex items-center gap-2">
                               <FileAudio size={14}/> Meditácia (Sprievodca)
                            </label>
                            <input 
                                type="text" 
                                value={draft.meditation_audio_url || ''} 
                                onChange={e => setDraft({...draft, meditation_audio_url: e.target.value})} 
                                className="w-full font-mono bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 text-xs mb-3 shadow-inner" 
                                placeholder="URL k .mp3" 
                            />
                            <div className="relative">
                                <input type="file" accept=".mp3" onChange={e => handleFileUpload(e, 'meditation_audio_url')} disabled={isUploading} className="text-xs text-slate-500 w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-400 hover:file:bg-indigo-600/30 cursor-pointer disabled:opacity-50" />
                            </div>
                         </div>

                         {/* 3. Background Music */}
                         <div>
                            <label className="block text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider flex items-center gap-2">
                               <FileAudio size={14}/> Hudba (Pozadie/Ambient)
                            </label>
                            <input 
                                type="text" 
                                value={draft.audio_url || ''} 
                                onChange={e => setDraft({...draft, audio_url: e.target.value})} 
                                className="w-full font-mono bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 text-xs mb-3 shadow-inner" 
                                placeholder="URL k .mp3" 
                            />
                            <div className="relative">
                                <input type="file" accept=".mp3" onChange={e => handleFileUpload(e, 'audio_url')} disabled={isUploading} className="text-xs text-slate-500 w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-700/50 file:text-slate-400 hover:file:bg-slate-700 cursor-pointer disabled:opacity-50" />
                            </div>
                         </div>
                      </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex justify-end">
                    <button 
                       type="submit"
                       className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 flex items-center gap-2"
                    >
                        <Save size={18} />
                        Save Signal
                    </button>
                </div>

            </form>
        )}

        {/* Modal: Edit Org */}
        {editingOrg && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 max-w-md w-full relative">
                    <button 
                        onClick={() => setEditingOrg(null)}
                        className="absolute top-4 right-4 text-slate-500 hover:text-white"
                    >
                        <X size={20} />
                    </button>

                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Edit size={20} className="text-blue-500"/> Edit Organization
                    </h3>

                    <form onSubmit={handleUpdateOrg} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Seats Limit</label>
                            <input 
                                type="number" 
                                value={editingOrg.seats_limit}
                                onChange={e => setEditingOrg({...editingOrg, seats_limit: parseInt(e.target.value)})}
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Subscription Status</label>
                            <select 
                                value={editingOrg.subscription_status}
                                onChange={e => setEditingOrg({...editingOrg, subscription_status: e.target.value})}
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="trial">Trial</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Industry</label>
                            <input 
                                type="text" 
                                value={editingOrg.industry || ''}
                                onChange={e => setEditingOrg({...editingOrg, industry: e.target.value})}
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="pt-4 flex gap-2">
                            <button 
                                type="button"
                                onClick={() => setEditingOrg(null)}
                                className="flex-1 py-3 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors shadow-lg hover:shadow-blue-500/20"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}
