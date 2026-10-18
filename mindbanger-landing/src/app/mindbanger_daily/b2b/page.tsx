import React from 'react';
import { getDictionary } from '@/lib/i18n';
import B2BRegistrationForm from '@/components/b2b/B2BRegistrationForm';
import { CheckCircle2, TrendingUp, Users, BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import B2BLanguageSwitcher from '@/components/b2b/B2BLanguageSwitcher';
import { cookies } from 'next/headers';

export default async function B2BPage(props: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const rawLang = searchParams.lang || cookieStore.get('user-lang')?.value || 'en';
  const lang = (['sk', 'cs', 'en'].includes(rawLang) ? rawLang : 'en') as 'sk' | 'cs' | 'en';
  const dict = getDictionary(lang);
  const t = dict.b2b;
  const tr = (sk: string, cs: string, en: string) => lang === 'sk' ? sk : lang === 'cs' ? cs : en;

  const businessBenefits = [
    { icon: BrainCircuit, title: tr("Vyššia psychická odolnosť", "Vyšší psychická odolnost", "Higher mental resilience"), desc: tr("– lepšie zvládanie stresu, tlaku a pracovného tempa", "– lepší zvládání stresu, tlaku a pracovního tempa", "– better management of stress, pressure, and work pace") },
    { icon: TrendingUp, title: tr("Lepší fokus a výkon", "Lepší fokus a výkon", "Better focus and performance"), desc: tr("– menej mentálneho chaosu, viac koncentrácie na úlohy", "– méně mentálního chaosu, více koncentrace na úkoly", "– less mental chaos, more concentration on tasks") },
    { icon: Users, title: tr("Prevencia vyčerpania a poklesu motivácie", "Prevence vyčerpání a poklesu motivace", "Burnout and motivation drop prevention"), desc: tr("– pravidelné mentálne nastavenie pomáha udržať energiu", "– pravidelné mentální nastavení pomáhá udržet energii", "– regular mindset tuning helps maintain energy") },
    { icon: CheckCircle2, title: tr("Atraktívny unikátny sociálny benefit", "Atraktivní unikátní sociální benefit", "Unique attractive social benefit"), desc: tr("– moderný a hodnotný benefit v rámci starostlivosti o duševné zdravie, ktorý firma poskytuje nad rámec bežných výhod", "– moderní a hodnotný benefit v rámci péče o duševní zdraví, který firma poskytuje nad rámec běžných výhod", "– modern and valuable mental healthcare benefit provided beyond standard perks") },
    { icon: Users, title: tr("Podpora lojality a vzťahu k firme", "Podpora loajality a vztahu k firmě", "Support loyalty and culture"), desc: tr("– zamestnanci cítia, že firme záleží aj na ich vnútornom nastavení, nie len výkone", "– zaměstnanci cítí, že firmě záleží i na jejich vnitřním nastavení, nejen na výkonu", "– employees feel the company cares about their mental state, not just performance") },
    { icon: TrendingUp, title: tr("Silný employer branding", "Silný employer branding", "Strong employer branding"), desc: tr("– firma pôsobí moderne, ľudsky a progresívne", "– firma působí moderně, lidsky a progresivně", "– company appears modern, human, and progressive") },
    { icon: CheckCircle2, title: tr("Dostupná a transparentná cena", "Dostupná a transparentní cena", "Accessible pricing"), desc: tr("– od 6,49€ / mesiac / zamestnanca, bez skrytých poplatkov", "– od 6,49€ / měsíc / zaměstnance, bez skrytých poplatků", "– from €6.49 / month / employee, no hidden fees") },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-amber-500/30">

      {/* Simple Header */}
      <nav className="fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
           <Link href="/mindbanger_daily" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <span className="font-serif font-bold text-2xl text-slate-50 tracking-wide">Mindbanger <span className="text-amber-500">Daily</span></span>
              <Image src="/logo.png" alt="Mindbanger" width={180} height={45} className="h-10 w-auto object-contain" />
           </Link>
           <B2BLanguageSwitcher initialLang={lang} />
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
         <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center lg:items-start">

            {/* Left Content */}
            <div className="space-y-10 animate-slideUp">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold tracking-widest uppercase">
                  <CurrentDate lang={lang} />
               </div>

               <h1 className="text-5xl md:text-7xl font-serif leading-[1.1]">
                  {t.hero.title}
               </h1>

               <p className="text-xl text-slate-400 max-w-lg leading-relaxed">
                  {t.hero.subtitle.replace(/reset/gi, 'mindset')}
               </p>

               <div className="space-y-6 pt-8 border-t border-white/10">
                  <h3 className="text-3xl font-bold font-serif text-white mb-6">
                     {tr('Výhody pre biznis:', 'Výhody pro byznys:', 'Business Benefits:')}
                  </h3>
                  {businessBenefits.map((f, i) => (
                    <div key={i} className="flex gap-4">
                       <f.icon className="text-amber-500 shrink-0 mt-1" />
                       <div>
                          <h4 className="font-bold text-lg text-white">{f.title}</h4>
                          <p className="text-slate-400">{f.desc}</p>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="bg-slate-900/50 p-8 rounded-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl opacity-50" />
                  <h3 className="text-2xl font-bold font-serif text-white mb-4 relative z-10">
                     {tr('Prínos pre zamestnancov:', 'Přínos pro zaměstnance:', 'Employee Benefits:')}
                  </h3>
                  <div className="text-slate-300 leading-relaxed space-y-4 relative z-10">
                     {lang === 'sk' && (
                       <>
                         <p className="font-bold text-white text-lg">Mindbanger pre zamestnanca nie je len ďalší firemný benefit.</p>
                         <p className="text-lg">Je to pár minút denne, ktoré zamestnancom pomôžu naučiť sa lepšie zvládať tlak, pokojnejšie začínať deň, viac sa sústrediť a cítiť sa lepšie. Je to benefit, ktorý má reálny dopad na mentálnu pohodu, psychické zdravie, energiu a životnú spokojnosť v práci aj mimo nej.</p>
                       </>
                     )}
                     {lang === 'cs' && (
                       <>
                         <p className="font-bold text-white text-lg">Mindbanger pro zaměstnance není jen další firemní benefit.</p>
                         <p className="text-lg">Je to pár minut denně, které zaměstnancům pomohou naučit se lépe zvládat tlak, klidněji začínat den, víc se soustředit a cítit se lépe. Je to benefit, který má reálný dopad na mentální pohodu, psychické zdraví, energii a životní spokojenost v práci i mimo ni.</p>
                       </>
                     )}
                     {lang === 'en' && (
                       <>
                         <p className="font-bold text-white text-lg">Mindbanger for an employee is not just another corporate perk.</p>
                         <p className="text-lg">It's a few minutes a day that help employees learn to handle pressure better, start the day more calmly, focus more deeply, and feel better. It's a benefit with a real impact on mental well-being, psychological health, energy, and life satisfaction in and out of work.</p>
                       </>
                     )}
                  </div>
               </div>
            </div>

            {/* Right Form */}
            <div className="animate-slideUp delay-200 lg:sticky lg:top-32">
               <div className="bg-slate-900 border border-amber-500/20 rounded-3xl p-8 relative overflow-hidden group hover:border-amber-500/40 transition-all">
                  <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors" />

                  <h3 className="text-2xl font-bold mb-4 relative z-10 text-white">
                     {tr('Vytvorenie účtu je zdarma', 'Vytvoření účtu je zdarma', 'Creating an account is free')}
                  </h3>

                  <p className="text-slate-400 mb-8 relative z-10 leading-relaxed">
                     {tr(
                       'Bezplatne vám založíme firemný účet v systéme a budete si v ňom môcť spravovať balíky pre svojich zamestnancov.',
                       'Bezplatně vám založíme firemní účet v systému a budete si v něm moci spravovat balíčky pro své zaměstnance.',
                       'We will create a free company account where you can easily manage packages for your employees.'
                     )}
                  </p>

                  <Link
                     href={`/mindbanger_daily/b2b/register?lang=${lang}`}
                     className="w-full block text-center py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg relative z-10 transition-all transform hover:scale-[1.02]"
                  >
                     {tr('Vytvoriť firemný účet', 'Vytvořit firemní účet', 'Create Company Account')}
                  </Link>

                  <p className="text-xs text-center text-slate-500 mt-4 relative z-10">
                     {tr('Už máte účet?', 'Už máte účet?', 'Already have an account?')} <Link href="/mindbanger_daily/login?type=b2b" className="text-amber-500 hover:underline">{tr('Prihlásiť sa', 'Přihlásit se', 'Login')}</Link>
                  </p>
               </div>
            </div>

         </div>
      </main>

    </div>
  );
}

function CurrentDate({ lang }: { lang: 'en' | 'sk' | 'cs' }) {
    const locale = lang === 'sk' ? 'sk-SK' : lang === 'cs' ? 'cs-CZ' : 'en-US';
    const today = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    return <>{today}</>;
}