"use client";

import React, { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, User, Mail, Lock, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import B2BLanguageSwitcher from '@/components/b2b/B2BLanguageSwitcher';
import toast, { Toaster } from 'react-hot-toast';

function tr(sk: React.ReactNode, cs: React.ReactNode, en: React.ReactNode, lang: string) {
  if (lang === 'cs') return cs;
  if (lang === 'en') return en;
  return sk;
}

function B2BContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramLang = searchParams?.get('lang');
  
  const initialLang = (paramLang === 'sk' || paramLang === 'cs' || paramLang === 'en') 
     ? paramLang 
     : (typeof document !== 'undefined' ? (document.cookie.split('; ').find(c => c.startsWith('user-lang='))?.split('=')[1] || 'sk') : 'sk');
     
  const [lang, setLang] = useState<'sk' | 'cs' | 'en'>(initialLang as any);

  React.useEffect(() => {
    // If not in URL, make sure state is in sync with cookie after mount
    if (!paramLang) {
      const cookies = document.cookie.split('; ');
      const langCookie = cookies.find(c => c.startsWith('user-lang='));
      if (langCookie) {
         const val = langCookie.split('=')[1];
         if (['sk', 'cs', 'en'].includes(val)) setLang(val as any);
      }
    } else {
        setLang(paramLang as 'sk'|'cs'|'en');
    }
  }, [paramLang]);

  const [loading, setLoading] = useState(false);

  // Affiliate Tracking
  const [affiliateId, setAffiliateId] = useState<string | null>(null);

  React.useEffect(() => {
    // Check URL params first
    const refParam = searchParams?.get('ref');
    if (refParam) {
        setAffiliateId(refParam);
        localStorage.setItem('mindbanger_ref', refParam);
        return;
    }
    // Check localStorage for referral code set by AffiliateTracker
    const ref = localStorage.getItem('mindbanger_ref');
    if (ref) setAffiliateId(ref);
  }, [searchParams]);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    industry: 'tech',
    seats: 0, // No free seats by default
    firstName: '',
    lastName: '',
    email: '',
    phone: '', // Added Phone
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const msgStart = tr('Vytváram firemný účet...', 'Vytvářím firemní účet...', 'Creating company account...', lang) as string;
    const msgSuccess = tr('B2B Účet vytvorený! Presmerovávam...', 'B2B Účet vytvořený! Přesměrovávám...', 'B2B Account created! Redirecting...', lang) as string;
    const msgFailUser = tr('Registrácia zlyhala. Skúste znova.', 'Registrace selhala. Zkuste to znovu.', 'Registration failed. Try again.', lang) as string;
    const msgFailOrg = tr('Chyba pri vytváraní organizácie', 'Chyba při vytváření organizace', 'Error creating organization', lang) as string;

    const toastId = toast.loading(msgStart);

    try {
        // 1. Create User via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: `${formData.firstName} ${formData.lastName}`,
                    role: 'user' // Default to user, logic will elevate
                }
            }
        });

        if (authError) throw authError;

        if (!authData.user) throw new Error(msgFailUser);

        const accessToken = authData.session?.access_token;
        const newUserId = authData.user.id;

        // 2. Call API to Create Organization & Link Owner
        // We do this server-side to ensure atomicity and correct permissions
        const response = await fetch('/api/b2b/register-org', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}) 
            },
                body: JSON.stringify({
                  // userId is now inferred from token/session
                  companyName: formData.companyName,
                  email: formData.email, // Pass email for billing
                industry: formData.industry,
                initialSeats: 0, // No free seats
                phone: formData.phone, // Pass phone
                affiliateId: affiliateId, // Pass affiliate ID from localStorage
                newUserId: newUserId
            })
        });

        if (!response.ok) {
             const errData = await response.json();
             throw new Error(errData.message || msgFailOrg);
        }

        toast.success(msgSuccess, { id: toastId });
        
        // 3. Redirect to Dashboard
        setTimeout(() => {
            window.location.href = '/mindbanger_daily/app/organization'; // Forces a full hard reload with the new session cookie
        }, 1500);

    } catch (error: any) {
        console.error(error);
        toast.error(error.message, { id: toastId });
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 font-sans">
      <Toaster position="top-center" />
      
      {/* Header wrapper */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4 mb-10 pt-8 md:pt-0">
        <div className="flex items-center gap-3 text-white">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
              <Building2 size={20} />
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">
              Mindbanger <span className="text-white">B2B</span>
          </span>
        </div>
        
        <div className="bg-slate-900 px-4 py-2 rounded-full border border-white/5">
            <B2BLanguageSwitcher initialLang={lang} />
        </div>
      </div>

      {/* Main card wrapper */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-2xl border border-white/5 overflow-hidden shadow-2xl relative">
          
          {/* Left Panel: Value Prop */}
          <div className="p-8 md:p-12 bg-slate-950 lg:border-r border-white/5 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

              <div className="relative z-10">
                  <h2 className="text-3xl font-bold text-white mb-8 leading-tight">
                      {tr(
                        <React.Fragment>Transformujte <br/><span className="text-blue-500">produktivitu</span> vášho tímu.</React.Fragment>,
                        <React.Fragment>Transformujte <br/><span className="text-blue-500">produktivitu</span> vašeho týmu.</React.Fragment>,
                        <React.Fragment>Transform <br/>your team\'s <span className="text-blue-500">productivity</span>.</React.Fragment>,
                        lang
                      )}
                  </h2>
                  <ul className="space-y-6">
                      <li className="flex items-start gap-3 text-slate-300">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-400">
                             <CheckCircle2 size={16} />
                          </div>
                          <div>
                             <strong className="text-white block mb-1">{tr('Unikátny zamestnanecký benefit.', 'Unikátní zaměstnanecký benefit.', 'Unique employee benefit.', lang)}</strong>
                             <span className="text-sm text-slate-400">{tr('Efektívna starostlivosť o duševné zdravie zamestnancov zvyšujúca produktivitu a zároveň životnú spokojnosť v práci aj mimo nej.', 'Efektivní péče o duševní zdraví zaměstnanců zvyšující produktivitu a zároveň životní spokojenost v práci i mimo ni.', 'Effective employee mental healthcare increasing productivity and life satisfaction both at work and outside.', lang)}</span>
                          </div>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-400">
                             <CheckCircle2 size={16} />
                          </div>
                          <div>
                             <strong className="text-white block mb-1">{tr('Denné mentálne cvičenia', 'Denní mentální cvičení', 'Daily mental exercises', lang)}</strong>
                             <span className="text-sm text-slate-400">{tr('Denné rýchle meditačné audio formáty pre lepší fokus a zníženie stresu.', 'Denní rychlé meditační audio formáty pro lepší fokus a snížení stresu.', 'Daily quick meditation audio formats for better focus and stress reduction.', lang)}</span>
                          </div>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-400">
                             <CheckCircle2 size={16} />
                          </div>
                          <div>
                             <strong className="text-white block mb-1">{tr('Cielený obsah', 'Cílený obsah', 'Targeted content', lang)}</strong>
                             <span className="text-sm text-slate-400">{tr('Signály prispôsobené vášmu odvetviu.', 'Signály přizpůsobené vašemu odvětví.', 'Signals tailored to your industry.', lang)}</span>
                          </div>
                      </li>
                      <li className="flex items-start gap-3 text-slate-300">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-400">
                             <CheckCircle2 size={16} />
                          </div>
                          <div>
                             <strong className="text-white block mb-1">{tr('Jednoduchá správa', 'Jednoduchá správa', 'Easy management', lang)}</strong>
                             <span className="text-sm text-slate-400">{tr('Prehľadný dashboard, pozvánky, fakturácia a štatistiky na jednom mieste.', 'Přehledný dashboard, pozvánky, fakturace a statistiky na jednom místě.', 'Clear dashboard, invitations, billing, and statistics in one place.', lang)}</span>
                          </div>
                      </li>
                  </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                  <p className="text-base text-white italic font-medium">
                      "{tr('Starostlivosť o duševné zdravie zamestnancov nie je iba benefit, ale investícia s vysokou návratnosťou.', 'Péče o duševní zdraví zaměstnanců není jen benefit, ale investice s vysokou návratností.', 'Caring for employee mental health is not just a benefit, but an investment with high returns.', lang)}"
                  </p>
              </div>
          </div>

          {/* Right Panel: Form */}
          <div className="p-8 md:p-12 bg-slate-900 relative">
               <form onSubmit={handleRegister} className="space-y-6">

                   <div className="space-y-4">
                       <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <Building2 size={14} /> {tr('Informácie o firme', 'Informace o firmě', 'Company information', lang)}
                       </h3>

                       <div className="space-y-4">
                           <div className="space-y-1">
                               <label className="text-sm font-medium text-slate-300">{tr('Názov spoločnosti', 'Název společnosti', 'Company Name', lang)}</label>
                               <input
                                   required
                                   type="text"
                                   name="companyName"
                                   placeholder="Acme Corp, s.r.o."
                                   value={formData.companyName}
                                   onChange={handleChange}
                                   className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                               />
                           </div>

                           <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-300">{tr('Odvetvie', 'Odvětví', 'Industry', lang)}</label>
                                <select
                                    name="industry"
                                    value={formData.industry}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                                >
                                    <option value="tech">{tr('Technológie / IT', 'Technologie / IT', 'Tech & IT', lang)}</option>
                                    <option value="finance">{tr('Financie', 'Finance', 'Finance', lang)}</option>
                                    <option value="retail">{tr('Obchod a služby', 'Obchod a služby', 'Retail & Services', lang)}</option>
                                    <option value="education">{tr('Vzdelávanie', 'Vzdělávání', 'Education', lang)}</option>
                                    <option value="health">{tr('Zdravotníctvo', 'Zdravotnictví', 'Healthcare', lang)}</option>
                                    <option value="generic">{tr('Iné', 'Jiné', 'Other', lang)}</option>
                                </select>
                           </div>
                       </div>
                   </div>

                   <div className="pt-6 space-y-4 border-t border-white/5">
                       <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <User size={14} /> {tr('Admin účet', 'Admin účet', 'Admin account', lang)}
                       </h3>

                       <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                               <label className="text-sm font-medium text-slate-300">{tr('Meno', 'Jméno', 'First Name', lang)}</label>
                               <input
                                   required
                                   type="text"
                                   name="firstName"
                                   placeholder={tr('Ján', 'Jan', 'John', lang) as string}
                                   value={formData.firstName}
                                   onChange={handleChange}
                                   className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                               />
                           </div>
                           <div className="space-y-1">
                               <label className="text-sm font-medium text-slate-300">{tr('Priezvisko', 'Příjmení', 'Last Name', lang)}</label>
                               <input
                                   required
                                   type="text"
                                   name="lastName"
                                   placeholder={tr('Novák', 'Novák', 'Doe', lang) as string}
                                   value={formData.lastName}
                                   onChange={handleChange}
                                   className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                               />
                           </div>
                       </div>

                       <div className="space-y-1">
                           <label className="text-sm font-medium text-slate-300">{tr('Firemný Email', 'Firemní Email', 'Work Email', lang)}</label>
                           <div className="relative">
                               <Mail className="absolute left-3 top-3 text-slate-500" size={16} />
                               <input
                                   required
                                   type="email"
                                   name="email"
                                   placeholder={tr('jan.novak@firma.sk', 'jan.novak@firma.cz', 'john.doe@company.com', lang) as string}
                                   value={formData.email}
                                   onChange={handleChange}
                                   className="w-full bg-slate-950 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                               />
                           </div>
                       </div>

                       <div className="space-y-1">
                           <label className="text-sm font-medium text-slate-300">{tr('Telefónne číslo', 'Telefonní číslo', 'Phone number', lang)}</label>
                           <input
                               required
                               type="tel"
                               name="phone"
                               placeholder="+421 900 000 000"
                               value={formData.phone}
                               onChange={handleChange}
                               className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                           />
                       </div>

                       <div className="space-y-1">
                           <label className="text-sm font-medium text-slate-300">{tr('Heslo', 'Heslo', 'Password', lang)}</label>
                           <div className="relative">
                               <Lock className="absolute left-3 top-3 text-slate-500" size={16} />
                               <input
                                   required
                                   type="password"
                                   name="password"
                                   placeholder="••••••••"
                                   value={formData.password}
                                   onChange={handleChange}
                                   className="w-full bg-slate-950 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                               />
                           </div>
                       </div>
                   </div>

                   <div className="pt-6">
                       <button
                           type="submit"
                           disabled={loading}
                           className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transform active:scale-[0.98]"
                       >
                           {loading ? <Loader2 className="animate-spin" /> : <>{tr('Vytvoriť Dashboard', 'Vytvořit Dashboard', 'Create Dashboard', lang)} <ArrowRight size={18} /></>}
                       </button>
                       <p className="text-center text-xs text-slate-500 mt-4">
                           {tr('Kliknutím súhlasíte s podmienkami používania Mindbanger B2B.', 'Kliknutím souhlasíte s podmínkami používání Mindbanger B2B.', 'By clicking you agree to the terms of use of Mindbanger B2B.', lang)} <br/> {tr('Žiadna viazanosť.', 'Žádná vázanost.', 'No commitment.', lang)}
                       </p>
                   </div>

               </form>
          </div>

      </div>
    </div>
  );
}

export default function B2BRegistration() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 size={32} className="text-blue-500 animate-spin"/></div>}>
        <B2BContent />
    </Suspense>
  );
}
