"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Send, User, Reply, Check, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

type Message = {
    id: string;
    organization_id: string;
    sender_id: string;
    content: string;
    is_admin_reply: boolean;
    is_read: boolean;
    created_at: string;
    organizations?: { name: string };
    sender?: { full_name: string, email: string };
};

export default function MessagesManager() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    
    // Scroll ref
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchOrgs = async () => {
        const { data } = await supabase.from('organizations').select('id, name').order('name');
        if (data) setOrganizations(data);
    }

    const fetchMessages = async () => {
        // Fetch all messages
        // In a real app with thousands, you'd paginate or group by org first
        const { data, error } = await supabase
            .from('b2b_messages')
            .select(`
                *,
                organizations!inner(id, name)
             `)
            .order('created_at', { ascending: true });

        if (error) console.error(error);
        else {
             // Získame všetky ID odosielateľov, aby sme získali ich profil (napr. full_name)
             const senderIds = Array.from(new Set(data.map(m => m.sender_id)));
             const { data: profilesData } = await supabase
                 .from('profiles')
                 .select('id, full_name')
                 .in('id', senderIds);
                 
             const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

             const mappedData = data.map(msg => ({
                 ...msg,
                 sender: profilesMap.get(msg.sender_id) || { full_name: 'Klient' }
             }));
             
             setMessages(mappedData as any);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMessages();
        fetchOrgs();

        // Realtime subscription could be added here
        const channel = supabase
            .channel('admin-messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'b2b_messages' },
                (payload) => {
                    fetchMessages(); // Refresh on new message
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedOrgId) return;
        
        setSending(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { error } = await supabase.from('b2b_messages').insert({
            organization_id: selectedOrgId,
            sender_id: user.id,
            content: replyText,
            is_admin_reply: true,
            is_read: false
        });

        if (error) {
            toast.error('Failed to send');
            console.error(error);
        } else {
            setReplyText('');
            toast.success('Reply sent');
            fetchMessages();
        }
        setSending(false);
    }

    // Group messages by Organization for the sidebar list
    // Get unique orgs that have messages, count unread
    const conversations = organizations.map(org => {
        const orgMessages = messages.filter(m => m.organization_id === org.id);
        const lastMessage = orgMessages[orgMessages.length - 1];
        const unreadCount = orgMessages.filter(m => !m.is_admin_reply && !m.is_read).length;
        
        if (orgMessages.length === 0) return null; // Hide empty conversations? Or show all orgs? Let's show active.

        return {
            org,
            lastMessage,
            unreadCount
        };
    }).filter(Boolean).sort((a,b) => {
        // Sort by unread, then latest date
        if (a!.unreadCount > b!.unreadCount) return -1;
        if (a!.unreadCount < b!.unreadCount) return 1;
        return new Date(b!.lastMessage!.created_at).getTime() - new Date(a!.lastMessage!.created_at).getTime();
    });

    const activeConversation = selectedOrgId ? messages.filter(m => m.organization_id === selectedOrgId) : [];

    // Mark as read when opening
    useEffect(() => {
        if (selectedOrgId && activeConversation.some(m => !m.is_admin_reply && !m.is_read)) {
            const markRead = async () => {
                await supabase
                    .from('b2b_messages')
                    .update({ is_read: true })
                    .eq('organization_id', selectedOrgId)
                    .eq('is_admin_reply', false)
                    .eq('is_read', false);
                
                // Update local state to remove badge
                setMessages(prev => prev.map(m => 
                    (m.organization_id === selectedOrgId && !m.is_admin_reply) 
                    ? { ...m, is_read: true } 
                    : m
                ));
            };
            markRead();
        }
    }, [selectedOrgId, messages]);


    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
            
            {/* Sidebar List */}
            <div className="md:col-span-1 border-r border-white/10 overflow-y-auto bg-slate-950/50">
                <div className="p-4 border-b border-white/5 sticky top-0 bg-slate-950/90 backdrop-blur z-10">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Mail size={18} className="text-blue-500"/> Inbox ({conversations.reduce((acc, c) => acc + (c?.unreadCount || 0), 0)})
                    </h3>
                </div>
                
                {conversations.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">No messages yet.</div>
                ) : (
                    conversations.map((conv: any) => (
                        <button 
                            key={conv.org.id}
                            onClick={() => setSelectedOrgId(conv.org.id)}
                            className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${selectedOrgId === conv.org.id ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`font-medium truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-slate-400'}`}>
                                    {conv.org.name}
                                </span>
                                {conv.unreadCount > 0 && (
                                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                        {conv.unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex justify-between items-end">
                                <p className="text-xs text-slate-500 truncate max-w-[140px]">
                                    {conv.lastMessage.is_admin_reply ? 'You: ' : ''}{conv.lastMessage.content}
                                </p>
                                <span className="text-[10px] text-slate-600">
                                    {new Date(conv.lastMessage.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* Chat View */}
            <div className="md:col-span-2 flex flex-col h-full bg-slate-900">
                {selectedOrgId ? (
                    <>
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900">
                            <h3 className="font-bold text-white">
                                {organizations.find(o => o.id === selectedOrgId)?.name}
                            </h3>
                            <span className="text-xs text-slate-500">Support Chat</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {activeConversation.map(msg => (
                                <div key={msg.id} className={`flex ${msg.is_admin_reply ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm relative group ${
                                        msg.is_admin_reply 
                                          ? 'bg-blue-600 text-white rounded-tr-none' 
                                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                                    }`}>
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                        <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${msg.is_admin_reply ? 'text-blue-200' : 'text-slate-500'}`}>
                                            <span>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            {msg.is_admin_reply && (
                                                msg.is_read ? <CheckCheck size={12}/> : <Check size={12}/>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendReply} className="p-4 border-t border-white/10 bg-slate-950 flex gap-2">
                            <input 
                                type="text" 
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Type a reply..."
                                className="flex-1 bg-slate-900 border border-white/10 rounded-full px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                            <button 
                                type="submit" 
                                disabled={!replyText.trim() || sending}
                                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:opacity-50 transition-all hover:scale-105"
                            >
                                {sending ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 flex-col gap-4">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                            <Reply size={32} className="text-slate-600"/>
                        </div>
                        <p>Select a conversation to maintain support.</p>
                    </div>
                )}
            </div>

        </div>
    );
}