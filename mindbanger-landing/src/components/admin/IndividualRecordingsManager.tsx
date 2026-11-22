"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { Search, Upload, UserX, FileAudio, CheckCircle2, ChevronDown, ChevronUp, Bell } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

type Profile = {
    id: string;
    email: string;
    full_name: string | null;
}

type Recording = {
    id: string;
    title: string;
    audio_url: string;
    created_at: string;
    play_count?: number;
}

export default function IndividualRecordingsManager() {
    const [searchTerm, setSearchTerm] = useState("");
    const [searching, setSearching] = useState(false);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [userRecordings, setUserRecordings] = useState<Recording[]>([]);
    
    // Upload form
    const [title, setTitle] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    // Debounced search
    useEffect(() => {
        if (searchTerm.length < 3) {
            setProfiles([]);
            return;
        }

        const delayOut = setTimeout(() => {
            searchUsers();
        }, 500);

        return () => clearTimeout(delayOut);
    }, [searchTerm]);

    async function searchUsers() {
        setSearching(true);
        
        try {
            const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(searchTerm)}`);
            if (res.ok) {
                const results = await res.json();
                setProfiles(results || []);
            } else {
                toast.error("Chyba pri hľadaní užívateľov");
            }
        } catch (err) {
            console.error("Search error:", err);
            toast.error("Chyba pri hľadaní");
        } finally {
            setSearching(false);
        }
    }

    async function selectUser(user: Profile) {
        setSelectedUser(user);
        setTitle("");
        setExpandedUser(user.id);
        fetchUserRecordings(user.id);
    }

    async function fetchUserRecordings(userId: string) {
        const { data, error } = await supabase
            .from('individual_recordings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            
        if (!error && data) {
            setUserRecordings(data);
        }
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !selectedUser) return;
        
        if (!title.trim()) {
            toast.error('Najprv zadajte názov nahrávky!');
            e.target.value = ''; // reset
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading('Nahrávam MP3 a posielam notifikácie...');

        try {
            // 1. Dostať presigned URL z interného API pre priamy upload (alebo poslať celý súbor, ak je malý)
            // Použijeme existujúci form-data endpoint
            
                        const s3Req = await fetch('/api/upload', {                 method: 'POST',                 headers: { 'Content-Type': 'application/json' },                 body: JSON.stringify({ filename: file.name, contentType: file.type || 'audio/mpeg' })             });             const s3Data = await s3Req.json();             if (!s3Req.ok) throw new Error(s3Data.error || 'Nepodarilo sa vytvorit upload URL');             const { uploadUrl, publicUrl } = s3Data;              toast.loading('Nahravam subor do R2...', { id: toastId });             const uploadReq = await fetch(uploadUrl, {                 method: 'PUT',                 headers: { 'Content-Type': file.type || 'audio/mpeg' },                 body: file             });             if (!uploadReq.ok) throw new Error('Zlyhal upload na R2');              toast.loading('Pripravujem notifikacie...', { id: toastId });             const res = await fetch('/api/admin/upload-individual', {                 method: 'POST',                 headers: { 'Content-Type': 'application/json' },                 body: JSON.stringify({                     publicUrl,                     title,                     userId: selectedUser.id,                     userEmail: selectedUser.email,                     userName: selectedUser.full_name || 'Odberatel'                 })             });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Nastala chyba pri uploade');

            toast.success('Audio nahraté! Užívateľ bol upozornený.', { id: toastId });
            setTitle("");
            fetchUserRecordings(selectedUser.id); // refresh list
            
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Nepodarilo sa nahrať súbor', { id: toastId });
        } finally {
            setIsUploading(false);
            e.target.value = ''; // reset input
        }
    }
    
    async function handleDelete(id: string) {
        if (!confirm('Naozaj vymazať túto nahrávku?')) return;
        
        const toastId = toast.loading('Vymazávam...');
        try {
            const { error } = await supabase.from('individual_recordings').delete().eq('id', id);
            if (error) throw error;
            
            toast.success('Vymazané', { id: toastId });
            if (selectedUser) fetchUserRecordings(selectedUser.id);
        } catch(e: any) {
            toast.error('Chyba: ' + e.message, { id: toastId });
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                        Individuálne Nahrávky (Moje Audio)
                    </h2>
                    <p className="text-slate-400 text-sm">Priraďte špecifické MP3 súbory pre konkrétneho odberateľa.</p>
                </div>
            </div>

            {/* Vyhľadávač */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 shadow-xl">
                <div className="relative max-w-md w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-950 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Hľadať podľa emailu alebo mena..."
                    />
                    {searching && <div className="absolute right-3 top-2.5 text-xs text-slate-500">Hľadám...</div>}
                </div>

                {/* Výsledky hľadania */}
                {profiles.length > 0 && !selectedUser && (
                    <div className="mt-4 grid gap-2">
                        {profiles.map(p => (
                            <button
                                key={p.id}
                                onClick={() => selectUser(p)}
                                className="flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 p-3 rounded-lg border border-slate-700/50 transition-colors text-left"
                            >
                                <div>
                                    <div className="text-white font-medium">{p.full_name || 'Bez mena'}</div>
                                    <div className="text-slate-400 text-xs">{p.email}</div>
                                </div>
                                <div className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full">
                                    Vybrať pre nahrávku
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                
                {searchTerm.length >= 3 && profiles.length === 0 && !searching && !selectedUser && (
                    <div className="mt-4 text-center py-6 text-slate-500 bg-slate-950/50 rounded-lg border border-dashed border-slate-800">
                        <UserX className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <div>Žiadny užívateľ sa nenašiel pre &quot;{searchTerm}&quot;</div>
                    </div>
                )}
            </div>

            {/* Vybraný užívateľ a Formulár */}
            {selectedUser && (
                <div className="bg-gradient-to-b from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-xl p-4 md:p-6 shadow-2xl">
                    <div className="flex justify-between items-start mb-6 border-b border-indigo-500/20 pb-4">
                        <div>
                            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded mb-2 inline-block">Aktívny Užívateľ</span>
                            <h3 className="text-xl font-bold text-white">{selectedUser.full_name || selectedUser.email}</h3>
                            <p className="text-slate-400 text-sm">{selectedUser.email}</p>
                        </div>
                        <button 
                            onClick={() => { setSelectedUser(null); setSearchTerm(""); setProfiles([]); }}
                            className="text-xs text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded transition"
                        >
                            Zavrieť
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Nová Nahrávka - Form */}
                        <div className="space-y-4">
                            <h4 className="text-indigo-300 font-medium mb-3 flex items-center"><Upload className="w-4 h-4 mr-2"/> Pridať Novú Nahrávku</h4>
                            
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Názov nahrávky pre klienta</label>
                                <input 
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Napr: 1-on-1 Konzultácia - Záznam" 
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Vybrať .MP3 súbor z PC</label>
                                <div className="border border-dashed border-slate-600 bg-slate-950 p-4 rounded text-center relative hover:bg-slate-900 transition">
                                    <input 
                                        type="file" 
                                        accept="audio/mpeg, audio/mp3" 
                                        onChange={handleFileUpload}
                                        disabled={isUploading || !title.trim()}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    {isUploading ? (
                                        <div className="text-amber-400 font-medium text-sm animate-pulse">
                                            Nahrávam a odosielam...
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 text-sm">
                                            {title.trim() ? "Kliknite sem pre výber a okamžitý upload" : "Najprv zadajte názov vyššie"}
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 flex items-center">
                                    <Bell className="w-3 h-3 mr-1"/> Po uploade odošle email a PUSH notifikáciu užívateľovi.
                                </p>
                            </div>
                        </div>

                        {/* List existujúcich nahrávok užívateľa */}
                        <div>
                            <h4 className="text-indigo-300 font-medium mb-3 flex items-center"><FileAudio className="w-4 h-4 mr-2"/> Existujúce ({userRecordings.length})</h4>
                            
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {userRecordings.length === 0 ? (
                                    <div className="text-center py-6 text-slate-500 bg-slate-950/30 rounded border border-slate-800">
                                        Tento užívateľ nemá zatiaľ žiadne osobné nahrávky.
                                    </div>
                                ) : (
                                    userRecordings.map(rec => (
                                        <div key={rec.id} className="bg-slate-800/80 p-3 rounded border border-slate-700 flex justify-between items-center group">
                                            <div>
                                                <div className="font-semibold text-white text-sm">{rec.title}</div>
                                                <div className="text-[10px] text-slate-400">
                                                    {format(new Date(rec.created_at), "d. MMMM yyyy HH:mm", { locale: sk })}
                                                    <span className="text-indigo-400 font-medium ml-2">&#8226; Prehraté: {rec.play_count || 0}x</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDelete(rec.id)}
                                                className="text-red-400/50 hover:text-red-400 text-xs px-2 py-1 bg-red-900/20 hover:bg-red-900/50 rounded transition opacity-0 group-hover:opacity-100"
                                            >
                                                Vymazať
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}