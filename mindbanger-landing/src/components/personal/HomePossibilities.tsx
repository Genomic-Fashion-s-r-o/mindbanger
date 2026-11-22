import type { SiteLocale } from '@/lib/site-locale';

export function HomePossibilities({ locale }: { locale: SiteLocale }) {
  const c = (sk: string, cs: string) => locale === 'cs' ? cs : sk;
  const topics = [
    { title: c('Myšlienky', 'Myšlenky'), body: c('Keď máš hlavu plnú otázok a nevieš vypnúť.', 'Když máš hlavu plnou otázek a nedokážeš vypnout.') },
    { title: c('Sebavedomie', 'Sebevědomí'), body: c('Keď o sebe pochybuješ a potrebuješ nájsť istotu.', 'Když o sobě pochybuješ a potřebuješ najít jistotu.') },
    { title: c('Rozhodnutia', 'Rozhodnutí'), body: c('Keď stojíš na križovatke a nevieš, ktorým smerom ísť.', 'Když stojíš na křižovatce a nevíš, kterým směrem jít.') },
    { title: c('Zmena', 'Změna'), body: c('Keď vieš, že chceš niečo inak, ale nevieš, ako začať.', 'Když víš, že chceš něco jinak, ale nevíš, jak začít.') },
  ];
  return <section id="tvoj-priestor" className="personal-section home-needs home-possibilities home-possibilities-compact" aria-labelledby="home-needs-title">
    <div className="home-section-heading"><h2 id="home-needs-title">{c('Čo práve', 'Co právě')} <em>{c('riešiš?', 'řešíš?')}</em></h2></div>
    <div className="home-possibilities-grid">{topics.map(({title,body}) => <article className="home-possibility" key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
  </section>;
}
