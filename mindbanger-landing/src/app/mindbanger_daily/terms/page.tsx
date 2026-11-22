import Link from 'next/link';
import {cookies} from 'next/headers';
import {DailyTerms} from '@/components/legal/DailyLegal';

export const metadata={title:'Všeobecné obchodné podmienky online programov | Mindbanger'};
export default async function TermsPage(){
 const value=(await cookies()).get('user-lang')?.value;
 const lang=value==='cs'||value==='en'?value:'sk';
 const labels=lang==='cs'?['Všeobecné obchodní podmínky online programů','Účinnost: 21. října 2026 · verze daily-2026-10-21-v2','Zpět na Mindbanger Daily']:lang==='en'?['Terms for online programs and digital services','Effective 21 October 2026 · version daily-2026-10-21-v2','Back to Mindbanger Daily']:['Všeobecné obchodné podmienky online programov','Účinnosť: 21. október 2026 · verzia daily-2026-10-21-v2','Späť na Mindbanger Daily'];
 return <div className="min-h-screen bg-slate-950 text-slate-200 py-20 px-6"><div className="max-w-3xl mx-auto"><Link href="/mindbanger_daily" className="text-amber-500 hover:text-amber-400 mb-8 inline-block text-sm transition-colors">&larr; {labels[2]}</Link><h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4">{labels[0]}</h1><p className="text-sm text-slate-500 mb-12">{labels[1]}</p><div className="text-slate-300 space-y-4 leading-relaxed [&>h2]:text-xl [&>h2]:text-white [&>h2]:font-serif [&>h2]:mt-8 [&>h2]:mb-4 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>li]:mb-2"><DailyTerms lang={lang}/></div></div></div>;
}
