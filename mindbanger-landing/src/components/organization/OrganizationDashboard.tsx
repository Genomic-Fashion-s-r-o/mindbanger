'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { User, UserPlus, X, Shield, ShieldCheck, Mail, CheckCircle, Clock, Trash2, Edit2, Save, XCircle, ChevronDown, FileUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import OrgMessages from '@/components/b2b/OrgMessages';
import B2BPurchaseModal from '@/components/organization/B2BPurchaseModal';
import TeamActivityModal from '@/components/organization/TeamActivityModal';
import CompanySettingsModal from '@/components/organization/CompanySettingsModal';

type Member = {
  id: string; // membership id
  user_id: string; // user profile id
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'invited' | 'active' | 'disabled';
  invite_sent_at: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type Organization = {
  id: string;
  name: string;
  tax_id: string | null;
  dic: string | null;
  address_street: string | null;
  address_city: string | null;
  address_zip: string | null;
  address_country: string | null;
  billing_email: string;
  seats_limit: number;
  subscription_status: string;
  industry: string | null;
};

export default function OrganizationDashboard({ 
  organization, 
  initialMembers,
  userRole,
  lang,
  dict,
  stats
}: { 
  organization: Organization; 
  initialMembers: any[]; 
  userRole: string;
  lang: string;
  dict: any;
  stats?: { corporate: number; daily: number };
}) {
  const [localOrg, setLocalOrg] = useState<Organization>(organization);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPurchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [isActivityModalOpen, setActivityModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const router = useRouter();

  const handleOpenBillingPortal = async () => {
    setOpeningPortal(true);
    try {
      const res = await fetch('/api/b2b/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: localOrg.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Portal failed');
      window.location.href = data.url;
    } catch (err: any) {
      toast.error((lang === 'sk' || lang === 'cs') ? 'Nepodarilo sa otvoriť fakturačný portál: ' + err.message : 'Failed to open billing portal: ' + err.message);
    } finally {
      setOpeningPortal(false);
    }
  };

  const isOwner = userRole === 'owner';
  const isValidCompanyData = (org: Organization) => !!(
    org.name?.trim() && 
    org.address_street?.trim() && 
    org.address_city?.trim() && 
    org.address_zip?.trim() && 
    org.tax_id?.trim() && 
    org.dic?.trim()
  );

  const handleUpgradeClick = () => {
    if (!isValidCompanyData(localOrg)) {
      toast.error((lang === 'sk' || lang === 'cs') ? 'Prosím, najskôr vyplňte všetky firemné údaje.' : 'Please fill out your company details first.');
      setSettingsModalOpen(true);
      return;
    }
    setPurchaseModalOpen(true);
  };

  const t = {
      seats: (lang === 'sk' || lang === 'cs') ? 'Počet miest' : 'Seats used',
      taxId: (lang === 'sk' || lang === 'cs') ? 'IČO' : 'Tax ID',
      billing: (lang === 'sk' || lang === 'cs') ? 'Fakturačný email' : 'Billing Email',
      addMember: (lang === 'sk' || lang === 'cs') ? 'Pridať člena' : 'Add Member',
      emailPlaceholder: (lang === 'sk' || lang === 'cs') ? 'Email zamestnanca' : 'Employee email',
      invite: (lang === 'sk' || lang === 'cs') ? 'Pozvať' : 'Invite',
      remove: (lang === 'sk' || lang === 'cs') ? 'Odstrániť' : 'Remove',
      role: (lang === 'sk' || lang === 'cs') ? 'Rola' : 'Role',
      status: (lang === 'sk' || lang === 'cs') ? 'Stav' : 'Status',
      active: (lang === 'sk' || lang === 'cs') ? 'Aktívny' : 'Active',
      invited: (lang === 'sk' || lang === 'cs') ? 'Pozvaný' : 'Invited',
      disabled: (lang === 'sk' || lang === 'cs') ? 'Zablokovaný' : 'Disabled',
      owner: (lang === 'sk' || lang === 'cs') ? 'Vlastník' : 'Owner',
      admin: (lang === 'sk' || lang === 'cs') ? 'Admin' : 'Admin',
      member: (lang === 'sk' || lang === 'cs') ? 'Člen' : 'Member',
      limitReached: (lang === 'sk' || lang === 'cs') ? 'Limit miest dosiahnutý' : 'Seat limit reached',
      alreadyMember: (lang === 'sk' || lang === 'cs') ? 'Tento email je už členom' : 'This email is already a member',
      successInvite: (lang === 'sk' || lang === 'cs') ? 'Pozvánka odoslaná' : 'Invitation sent',
      successRemove: (lang === 'sk' || lang === 'cs') ? 'Člen odstránený' : 'Member removed',
      error: (lang === 'sk' || lang === 'cs') ? 'Nastala chyba' : 'An error occurred',
      confirmRemove: (lang === 'sk' || lang === 'cs') ? 'Naozaj chcete odstrániť tohto člena?' : 'Are you sure you want to remove this member?',
      cannotRemoveSelf: (lang === 'sk' || lang === 'cs') ? 'Nemôžete odstrániť sami seba' : 'You cannot remove yourself',
      upgrade: (lang === 'sk' || lang === 'cs') ? 'Navýšiť počet miest' : 'Upgrade seats',
      bulkUpload: (lang === 'sk' || lang === 'cs') ? 'Hromadný import (CSV/TXT)' : 'Bulk Import (CSV/TXT)',
      bulkUploadTooltip: (lang === 'sk' || lang === 'cs') ? 'Nahrajte súbor so zoznamom emailov (1 email na riadok alebo oddelené čiarkou)' : 'Upload a file with email addresses (1 per line or comma-separated)',
      bulkUploadInfo: lang === 'sk' ? 'Info k hromadnému importu: Pripravte si zoznam e-mailov v Exceli a pri ukladaní (1. Uložiť ako) zvoľte formát .csv. Prípadne skopírujte e-maily z Excelu, vložte ich do obyčajného textového súboru (NotePad) a ten uložte ako .txt, ktorý následne nahrajte.' : lang === 'cs' ? 'Info k hromadnému importu: Připravte si seznam e-mailů v Exceli a při ukládání (1. Uložit jako) zvolte formát .csv. Případně zkopírujte e-maily z Excelu, vložte je do obyčejného textového souboru (NotePad) a ten uložte jako .txt, který následně nahrajte.' : 'Bulk Import Info: Prepare your email list in Excel and select the .csv format when saving (1. Save As). Alternatively, copy the emails from Excel, paste them into a plain text file (NotePad) and save it as .txt, which you can then upload.',
  };

  const handleBulkTextSubmit = async () => {
      if (!bulkInput.trim()) return;

      const loadingToast = toast.loading((lang === 'sk' || lang === 'cs') ? 'Spracujem emaily...' : 'Processing emails...');

      // Extract emails using regex
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      const foundEmailsRaw = bulkInput.match(emailRegex) || [];

      // Deduplicate and clean
      const foundEmails = Array.from(new Set(foundEmailsRaw.map(em => em.toLowerCase().trim())));

      if (foundEmails.length === 0) {
          toast.error((lang === 'sk' || lang === 'cs') ? 'Nenašli sa žiadne platné platné emaily.' : 'No valid emails found.', { id: loadingToast, duration: 4000 });
          return;
      }

      if (foundEmails.length + activeMembersCount > localOrg.seats_limit) { 
          toast.error(t.limitReached + ` (${foundEmails.length} nažmýkaných, ${seatsLeft} voľných miest)`, { id: loadingToast, duration: 5000 });
          return;
      }

      setLoading(true);
      let successCount = 0;
      let failCount = 0;

      toast.loading((lang === 'sk' || lang === 'cs') ? `Posielam pozvánky (${foundEmails.length} emailov)...` : `Sending invites (${foundEmails.length} emails)...`, { id: loadingToast });

      // Bulk API call using deduplicated ignore constraints
      try {
          const newMembersToInsert = foundEmails
              .filter(email => !members.some(m => m.email.toLowerCase() === email))
              .map(email => ({
                  organization_id: localOrg.id,
                  email: email,
                  role: 'member',
                  status: 'invited'
              }));

          if (newMembersToInsert.length > 0) {
              const { data, error } = await supabase
                  .from('organization_members')
                  .upsert(newMembersToInsert, { onConflict: 'organization_id,email', ignoreDuplicates: true })
                  .select(`id, email, role, status, created_at, user_id`);

              if (error) {
                  console.error('Bulk Upsert Error:', error);
                  failCount += newMembersToInsert.length;
              } else if (data && data.length > 0) {
                  setMembers(prev => [...(data as any), ...prev]);
                  successCount += data.length;
                  failCount += newMembersToInsert.length - data.length;
              } else {
                  failCount += newMembersToInsert.length;
              }
          } else {
              failCount += foundEmails.length;
          }
      } catch (err) {
          console.error('Bulk insert error:', err);
          failCount += foundEmails.length;
      }

      setLoading(false);

      if (successCount > 0 && failCount === 0) {
          toast.success((lang === 'sk' || lang === 'cs') ? `Zoznam bol rozšírený o ${successCount} emailov. Ešte je potrené odoslať pozvánky.` : `Added ${successCount} emails. Remember to send the invites!`, { id: loadingToast, duration: 5000 });
          setBulkInput('');
          setIsBulkMode(false);
      } else if (successCount > 0 && failCount > 0) {
          toast.success((lang === 'sk' || lang === 'cs') ? `Pridaných ${successCount}. Preskočených ${failCount} emailov. Ešte nezabudnite odoslať pozvánky!` : `Added ${successCount}. Skipped ${failCount}. Remember to send the invites!`, { id: loadingToast, duration: 6000 });
          setBulkInput('');
          setIsBulkMode(false);
      } else if (successCount === 0 && failCount > 0) {
          toast.error((lang === 'sk' || lang === 'cs') ? `Všetkých ${failCount} emailov bolo preskočených (už sú v systéme alebo nastala DB chyba). Skontrolujte konzolu prehliadača (F12).` : `All ${failCount} emails skipped (already members or DB error). Check F12 console.`, { id: loadingToast, duration: 10000 });
      } else {
          toast.dismiss(loadingToast);
      }
  };

  const activeMembersCount = members.filter(m => m.status === 'active' || m.status === 'invited').length;
  const seatsLeft = localOrg.seats_limit - activeMembersCount;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    if (activeMembersCount >= localOrg.seats_limit) {
      toast.error(t.limitReached);
      return;
    }
    
    // Check if duplicate in list
    if (members.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
        toast.error(t.alreadyMember);
        return;
    }

    setLoading(true);

    try {
// 1. Create Invite Record (Using upsert to gracefully handle duplicates)
        const { data, error } = await supabase
          .from('organization_members')
          .upsert({
            organization_id: localOrg.id,
            email: inviteEmail.toLowerCase(),
            role: 'member',
            status: 'invited'
          }, { onConflict: 'organization_id,email', ignoreDuplicates: true })
          .select(`
            id,
            email,
            role,
            status,
            created_at,
            user_id
          `)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
            toast.error(t.alreadyMember);
            setLoading(false);
            return;
        }

      // 2. Add to local list
      // @ts-expect-error - Types might mismatch slightly but safe here
      setMembers([data, ...members]);
      setInviteEmail('');
      toast.success(t.successInvite);

      // Note: Email sending is a manual step now.

    } catch (err: any) {
      console.error(err);
      toast.error(t.error + ": " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm(t.confirmRemove)) return;

    try {
        const { error } = await supabase
            .from('organization_members')
            .delete()
            .eq('id', memberId);

        if (error) throw error;
        
        setMembers(members.filter(m => m.id !== memberId));
        toast.success(t.successRemove);
    } catch (err: any) {
        toast.error(t.error);
    }
  };

  const updateRole = async (memberId: string, newRole: string) => {
      try {
          const { error } = await supabase
            .from('organization_members')
            .update({ role: newRole })
            .eq('id', memberId);

          if (error) throw error;

          setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole as any } : m));
          toast.success(t.successInvite); // Re-using success message for update
      } catch (err) {
          toast.error(t.error);
      }
  };

  const handleSendSingleInvite = async (email: string, memberId: string) => {
      const emailLoading = toast.loading((lang === 'sk' || lang === 'cs') ? 'Odosielam pozvánku...' : 'Sending invite...');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await fetch('/api/b2b/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                orgId: localOrg.id,
                inviterName: user?.user_metadata?.full_name || 'Admin',
                lang: lang
            })
        });
        
        const now = new Date().toISOString();
        await supabase
          .from('organization_members')
          .update({ invite_sent_at: now })
          .eq('id', memberId);
          
        setMembers(members => members.map(m => m.id === memberId ? { ...m, invite_sent_at: now } : m));
        
        toast.success((lang === 'sk' || lang === 'cs') ? 'Pozvánka úspešne odoslaná.' : 'Invite successfully sent.', { id: emailLoading });
      } catch (err) {
         toast.error((lang === 'sk' || lang === 'cs') ? 'Odoslanie zlyhalo.' : 'Sending failed.', { id: emailLoading });
      }
  };

  const handleSendAllPending = async () => {
      const pendingMembers = members.filter(m => m.status === 'invited' && !m.invite_sent_at);
      if (pendingMembers.length === 0) {
          toast((lang === 'sk' || lang === 'cs') ? 'Žiadne čakajúce neodoslané pozvánky.' : 'No pending unsent invites found.');
          return;
      }

      const bulkLoading = toast.loading((lang === 'sk' || lang === 'cs') ? `Odosielam ${pendingMembers.length} pozvánok...` : `Sending ${pendingMembers.length} invites...`);

      let sentCount = 0;
      let failCount = 0;
      const now = new Date().toISOString();

      const { data: { user } } = await supabase.auth.getUser();
      const inviterName = user?.user_metadata?.full_name || 'Admin';

      const successIds: string[] = [];

      for (const m of pendingMembers) {
          try {
              const res = await fetch('/api/b2b/invite', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      email: m.email,
                      orgId: localOrg.id,
                      inviterName,
                      lang
                  })
              });
              if (!res.ok) throw new Error('API Error');
              successIds.push(m.id);
              sentCount++;
          } catch(err) {
              failCount++;
          }
      }

      if (successIds.length > 0) {
        await supabase
          .from('organization_members')
          .update({ invite_sent_at: now })
          .in('id', successIds);
          
        setMembers(members => members.map(m => successIds.includes(m.id) ? { ...m, invite_sent_at: now } : m));
      }

      if (failCount === 0) {
          toast.success((lang === 'sk' || lang === 'cs') ? `Všetkých ${sentCount} pozvánok odoslaných na email.` : `All ${sentCount} invites sent via email.`, { id: bulkLoading });
      } else {
          toast.success((lang === 'sk' || lang === 'cs') ? `Emailov odoslaných: ${sentCount}. Zlyhalo: ${failCount}.` : `Emails sent: ${sentCount}. Failed: ${failCount}.`, { id: bulkLoading });
      }
  };

  return (
    <div className="space-y-8">
       {/* Actions Header */}
       {isOwner && (
         <div className="flex justify-end gap-3">
           <button
             onClick={handleOpenBillingPortal}
             disabled={openingPortal}
             className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-white/5 disabled:opacity-50"
           >
             {openingPortal ? (
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
             ) : (
               <Mail className="w-4 h-4" /> 
             )}
             {(lang === 'sk' || lang === 'cs') ? 'Správa predplatného a faktúr' : 'Billing & Invoices'}
           </button>

           <button
             onClick={() => setSettingsModalOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-white/5"
           >
             <Edit2 className="w-4 h-4" />
             {(lang === 'sk' || lang === 'cs') ? 'Firemné údaje' : 'Company Settings'}
           </button>
         </div>
       )}

       {/* Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-6">
              <h3 className="text-slate-400 text-sm font-medium mb-1">{t.seats}</h3>
              <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-bold text-white">{activeMembersCount}</span>
                 <span className="text-slate-500">/ {localOrg.seats_limit}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 mt-4 rounded-full overflow-hidden">
                 <div 
                   className={`h-full ${seatsLeft === 0 ? 'bg-red-500' : 'bg-blue-500'}`} 
                   style={{ width: `${Math.min((activeMembersCount / localOrg.seats_limit) * 100, 100)}%` }} 
                 />
              </div>
          </div>
          
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-6">
              <h3 className="text-slate-400 text-sm font-medium mb-1">{t.status}</h3>
              <div className="flex items-center gap-2 mt-1">
                 {localOrg.subscription_status === 'active' ? (
                     <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-sm font-semibold border border-green-500/20">
                         {t.active}
                     </span>
                 ) : (
                     <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-sm font-semibold border border-yellow-500/20 capitalize">
                         {localOrg.subscription_status === 'registered' ? ((lang === 'sk' || lang === 'cs') ? 'Čaká na aktiváciu' : 'Pending Activation') : localOrg.subscription_status}
                     </span>
                 )}
              </div>
              <p className="text-slate-500 text-sm mt-3">{t.billing}: {localOrg.billing_email}</p>
          </div>

          <div 
                className="bg-slate-900 border border-white/5 rounded-2xl p-6 flex flex-col justify-center cursor-pointer hover:bg-slate-800 transition-colors group"
                onClick={() => setActivityModalOpen(true)}
                title={(lang === 'sk' || lang === 'cs') ? 'Zobraziť detailné štatistiky zamestnancov' : 'View detailed employee statistics'}
            >
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-slate-400 text-sm font-medium group-hover:text-slate-300 transition-colors">{(lang === 'sk' || lang === 'cs') ? 'Aktivita tímu' : 'Team Activity'}</h3>
                </div>
                 <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 group-hover:border-amber-500/20 transition-colors">
                          <div className="text-xl font-bold text-white">{stats?.corporate || 0}</div>
                          <div className="text-[10px] text-amber-500 uppercase font-bold mt-1 tracking-wide">{(lang === 'sk' || lang === 'cs') ? 'Firemné' : 'Corp'}</div>
                      </div>
                      <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 group-hover:border-blue-500/20 transition-colors">
                          <div className="text-xl font-bold text-white">{stats?.daily || 0}</div>
                          <div className="text-[10px] text-blue-400 uppercase font-bold mt-1 tracking-wide">{(lang === 'sk' || lang === 'cs') ? 'Denné' : 'Daily'}</div>
                      </div>
                 </div>
            </div>

          <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 flex flex-col justify-center items-center">
              {localOrg.subscription_status === 'registered' ? (
                  <div className="text-center flex flex-col items-center">
                      <p className="text-amber-500 font-bold text-sm mb-2">{(lang === 'sk' || lang === 'cs') ? 'Účet vyžaduje aktiváciu' : 'Account needs activation'}</p>
                      <button
                        onClick={handleUpgradeClick}
                        className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-sm font-bold transition-colors"
                      >
                          {t.upgrade}
                      </button>
                  </div>
              ) : (
                  <button 
                    onClick={handleUpgradeClick}
                    className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                      {t.upgrade}
                  </button>
              )}
          </div>
       </div>

       <B2BPurchaseModal 
         isOpen={isPurchaseModalOpen}
         onClose={() => setPurchaseModalOpen(false)}
         orgId={localOrg.id}
         lang={lang}
       />

       {/* Invite Form */}
       <div className="bg-slate-900 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-medium text-white flex items-center gap-2">
                 <UserPlus size={18} className="text-blue-500" />
                 {t.addMember}
             </h3>
             <button
                type="button"
                onClick={() => setIsBulkMode(!isBulkMode)}
                className="text-sm text-slate-400 hover:text-white flex items-center gap-2 border border-slate-700 bg-slate-800 px-3 py-1.5 rounded-lg transition-colors group" 
                title={t.bulkUploadTooltip}
             >
                <FileUp size={16} className="group-hover:text-blue-400 transition-colors" />
                {isBulkMode ? "Prepniť na 1 email" : t.bulkUpload}
             </button>
          </div>
          
          {isBulkMode ? (
             <form onSubmit={(e) => { e.preventDefault(); handleBulkTextSubmit(); }} className="flex flex-col gap-4">
                 <textarea
                   value={bulkInput}
                   onChange={(e) => setBulkInput(e.target.value)}
                   disabled={loading}
                   placeholder="Zadajte alebo vložte zoznam emailových adries, oddelené čiarkou, medzerou, alebo na nový riadok..."
                   className="w-full h-32 bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-y"
                   required
                 />
                 <div className="flex justify-end">
                     <button
                       type="submit"
                       disabled={loading || seatsLeft <= 0 || !bulkInput.trim()}
                       className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                         {loading ? <Clock size={18} className="animate-spin" /> : <Mail size={18} />}
                         Hromadný import
                     </button>
                 </div>
             </form>
          ) : (
          <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
              <button
                type="submit"
                disabled={loading || seatsLeft <= 0}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                  {loading ? <Clock size={18} className="animate-spin" /> : <Mail size={18} />}
                  {t.invite}
              </button>
          </form>
          )}
          <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-300">ℹ️ {t.bulkUploadInfo}</span>
              </p>
          </div>
       </div>

       {/* Members List */}
       <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <User size={18} className="text-blue-500" />
                {lang === 'sk' || lang === 'cs' ? 'Zoznam členov' : 'Members List'}
             </h3>
             {members.some(m => m.status === 'invited') && (
                <button
                   onClick={handleSendAllPending}
                   disabled={loading}
                   className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                   <Mail size={16} />
                   {lang === 'sk' || lang === 'cs' ? 'Odoslať čakajúce pozvánky' : 'Send Pending Invites'}
                </button>
             )}
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead>
                   <tr className="border-b border-white/5 bg-slate-950/50 text-slate-400">
                      <th className="px-6 py-4 font-medium">{t.member}</th>
                      <th className="px-6 py-4 font-medium">{t.role}</th>
                      <th className="px-6 py-4 font-medium">{t.status}</th>
                      <th className="px-6 py-4 font-medium text-right"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                   {members.map((member) => (
                      <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-medium border border-white/5">
                                 {member.profiles?.full_name ? member.profiles.full_name.charAt(0) : member.email.charAt(0).toUpperCase()}
                               </div>
                               <div>
                                  <div className="font-medium text-white">
                                     {member.profiles?.full_name || (member.user_id ? 'Registered User' : 'Pending Invite')}
                                  </div>
                                  <div className="text-slate-500 text-xs">{member.email}</div>
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                             {userRole === 'owner' && member.role !== 'owner' ? (
                                <div className="relative group w-fit">
                                    <select 
                                        value={member.role}
                                        onChange={(e) => updateRole(member.id, e.target.value)}
                                        className="appearance-none bg-transparent pl-7 pr-8 py-1.5 rounded text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
                                    >
                                        <option value="admin" className="bg-slate-900 text-slate-300">{t.admin}</option>
                                        <option value="member" className="bg-slate-900 text-slate-300">{t.member}</option>
                                    </select>
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {member.role === 'admin' ? <Shield size={14} className="text-blue-400" /> : <User size={14} className="text-slate-400" />}
                                    </div>
                                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                </div>
                             ) : (
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                   {member.role === 'owner' && <ShieldCheck size={14} className="text-amber-500" />}
                                   {member.role === 'admin' && <Shield size={14} className="text-blue-400" />}
                                   {member.role === 'member' && <User size={14} className="text-slate-400" />}
                                   <span className="capitalize text-slate-300 font-medium text-sm">
                                       {member.role === 'owner' ? t.owner : (member.role === 'admin' ? t.admin : t.member)}
                                   </span>
                                </div>
                             )}
                         </td>
                         <td className="px-6 py-4">
                            {member.status === 'active' ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
                                   <CheckCircle size={10} /> {t.active}
                                </span>
                            ) : member.invite_sent_at ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
                                   <Mail size={10} /> {t.invited}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                                   <Clock size={10} /> {(lang === 'sk' || lang === 'cs') ? 'Pridaný' : 'Added'}
                                </span>
                            )}
                         </td>
                         <td className="px-6 py-4 text-right">
                            {member.status === 'invited' && (userRole === 'owner' || (userRole === 'admin' && member.role === 'member')) && (
                                <button
                                  onClick={() => handleSendSingleInvite(member.email, member.id)}
                                  className="transition-colors p-2 rounded-lg text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 mr-2"
                                  title={member.invite_sent_at ? ((lang === 'sk' || lang === 'cs') ? "Pozvať znova" : "Resend Invite") : ((lang === 'sk' || lang === 'cs') ? "Odoslať pozvánku" : "Send Invite")}
                                >
                                   <Mail size={18} />
                                </button>
                            )}
                            {userRole === 'owner' && member.role !== 'owner' && (
                                <button 
                                  onClick={() => handleRemove(member.id)}
                                  className={`transition-colors p-2 rounded-lg ${member.status === 'invited' ? 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10' : 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'}`}
                                  title={member.status === 'invited' ? ((lang === 'sk' || lang === 'cs') ? "Odvolať pozvánku" : "Revoke Invitation") : t.remove}
                                >
                                   {member.status === 'invited' ? <XCircle size={18} /> : <Trash2 size={18} />}
                                </button>
                            )}
                            {userRole === 'admin' && member.role === 'member' && (
                                <button 
                                  onClick={() => handleRemove(member.id)}
                                  className={`transition-colors p-2 rounded-lg ${member.status === 'invited' ? 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10' : 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'}`}
                                  title={member.status === 'invited' ? ((lang === 'sk' || lang === 'cs') ? "Odvolať pozvánku" : "Revoke Invitation") : t.remove}
                                >
                                   {member.status === 'invited' ? <XCircle size={18} /> : <Trash2 size={18} />}
                                </button>
                            )}
                         </td>
                      </tr>
                   ))}
                   {members.length === 0 && (
                      <tr>
                         <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                             No members found.
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       {/* Support Messages */}
       <OrgMessages organizationId={localOrg.id} />

       {/* Company Settings Modal */}
       <CompanySettingsModal
         isOpen={isSettingsModalOpen}
         onClose={() => setSettingsModalOpen(false)}
         organization={localOrg}
         lang={lang}
         onUpdate={(updatedOrg) => setLocalOrg(updatedOrg)}
       />
    </div>
  );
}
