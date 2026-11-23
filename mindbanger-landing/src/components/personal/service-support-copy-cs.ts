import type { ServiceSalesCopy } from './service-sales-copy';

// Service-specific support and practical questions for the Czech sales pages.
export const serviceSupportCopyCs: Record<string, Partial<ServiceSalesCopy>> = {
  'mentalny-trening': {
    eyebrow: 'MYSL VÍTĚZE · MENTÁLNÍ PŘÍPRAVA NA VÝKON',
    guideIntro: 'Jako sportovní trenér znám úsilí, které stojí za výkonem. Na setkání se budu věnovat tobě: očekáváním, obavám i tomu, co už funguje. Společně připravíme postup a vyzkoušíme si ho na situaci, která tě čeká.',
    quote: 'Společně najdeme, o co se můžeš opřít, když na výkonu záleží.',
    benefitsHeading: ['Opři se o svou přípravu.', 'Vytvoříme tvou vlastní rutinu.'],
    benefitsIntro: 'Konkrétní příprava pro chvíle před výkonem, během něj i po chybě.',
    benefits: [
      ['PŘED VÝKONEM', 'Vím, jak začnu.', 'Připravíme krátkou rutinu: kam zaměříš pozornost a co si připomeneš před startem.'],
      ['BĚHEM VÝKONU', 'Vracím se ke svému úkolu.', 'Najdeme vlastní slova nebo jednoduchý podnět, který ti pomůže vrátit pozornost k tomu, co právě děláš.'],
      ['PO CHYBĚ', 'Mám postup pro další pokus.', 'Vyzkoušíme si, jak chybu zaznamenat, obnovit soustředění a zapojit se do další situace.'],
    ],
    faq: [
      ['Je to jen pro vrcholové sportovce?', 'Pracovat můžeme se soutěžním i rekreačním sportem, zkouškou, prezentací nebo pracovním výkonem. Přines situaci, na které ti záleží.'],
      ['Co si připravíme pro můj nejbližší výkon?', 'Společně připravíme rutinu před startem, návrat k úkolu a reakci po chybě. Odneseš si konkrétní podněty, které můžeš zkoušet v praxi.'],
    ],
    finalIntro: 'Vyber si termín. Společně připravíme tvůj postup pro chvíli, na které záleží.',
  },
  'vypni-hlavu': {
    eyebrow: 'VYPNI HLAVU · PROSTOR PRO MYŠLENKY A ODSTUP',
    guideIntro: 'Dostaneš čas vyslovit i myšlenky, které se ti míchají dohromady. Budu naslouchat, ptát se a pomáhat ti oddělit podstatné. Společně vybereme, čemu chceš věnovat energii a co může zatím počkat.',
    quote: 'Na chvíli nemusíš držet všechno sám. Společně tomu dáme srozumitelnější tvar.',
    benefitsHeading: ['Dej myšlenkám prostor.', 'Najdeme, co potřebuješ právě teď.'],
    benefits: [
      ['ODSTUP', 'Vidím, co se mi v hlavě děje.', 'Pojmenujeme myšlenky, které se opakují, a podíváme se na to, co od tebe právě žádají.'],
      ['PRIORITY', 'Rozlišuji podstatné od hluku.', 'Oddělíme to, co můžeš ovlivnit, od toho, co teď nepotřebuje tvou energii.'],
      ['VLASTNÍ POSTUP', 'Mám se k čemu vrátit.', 'Vyzkoušíme jednoduchý postup práce s pozorností a vybereme, jak ho zapojíš do svého dne.'],
    ],
    faq: [
      ['Co když mi myšlenky stále odbíhají?', 'Pomohu ti zpomalit, pojmenovat, co se opakuje, a vyzkoušet způsob, jak vrátit pozornost k tomu, co si vybereš.'],
      ['Jak se liší od Hluboké relaxace?', 'Tady je hlavním nástrojem rozhovor a utřídění myšlenek. Hluboká relaxace se zaměřuje především na individuálně vedený odpočinek.'],
    ],
  },
  relaxacia: {
    eyebrow: 'HLUBOKÁ RELAXACE · INDIVIDUÁLNĚ VEDENÝ ODPOČINEK',
    guideIntro: 'O vedení se postarám já. Vysvětlím každý krok a průběžně se dohodneme, co ti vyhovuje. Ty dostaneš čas věnovat pozornost sobě a objevovat, při čem se ti dobře odpočívá.',
    quote: 'Nikde nemusíme spěchat. Budeme hledat způsob odpočinku, který odpovídá tobě.',
    benefitsHeading: ['Dopřej si vlastní chvíli.', 'Vedením tě provedu já.'],
    benefits: [
      ['POHODLÍ', 'Vím, co bude následovat.', 'Nejprve vysvětlím postup a dohodneme, co chceš vyzkoušet. Kdykoli můžeš změnit polohu nebo se ozvat.'],
      ['VEDENÝ ODPOČINEK', 'Mám prostor povolit.', 'Provedu tě prací s dechem, pozorností nebo představivostí. Tempo přizpůsobíme tomu, co ti je příjemné.'],
      ['VLASTNÍ ZKUŠENOST', 'Poznávám, co mi vyhovuje.', 'Pojmenujeme, které prvky odpočinku ti sedí a ke kterým se chceš vrátit i ve vlastním čase.'],
    ],
    faq: [
      ['Jak začneme, pokud jsem relaxaci ještě nezkoušel?', 'Vysvětlíme si průběh, najdeme pohodlnou polohu a projdeme jednoduché kroky. Když myšlenky odbíhají, pomohu ti vrátit pozornost.'],
      ['Mohu mít otevřené oči nebo cvičení přerušit?', 'Ano. Můžeš mluvit, měnit polohu, nechat oči otevřené i kdykoli přestat. Případné hypnotické techniky nejprve vysvětlím a dohodneme tvůj souhlas.'],
    ],
    finalIntro: 'Vyber si svůj čas. O provázení se postarám já.',
  },
  'individualny-coaching': {
    eyebrow: 'NAJDI SVŮJ DALŠÍ KROK · ROZHODNUTÍ A ŽIVOTNÍ ZMĚNY',
    guideIntro: 'Budu při tobě, když budeš své možnosti potřebovat vyslovit, porovnat a promyslet. Pomohu ti rozlišit vlastní přání od očekávání okolí a připravit krok, za kterým dokážeš stát.',
    quote: 'Společně najdeme krok, kterému budeš věřit ty.',
    benefits: [
      ['PRIORITY', 'Vím, na čem mi záleží.', 'Pojmenujeme tvé potřeby, hodnoty a to, co má pro tebe při rozhodování největší váhu.'],
      ['MOŽNOSTI', 'Vidím více než jednu cestu.', 'Prozkoumáme možnosti, překážky i zdroje. Oddělíme vlastní přání od očekávání okolí.'],
      ['ZAČÁTEK', 'Mám konkrétní další krok.', 'Připravíme zvládnutelný krok, termín jeho vyzkoušení a to, o co se při něm opřeš.'],
    ],
    faq: [
      ['Musím už vědět, co chci změnit?', 'I ujasnění tématu může být prvním krokem. Začneme tím, co ve tvém životě právě přestává dávat smysl nebo si žádá pozornost.'],
      ['Pomůžeš mi porovnat možnosti?', 'Podíváme se na přínosy, obavy i praktické dopady jednotlivých cest. Pomohu ti najít vlastní důvody a připravit další krok.'],
    ],
  },
  'zvladaj-stres': {
    eyebrow: 'ZVLÁDEJ STRES S VĚTŠÍM KLIDEM · OPORA A HRANICE',
    guideIntro: 'Vyslechnu si, co neseš a kde už potřebuješ více prostoru pro sebe. Společně připravíme konkrétní slova pro hranice, dohodu o prioritách nebo klidnější reakci. Budeš mít oporu i při zkoušení toho, co se ti dosud říkalo těžko.',
    quote: 'I tvé potřeby mají váhu. Společně pro ně najdeme místo.',
    benefits: [
      ['PŘEHLED', 'Vím, co mě vyčerpává.', 'Rozlišíme zdroje zátěže, tvé reakce a to, co máš možnost ovlivnit.'],
      ['HRANICE', 'Umím říct, co potřebuji.', 'Připravíme konkrétní slova pro odmítnutí požadavku, dohodu o prioritách nebo důležitý rozhovor.'],
      ['REAKCE', 'Mám postup pro náročnou chvíli.', 'Vyzkoušíme způsob, jak vytvořit odstup před reakcí a vrátit pozornost k tomu, co potřebuješ.'],
    ],
    faq: [
      ['Co si odnesu pro náročné chvíle?', 'Vybereme jednu opakující se situaci a připravíme pro ni vlastní postup: krátké zastavení, pojmenování priority nebo slova pro hranici. Vyzkoušíme si ho společně.'],
      ['Budeme mluvit o práci nebo i o osobním životě?', 'Téma vybereme podle toho, co řešíš. Mohou to být pracovní požadavky, vztahy, vlastní očekávání nebo jejich propojení.'],
    ],
  },
  'premiovy-mentalny-koucing': {
    eyebrow: 'PRÉMIOVÝ MENTÁLNÍ KOUČINK · VÍCE ČASU PRO TVÉ TÉMA',
    guideIntro: 'Dostaneš mou plnou pozornost a čas jít ve svém tématu do hloubky. Společně propojíme souvislosti, zastavíme se u podstatného a vyzkoušíme konkrétní rozhovor, rozhodnutí nebo reakci. Pomohu ti proměnit uvědomění v postup do života.',
    quote: 'Společně propojíme to, co si uvědomíš, s tím, co chceš skutečně udělat.',
    benefits: [
      ['SOUVISLOSTI', 'Vidím, co spolu souvisí.', 'Důkladněji prozkoumáme tvé potřeby, přesvědčení, možnosti i překážky jednoho tématu.'],
      ['VYZKOUŠENÍ', 'Ověřuji si jinou možnost.', 'Podle dohody zapojíme přípravu rozhovoru, práci s představivostí nebo nácvik konkrétní reakce.'],
      ['POSTUP', 'Vím, jak chci pokračovat.', 'Pojmenujeme kroky, oporu i možné překážky, abys měl vlastní srozumitelný postup do dalších dní.'],
    ],
    faq: [
      ['Čím se liší od běžného setkání?', 'Rezervační blok je 1,5 h a samotné setkání trvá přibližně 80 minut. Máme více času na souvislosti jednoho tématu i praktický nácvik.'],
      ['Znamená prémiový koučink dlouhodobý program?', 'Jde o jedno rozšířené individuální setkání. O případném pokračování rozhodneš podle svých potřeb.'],
    ],
  },
  'znovu-si-ver': {
    eyebrow: 'ZNOVU SI VĚŘ · INDIVIDUÁLNÍ ONLINE KOUČINK',
    guideIntro: 'Vyslechnu tě a pomohu ti všimnout si schopností, které pochybnosti často zastíní. Společně připravíme slova pro důležitý rozhovor, tvou hranici nebo rozhodnutí. Na setkání si je můžeš vyzkoušet s mou oporou.',
    quote: 'Společně budeme hledat řešení, kterým budeš věřit ty.',
    benefits: [
      ['TVÉ SILNÉ STRÁNKY', 'Vím, o co se opřít.', 'Pojmenujeme tvé schopnosti a zvládnuté situace. Konkrétní důvody věřit si, ke kterým se můžeš vracet.'],
      ['TVŮJ HLAS', 'Umím říct, co potřebuji.', 'Připravíme slova pro důležitý rozhovor, vlastní názor nebo hranici. Tak, aby ses s nimi dokázal ztotožnit.'],
      ['DALŠÍ KROK', 'Vím, čím začnu.', 'Společně připravíme zvládnutelný krok, na kterém můžeš začít sbírat vlastní zkušenost: tohle dokážu.'],
    ],
    faq: [
      ['Co když nevím, jak začít?', 'Stačí říct, že nevíš, kde začít. Pomohu ti otázkami a společně vybereme jednu situaci, ve které si chceš více věřit.'],
      ['Můžeme si důležitý rozhovor vyzkoušet?', 'Ano. Připravíme si slova pro tvůj názor, prosbu nebo hranici. Vyzkoušíš si je nahlas a upravíme je tak, aby ti seděla.'],
    ],
  },
};
