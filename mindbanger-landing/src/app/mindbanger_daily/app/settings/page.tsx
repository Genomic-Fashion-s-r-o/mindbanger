'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, LogOut, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDictionary } from '@/lib/i18n-client';
import PushNotificationToggle from '@/components/push/PushNotificationToggle';

export default function SettingsPage() {
  const { dict } = useDictionary();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{
    full_name: string;
    preferred_language: string;
    timezone: string;
    notification_time?: string;
  } | null>(null);
  const [orgRole, setOrgRole] = useState<'owner' | 'admin' | null>(null);

  // Známe časové pásma pre zjednodušenie (dali by sa natiahnuť z Intl.supportedValuesOf('timeZone'))
  const timezones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ['UTC', 'Europe/Bratislava', 'Europe/Prague', 'Europe/London', 'America/New_York'];

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      // Check Org Membership
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .in('role', ['owner', 'admin'])
        .maybeSingle();

      if (membership) {
          setOrgRole(membership.role);
      }

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          preferred_language: data.preferred_language || 'en',
          timezone: data.timezone || 'UTC',
          notification_time: data.notification_time || '06:00:00'
        });
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          preferred_language: profile.preferred_language,
          timezone: profile.timezone,
          notification_time: profile.notification_time || '06:00:00'
        })
        .eq('id', user.id);
      
      // Update cookie so that the UI translates immediately inside useDictionary hooks
      document.cookie = `user-lang=${profile.preferred_language}; path=/; max-age=31536000`;
    }
    setSaving(false);
    window.location.reload(); // Obnovenie vsetkych klient/server dat s novym jazykom
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/mindbanger_daily/login');
  };

  const handleManageSubscription = async () => {
    try {
      const res = await fetch('/api/billing', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
      }
    } catch (e) {
      console.error(e);
      alert('Error opening billing portal');
    }
  };

  if (loading) return <div className="text-white p-6">{dict.settings?.loading || "Loading..."}</div>;

  return (
    <div className="py-2 md:py-6 space-y-8 max-w-2xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-serif text-white">{dict.settings?.title}</h1>
        <p className="text-slate-400">{dict.settings?.subtitle}</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6 bg-slate-900/50 p-6 md:p-8 rounded-[2rem] border border-white/5">
        
        {/* Organization Management Link */}
        {orgRole && (
           <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between mb-2">
              <div>
                 <h3 className="font-medium text-blue-400 flex items-center gap-2">
                    <Building2 size={18} />
                    {dict.settings?.orgTitle || 'Organization'}
                 </h3>
                 <p className="text-xs text-slate-400 mt-1">
                    {dict.settings?.orgDesc || 'Manage your team and subscription'}
                 </p>
              </div>
              <Link 
                href="/mindbanger_daily/app/organization"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                 {dict.settings?.orgManageBtn || 'Manage'}
              </Link>
           </div>
        )}

        {/* Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">{dict.settings?.nameLabel}</label>
          <input
            type="text"
            value={profile?.full_name || ''}
            onChange={e => setProfile({...profile!, full_name: e.target.value})}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
          />
        </div>

        {/* Language */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">{dict.settings?.languageLabel}</label>
          <select
            value={profile?.preferred_language || 'en'}
            onChange={e => setProfile({...profile!, preferred_language: e.target.value})}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
          >
            <option value="en">{dict.settings?.langEn}</option>
            <option value="sk">{dict.settings?.langSk}</option>
            <option value="cs">{dict.settings?.langCs}</option>
          </select>
          <p className="text-xs text-slate-500">{dict.settings?.languageDesc}</p>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">{dict.settings?.timezoneLabel}</label>
          <select
            value={profile?.timezone || 'UTC'}
            onChange={e => setProfile({...profile!, timezone: e.target.value})}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
          >
            {timezones.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500">{dict.settings?.timezoneDesc}</p>
        </div>

        {/* Push Notification Toggle */}
        <div className="space-y-2 pt-2">
           <PushNotificationToggle />
        </div>

        {/* Notification Time */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">{(dict.settings as any)?.timeLabel || 'Čas dennej notifikácie (tvoj lokálny čas)'}</label>
          <input
            type="time"
            value={(profile?.notification_time || '06:00:00').substring(0,5)}
            onChange={e => setProfile({...profile!, notification_time: e.target.value + ':00'})}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
          />
          <p className="text-xs text-slate-500">{(dict.settings as any)?.timeDesc || 'Kedy chceš dostávať denný signál?'}</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 mt-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? dict.settings?.savingBtn : <><Save size={18} /> {dict.settings?.saveBtn}</>}
        </button>
      </form>

      {/* Danger Zone */}
      <div className="bg-red-500/5 p-6 rounded-[2rem] border border-red-500/10 space-y-4">
        <h3 className="text-red-400 font-medium">{dict.settings?.dangerZone}</h3>
        <p className="text-sm text-slate-400">{dict.settings?.dangerDesc}</p>
        
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <button 
            onClick={handleManageSubscription}
            className="px-6 py-2.5 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors border border-slate-700"
          >
            {dict.settings?.manageStripe}
          </button>
          
          <button 
            onClick={handleLogout}
            className="px-6 py-2.5 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors border border-red-500/20 flex flex-row items-center justify-center gap-2"
          >
            <LogOut size={16}/> {dict.settings?.logoutBtn}</button>
        </div>
      </div>
      
    </div>
  );
}