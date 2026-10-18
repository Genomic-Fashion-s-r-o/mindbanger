import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import AffiliateTracker from '@/components/AffiliateTracker';
import { ArrowUpRight, Users, Wallet, Check, Play, Download, Image as ImageIcon } from 'lucide-react';
import CopyLink from '@/components/CopyLink';
import { SupabaseClient } from '@supabase/supabase-js';
import { getDictionary } from '@/lib/i18n';
import PayoutButton from '@/components/PayoutButton';

// We just make everyone an affiliate directly.
async function ensureAffiliate(supabase: SupabaseClient, userId: string) {
  const { data: existing } = await supabase
    .from('affiliates')
    .select('id, paypal_email')
    .eq('user_id', userId)
    .single();

  if (existing) {
    return existing;
  }

  const { data: newAffiliate } = await supabase
    .from('affiliates')
    .insert([{ user_id: userId }])
    .select()
    .single();

  return newAffiliate;
}

export default async function AffiliateDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/mindbanger_daily/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language')
    .eq('id', user.id)
    .single();
    
  const dict = getDictionary(profile?.preferred_language || 'en');

  const affiliate = await ensureAffiliate(supabase, user.id);

  // Fetch all referrals to calculate stats
  const { data: allReferrals } = await supabase
    .from('referrals')
    .select('id, referee_user_id, commission_model, status, amount, created_at')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false });

  let pendingRefA = 0;
  let activeRefB = 0;
  let unpaidBalance = 0;
  let totalEarned = 0;

  const registeredUsers: any[] = [];
  const activeSubscriptions: any[] = [];

  if (allReferrals) {
    allReferrals.forEach(ref => {
      const isA = ref.commission_model === 'second_month';
      const isB = ref.commission_model === 'lifetime_20';
      
      if (isA && ref.status === 'pending') pendingRefA++;
      if (isB && ref.status === 'paid') activeRefB++;
      
      const amount = Number(ref.amount) || 0;
      if (amount > 0) {
        if (ref.status === 'pending') unpaidBalance += amount;
        else if (ref.status === 'paid') totalEarned += amount;
      }

      if (amount === 0) {
         registeredUsers.push(ref);
      } else {
         activeSubscriptions.push(ref);
      }
    });
  }

  const { data: materials } = await supabase
    .from('affiliate_materials')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: payoutRequests } = await supabase
    .from('payout_requests')
    .select('*')
    .eq('affiliate_id', affiliate.id)
    .order('created_at', { ascending: false });

  return (
    <div className="w-full p-6 md:p-12 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-serif text-white">{dict.affiliate.title}</h1>
        <p className="text-slate-400 max-w-2xl text-lg">
          {dict.affiliate.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model A */}
        <div className="bg-slate-900/40 p-6 md:p-8 rounded-2xl border border-white/5 relative overflow-hidden group flex flex-col">
          <div className="absolute top-0 right-0 p-6 text-slate-800 group-hover:text-amber-500/10 transition-colors">
            <ArrowUpRight size={120} className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex flex-col h-full space-y-4">
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold tracking-wider uppercase rounded-full border border-amber-500/20">
                {dict.affiliate.modelA_badge}
              </span>
              <h2 className="text-2xl font-bold text-white">{dict.affiliate.modelA_title}</h2>
            </div>
            <p className="text-slate-400 text-sm flex-1">
              {dict.affiliate.modelA_desc}
            </p>
            <div className="pt-4 mt-auto">
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">{dict.affiliate.refA_label}</label>
              <CopyLink link={`https://mindbanger.com/mindbanger_daily?refMode=A&refCode=${affiliate.id}`} />
            </div>
          </div>
        </div>

        {/* Model B */}
        <div className="bg-slate-900/40 p-6 md:p-8 rounded-2xl border border-white/5 relative overflow-hidden group flex flex-col">
          <div className="absolute top-0 right-0 p-6 text-slate-800 group-hover:text-indigo-500/10 transition-colors">
            <ArrowUpRight size={120} className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex flex-col h-full space-y-4">
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold tracking-wider uppercase rounded-full border border-indigo-500/20">
                {dict.affiliate.modelB_badge}
              </span>
              <h2 className="text-2xl font-bold text-white">{dict.affiliate.modelB_title}</h2>
            </div>
            <p className="text-slate-400 text-sm flex-1">
              {dict.affiliate.modelB_desc}
            </p>
            <div className="pt-4 mt-auto">
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">{dict.affiliate.refB_label}</label>
              <CopyLink link={`https://mindbanger.com/mindbanger_daily?refMode=B&refCode=${affiliate.id}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Stat Board */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
        <div className="bg-slate-900/40 border border-white/5 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-slate-500 mb-2">
            <Users size={16} />
            <span className="text-sm">{dict.affiliate.stat_pendingA}</span>
          </div>
          <div className="text-2xl font-bold text-white">{pendingRefA}</div>
        </div>
        <div className="bg-slate-900/40 border border-white/5 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-slate-500 mb-2">
            <Users size={16} />
            <span className="text-sm">{dict.affiliate.stat_activeB}</span>
          </div>
          <div className="text-2xl font-bold text-white">{activeRefB}</div>
        </div>
        <div className="bg-slate-900/40 border border-white/5 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-slate-500 mb-2">
              <Wallet size={16} />
              <span className="text-sm">{dict.affiliate.stat_unpaid}</span>
            </div>
            <div className="text-2xl font-bold text-amber-500 mb-3">€{unpaidBalance.toFixed(2)}</div>
          </div>
          {unpaidBalance > 0 && (
            <div className="mt-2 text-xs">
               <PayoutButton unpaidBalance={unpaidBalance} affiliateId={affiliate.id} />
            </div>
          )}
        </div>
        <div className="bg-slate-900/40 border border-white/5 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-slate-500 mb-2">
            <Check size={16} />
            <span className="text-sm">{dict.affiliate.stat_total}</span>
          </div>
          <div className="text-2xl font-bold text-emerald-500">€{totalEarned.toFixed(2)}</div>
        </div>
      </div>

      <div className="pt-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">{dict.affiliate?.registrations_title || 'Nové registrácie'}</h2>
          <p className="text-slate-400">
            {dict.affiliate?.registrations_desc || 'Užívatelia, ktorí sa zaregistrovali cez váš odkaz.'}
          </p>
        </div>

        <div className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden">
          {registeredUsers && registeredUsers.length > 0 ? (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-slate-400 border-b border-white/5">
                <tr>
                  <th className="p-4 font-medium">Dátum</th>
                  <th className="p-4 font-medium">Užívateľ</th>
                  <th className="p-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {registeredUsers.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 whitespace-nowrap">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="p-4 whitespace-nowrap text-white font-mono text-xs">{req.referee_user_id ? req.referee_user_id.split('-')[0].toUpperCase() : 'Zmazaný účet'}</td>
                    <td className="p-4 text-right">
                       <span className="px-2 py-1 bg-slate-500/10 text-slate-400 rounded-full text-xs">Registrovaný</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
             <div className="text-center py-8 text-slate-500 text-sm">
                Zatiaľ žiadne registrácie
             </div>
          )}
        </div>
      </div>

      {/* Subscriptions */}
      <div className="pt-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">{dict.affiliate?.subscriptions_title || 'Zoznam predplatných a provízií'}</h2>
          <p className="text-slate-400">
            {dict.affiliate?.subscriptions_desc || 'Užívatelia s aktívnym alebo minulým predplatným.'}
          </p>
        </div>

        <div className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden">
          {activeSubscriptions && activeSubscriptions.length > 0 ? (
            <table className="w-full text-left text-sm text-slate-300 block overflow-x-auto w-full display-block">
              <thead className="bg-slate-900 text-slate-400 border-b border-white/5">
                <tr>
                  <th className="p-4 font-medium">Dátum</th>
                  <th className="p-4 font-medium">Užívateľ</th>
                  <th className="p-4 font-medium">Model</th>
                  <th className="p-4 font-medium">Provízia</th>
                  <th className="p-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 w-full">
                {activeSubscriptions.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 whitespace-nowrap">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="p-4 whitespace-nowrap text-white font-mono text-xs">{req.referee_user_id ? req.referee_user_id.split('-')[0].toUpperCase() : 'Zmazaný účet'}</td>
                    <td className="p-4 whitespace-nowrap text-slate-400 text-xs uppercase tracking-wider">{req.commission_model.replace('_', ' ')}</td>
                    <td className="p-4 whitespace-nowrap font-bold text-emerald-400">€{Number(req.amount).toFixed(2)}</td>
                    <td className="p-4 whitespace-nowrap text-right">
                      {req.status === 'pending' && <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs">Čaká</span>}
                      {req.status === 'waiting_second_month' && <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs">Čaká na 2. mesiac</span>}
                      {req.status === 'paid' && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs">Vyplatené</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
             <div className="text-center py-8 text-slate-500 text-sm">
                Zatiaľ žiadne záznamy o predplatnom.
             </div>
          )}
        </div>
      </div>

      {/* Details / History */}
      <div className="pt-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">{dict.affiliate.history_title}</h2>
          <p className="text-slate-400">
            {dict.affiliate.history_desc}
          </p>
        </div>

        <div className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden">
          {payoutRequests && payoutRequests.length > 0 ? (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-slate-400 border-b border-white/5">
                <tr>
                  <th className="p-4 font-medium">{dict.affiliate.history_date}</th>
                  <th className="p-4 font-medium">{dict.affiliate.history_amount}</th>
                  <th className="p-4 font-medium text-right">{dict.affiliate.history_status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payoutRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-white">€{Number(req.amount).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      {req.status === 'pending' && <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs">Pending</span>}
                      {req.status === 'paid' && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs">Paid</span>}
                      {req.status === 'rejected' && <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded-full text-xs">Rejected</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
             <div className="text-center py-8 text-slate-500 text-sm">
                {dict.affiliate.history_empty}
             </div>
          )}
        </div>
      </div>

      {/* Promo Library */}
      <div className="pt-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">{dict.affiliate.promo_title}</h2>
          <p className="text-slate-400">
            {dict.affiliate.promo_desc}
          </p>
        </div>

        {materials && materials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {materials.map((item) => (
              <div key={item.id} className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden flex flex-col group relative">
                <div className="aspect-video bg-black/50 relative flex items-center justify-center overflow-hidden">
                  {item.type === 'image' ? (
                    <img 
                      src={item.url} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-800/50">
                      <Play className="mb-2 w-12 h-12 text-white/20 group-hover:text-amber-500/50 transition-colors" />
                      <span className="text-xs font-medium uppercase tracking-wider bg-black/40 px-3 py-1 rounded-full border border-white/5">
                        {dict.affiliate.promo_videoVisual}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-white/80 border border-white/10">
                    {item.resolution || item.type}
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1 pb-16">
                  <h3 className="font-semibold text-white/90 line-clamp-2" title={item.title}>{item.title}</h3>
                  <div className="flex items-center space-x-2 mt-2 text-xs text-slate-500">
                    <span className="capitalize">{item.language}</span>
                    <span>&bull;</span>
                    <span className="capitalize">{item.type}</span>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 w-full p-4 border-t border-white/5 bg-slate-900/80 backdrop-blur-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <a 
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 w-full bg-white text-black hover:bg-slate-200 py-2 rounded-lg font-medium text-sm transition-colors"
                  >
                    <Download size={16} />
                    <span>{dict.affiliate.promo_download}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-900/40 border border-white/5 rounded-xl text-slate-500">
            {dict.affiliate.promo_empty}
          </div>
        )}
      </div>

    </div>
  );
}