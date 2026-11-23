import type { SiteLocale } from '@/lib/site-locale';
import './treatment-support.css';

const studies = [
  {
    title: ['Psychická príprava pred operáciou srdca', 'Psychická příprava před operací srdce'],
    citation: 'Rief et al. · BMC Medicine · 2017',
    design: ['Randomizovaná štúdia · 124 pacientov · sledovanie 6 mesiacov', 'Randomizovaná studie · 124 pacientů · sledování 6 měsíců'],
    finding: ['Krátka psychologická príprava zameraná na realistické očakávania pred operáciou koronárneho bypassu priniesla po 6 mesiacoch väčšie zlepšenie funkčných obmedzení oproti bežnej starostlivosti.', 'Krátká psychologická příprava zaměřená na realistická očekávání před operací koronárního bypassu přinesla po 6 měsících větší zlepšení funkčních omezení oproti běžné péči.'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/28069021/', doi: '10.1186/s12916-016-0767-3',
  },
  {
    title: ['Koučing a zvládanie vysokého krvného tlaku', 'Koučink a zvládání vysokého krevního tlaku'],
    citation: 'Meng et al. · International Journal of Nursing Studies · 2023',
    design: ['Metaanalýza · 12 randomizovaných štúdií · 2 497 účastníkov', 'Metaanalýza · 12 randomizovaných studií · 2 497 účastníků'],
    finding: ['Zdravotný koučing u ľudí s hypertenziou v súhrne priniesol zlepšenie krvného tlaku, stravovacích návykov a dôvery vo vlastnú schopnosť zvládať ochorenie. Medzi účinné formy patrili telefonické intervencie a koučing vedený zdravotnými sestrami.', 'Zdravotní koučink u lidí s hypertenzí v souhrnu přinesl zlepšení krevního tlaku, stravovacích návyků a důvěry ve vlastní schopnost zvládat onemocnění. Mezi účinné formy patřily telefonické intervence a koučink vedený zdravotními sestrami.'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/36473304/', doi: '10.1016/j.ijnurstu.2022.104406',
  },
  {
    title: ['Aktívnejšie zapojenie pri cukrovke 2. typu', 'Aktivnější zapojení při cukrovce 2. typu'],
    citation: 'Wolever et al. · The Diabetes Educator · 2010',
    design: ['Randomizovaná štúdia · 56 pacientov · 14 telefonických stretnutí počas 6 mesiacov', 'Randomizovaná studie · 56 pacientů · 14 telefonických setkání během 6 měsíců'],
    finding: ['Koučovaná skupina mala oproti kontrolnej skupine menej vnímaných prekážok dodržiavania liečby a väčšie aktívne zapojenie. U koučovaných pacientov so zvýšeným vstupným HbA1c sa zlepšil aj tento ukazovateľ kontroly cukrovky.', 'Koučovaná skupina měla oproti kontrolní skupině méně vnímaných překážek dodržování léčby a větší aktivní zapojení. U koučovaných pacientů se zvýšeným vstupním HbA1c se zlepšil i tento ukazatel kontroly cukrovky.'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/20534872/', doi: '10.1177/0145721710371523',
  },
  {
    title: ['Všímavosť a relaxácia počas onkologickej liečby', 'Všímavost a relaxace během onkologické léčby'],
    citation: 'Carlson et al. · SIO–ASCO · Journal of Clinical Oncology · 2023',
    design: ['Odborné odporúčania vychádzajúce zo 110 relevantných štúdií', 'Odborná doporučení vycházející ze 110 relevantních studií'],
    finding: ['Odporúčania SIO–ASCO zahŕňajú vybrané postupy všímavosti a relaxácie na zmierňovanie príznakov úzkosti a depresie u dospelých počas onkologickej liečby. Ide o podporu psychického prežívania popri liečbe.', 'Doporučení SIO–ASCO zahrnují vybrané postupy všímavosti a relaxace ke zmírňování příznaků úzkosti a deprese u dospělých během onkologické léčby. Jde o podporu psychického prožívání vedle léčby.'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/37582238/', doi: '10.1200/JCO.23.00857',
  },
  {
    title: ['Psychosociálna podpora a prežívanie pri rakovine', 'Psychosociální podpora a přežití při rakovině'],
    citation: 'Asakawa-Haas et al. · Communications Psychology · 2026',
    design: ['Metaanalýza · 32 randomizovaných štúdií · 5 704 účastníkov', 'Metaanalýza · 32 randomizovaných studií · 5 704 účastníků'],
    finding: ['Autori zistili malý priaznivý priemerný účinok štruktúrovaných psychosociálnych intervencií poskytovaných popri lekárskej liečbe na prežívanie pacientov. Programy zahŕňali vzdelávanie, psychologické postupy a sociálnu podporu; účinky sa medzi štúdiami líšili a istota dôkazov bola stredná.', 'Autoři zjistili malý příznivý průměrný účinek strukturovaných psychosociálních intervencí poskytovaných vedle lékařské léčby na přežití pacientů. Programy zahrnovaly vzdělávání, psychologické postupy a sociální podporu; účinky se mezi studiemi lišily a jistota důkazů byla střední.'],
    url: 'https://pubmed.ncbi.nlm.nih.gov/41673256/', doi: '10.1038/s44271-026-00414-x',
  },
];

export default function TreatmentSupportResearch({ locale = 'sk' }: { locale?: SiteLocale }) {
  const index = locale === 'cs' ? 1 : 0;
  const c = (sk: string, cs: string) => index ? cs : sk;
  return (
    <section id="odborne-zdroje" className="belief-section support-research" aria-labelledby="support-evidence-title">
      <h2 id="support-evidence-title">{c('Prečo má psychická podpora', 'Proč má psychická podpora')} <em>{c('počas liečby význam?', 'během léčby význam?')}</em></h2>
      <p>{c('Odborné výskumy naznačujú, že vhodné formy psychologickej podpory, relaxácie a práce so stresom môžu niektorým pacientom pomôcť lepšie zvládať psychickú záťaž spojenú s liečbou.', 'Odborné výzkumy naznačují, že vhodné formy psychologické podpory, relaxace a práce se stresem mohou některým pacientům pomoci lépe zvládat psychickou zátěž spojenou s léčbou.')}</p>
      <p>{c('Tieto zistenia sa týkajú konkrétnych skúmaných postupov a automaticky nepotvrdzujú účinnosť individuálneho koučingu Mindbanger.', 'Tato zjištění se týkají konkrétních zkoumaných postupů a automaticky nepotvrzují účinnost individuálního koučinku Mindbanger.')}</p>
      <details id="odborne-vyskumy" className="support-research-details">
        <summary>{c('Pozrieť odborné zdroje a výskumy', 'Prohlédnout odborné zdroje a výzkumy')}</summary>
      <div className="support-study-list">
        {studies.map((study, number) => (
          <article className="support-study-row" key={study.doi} aria-labelledby={`support-study-${number}`}>
            <span className="support-study-number" aria-hidden="true">{String(number + 1).padStart(2, '0')}</span>
            <div className="support-study-content">
              <p className="support-study-type">{study.design[index]}</p>
              <h3 id={`support-study-${number}`}>{study.title[index]}</h3>
              <p>{study.finding[index]}</p>
              <p className="support-study-citation">{study.citation}</p>
            </div>
            <div className="support-study-source">
              <a className="personal-text-link" href={study.url} target="_blank" rel="noopener noreferrer" aria-label={`${c('Prečítať výskum', 'Přečíst výzkum')}: ${study.title[index]} (PubMed)`}>{c('Prečítať výskum', 'Přečíst výzkum')} ↗</a>
              <span>PubMed · DOI</span><span className="support-study-doi">{study.doi}</span>
            </div>
          </article>
        ))}
      </div>

        <div className="support-research-context"><p>{c('Výskumy podporujú zmysluplnosť odborne vedenej podpory popri liečbe. Skúmali však rôzne postupy pri konkrétnych diagnózach, často v zdravotníckom prostredí. Ich výsledky nemožno automaticky preniesť na každého človeka, jedno stretnutie ani na túto konkrétnu službu, ktorá nebola predmetom uvedených štúdií.', 'Výzkumy podporují smysluplnost odborně vedené podpory vedle léčby. Zkoumaly však různé postupy u konkrétních diagnóz, často ve zdravotnickém prostředí. Jejich výsledky nelze automaticky přenést na každého člověka, jedno setkání ani na tuto konkrétní službu, která nebyla předmětem uvedených studií.')}</p><p className="support-reviewed">{c('Zdroje overené 21. októbra 2026. Citácia výskumov neznamená odporúčanie tejto služby ich autormi ani odbornými spoločnosťami.', 'Zdroje ověřeny 21. října 2026. Citace výzkumů neznamená doporučení této služby jejich autory ani odbornými společnostmi.')}</p></div>
      </details>
      <aside className="support-evidence-note" aria-labelledby="support-scope-title">
        <h3 id="support-scope-title">{c('Dôležité pred spoluprácou', 'Důležité před spoluprací')}</h3>
        <p>{c('Opora počas liečby je nezdravotnícky koučing. Nenahrádza lekársku ani psychologickú starostlivosť a nemení odporúčania lekára či užívanie liekov. Nesľubujem uzdravenie, predĺženie života ani zvýšenie účinnosti liekov. Na rozhovore môžeš hovoriť aj o strachu, smútku či hneve — nemusíš byť stále pozitívny a za priebeh ochorenia nenesieš vinu svojím nastavením.', 'Opora během léčby je nezdravotnický koučink. Nenahrazuje lékařskou ani psychologickou péči a nemění doporučení lékaře či užívání léků. Neslibuji uzdravení, prodloužení života ani zvýšení účinnosti léků. Při rozhovoru můžeš mluvit i o strachu, smutku či hněvu — nemusíš být stále pozitivní a za průběh onemocnění neneseš vinu svým nastavením.')}</p>
      </aside>
    </section>
  );
}
