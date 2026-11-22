"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Loader2, Bot } from 'lucide-react';
import toast from 'react-hot-toast';

type Message = {
    id: string;
    organization_id: string;
    sender_id: string;
    content: string;
    is_admin_reply: boolean;
    created_at: string;
};

export default function OrgMessages({ organizationId }: { organizationId: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from('b2b_messages')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: true });
            
        if (error) console.error(error);
        else setMessages(data || []);
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    useEffect(() => {
        if (!organizationId) return;

        fetchMessages();

        const channel = supabase
            .channel(`org-messages-${organizationId}`)
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'b2b_messages',
                    filter: `organization_id=eq.${organizationId}`
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages(prev => [...prev, newMsg]);
                    scrollToBottom();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [organizationId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        
        setSending(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { error } = await supabase.from('b2b_messages').insert({
            organization_id: organizationId,
            sender_id: user.id,
            content: newMessage,
            is_admin_reply: false, // Client sending to admin
            is_read: false
        });

        if (error) {
            toast.error('Failed to send message');
            console.error(error);
        } else {
            setNewMessage('');
            // Optimistic update handled by realtime subscription
        }
        setSending(false);
    }

    return (
        <div className="flex flex-col h-[600px] bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 bg-slate-950/50 flex items-center gap-3">
                <div className="bg-blue-600/20 p-2 rounded-full">
                    <Bot className="text-blue-500" size={20}/>
                </div>
                <div>
                    <h3 className="font-bold text-white">Support & Feedback</h3>
                    <p className="text-xs text-slate-400">Direct line to MindBanger team</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                {messages.length === 0 && (
                    <div className="text-center text-slate-500 mt-10">
                        <p>No messages yet. Start a conversation with us!</p>
                    </div>
                )}
                
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${!msg.is_admin_reply ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                            !msg.is_admin_reply
                              ? 'bg-blue-600 text-white rounded-tr-none' 
                              : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                        }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <span className={`text-[10px] block mt-1 text-right ${!msg.is_admin_reply ? 'text-blue-200' : 'text-slate-500'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-slate-950 flex gap-2">
                <input 
                    type="text" 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-slate-900 border border-white/10 rounded-full px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button 
                    type="submit" 
                    disabled={!newMessage.trim() || sending}
                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:opacity-50 transition-all hover:scale-105"
                >
                    {sending ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                </button>
            </form>
        </div>
    );
}