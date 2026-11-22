import type { SiteLocale } from '@/lib/site-locale';

export default function TreatmentSupportBenefits({locale='sk'}:{locale?:SiteLocale}) {
  const c=(sk:string,cs:string)=>locale==='cs'?cs:sk;
  const benefits=[
    [c('VNÚTORNÁ SILA','VNITŘNÍ SÍLA'),c('Utriediť si, čo práve potrebuješ.','Utřídit si, co právě potřebuješ.'),c('Pomenovať obavy a oprieť sa o schopnosti, skúsenosti či ľudí, ktorí ti pomáhajú.','Pojmenovat obavy a opřít se o schopnosti, zkušenosti či lidi, kteří ti pomáhají.')],
    [c('KOMUNIKÁCIA','KOMUNIKACE'),c('Pripraviť sa na dôležitý rozhovor.','Připravit se na důležitý rozhovor.'),c('Nájsť slová pre blízkych alebo si pripraviť otázky na najbližšiu kontrolu u lekára.','Najít slova pro blízké nebo si připravit otázky na nejbližší kontrolu u lékaře.')],
    [c('UVOĽNENIE','UVOLNĚNÍ'),c('Dopriať si chvíľu oddychu.','Dopřát si chvíli odpočinku.'),c('Podľa dohody vyskúšať jemnú relaxáciu alebo vybrať malý krok, ktorý vieš preniesť do svojho dňa.','Podle dohody vyzkoušet jemnou relaxaci nebo vybrat malý krok, který dokážeš přenést do svého dne.')],
  ];
  return <section id="co-ziskas" className="belief-section belief-benefits support-concise-benefits" aria-labelledby="sales-benefits-title">
    <h2 id="sales-benefits-title">{c('Objav vlastnú vnútornú silu.','Objev vlastní vnitřní sílu.')}<br/><em>{c('Dopraj si priestor na uvoľnenie.','Dopřej si prostor pro uvolnění.')}</em></h2>
    <div className="belief-benefit-grid">{benefits.map(([label,title,body],i)=><article key={label}><span className="belief-number">0{i+1} / {label}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
  </section>;
}
