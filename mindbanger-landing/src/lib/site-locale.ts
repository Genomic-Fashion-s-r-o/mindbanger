import type { BookingSettings } from './booking/model';

export type SiteLocale = 'sk' | 'cs' | 'en';
export type SiteCurrency = 'eur' | 'czk';

export const CZECH_PREFIX = '/cz';
export const CZECH_PRICE_RATIO = 1990 / 49;

const serviceCs: Record<string, { name: string; description: string }> = {
  'rychly-rozhovor': {name:'Rychlý rozhovor',description:'Krátký online rozhovor na úvodní seznámení, ujasnění spolupráce nebo konzultaci jedné aktuální situace.'},
  'vypni-hlavu': { name: 'Vypni hlavu', description: 'Prostor pro utřídění myšlenek, zpomalení a nalezení konkrétního dalšího kroku.' },
  'zvladaj-stres': { name: 'Zvládej stres s větším klidem', description: 'Pojmenuj zdroje zátěže a najdi praktické kroky, které ti pomohou zvládat každodenní situace.' },
  'znovu-si-ver': { name: 'Znovu si věř', description: 'Prozkoumej své silné stránky, hranice a možnosti, o které se můžeš opřít.' },
  'individualny-coaching': { name: 'Najdi svůj další krok', description: 'Ujasni si rozhodnutí, směr nebo změnu a pojmenuj zvládnutelný další krok.' },
  'teenager-pod-tlakom': { name: 'Teenager pod tlakem', description: 'Podpůrný nezdravotnický rozhovor o tlaku, očekáváních a každodenních výzvách. Koučink je určen mladým ve věku 13–19 let. Do 18 let rezervuje a platí zákonný zástupce ze svého účtu a potvrdí souhlas s účastí. Od 18 let si termín rezervuješ a platíš samostatně.' },
  'mentalny-trening': { name: 'Mysl vítěze', description: 'Mentální příprava na výkon, práce se soustředěním a vlastními cíli.' },
  relaxacia: { name: 'Hluboká relaxace', description: 'Vedená relaxace, prostor pro zpomalení a nácvik uvolnění.' },
  'opora-pocas-liecby': { name: 'Opora během léčby', description: 'Individuální nezdravotnický koučink vedle lékařské péče. Prostor pro obavy, klidnější přístup a zvládnutelné kroky v každodenním životě.' },
  'premiovy-mentalny-koucing': { name: 'Prémiový mentální koučink', description: 'Prodloužený prostor pro důkladné prozkoumání tématu a přípravu konkrétního postupu.' },
};

const packageCs: Record<string, { name: string; description: string; extras: string }> = {
  'koucing-3-hodiny':{name:'3 hodiny koučinku',description:'Čas na rozhovor podle tvých potřeb. Termíny si vybíráš postupně; čas můžeš čerpat po 30 minutách, také 2 h a více po domluvě.',extras:''},
  'koucing-5-hodin':{name:'5 hodin koučinku',description:'Více prostoru pro průběžnou podporu. Termíny si vybíráš postupně; čas můžeš čerpat po 30 minutách, také 2 h a více po domluvě.',extras:''},
  'program-zmena': { name: 'Program ZMĚNA', description: '3 koučovací hodiny a individuální cvičení.', extras: 'Individuální cvičení' },
  'program-transformacia': { name: 'Program TRANSFORMACE', description: '6 koučovacích hodin, cvičení a nahrávky.', extras: 'Cvičení a nahrávky' },
  'teenager-balik': { name: 'Teenager pod tlakem – balíček', description: '4 samostatné koučovací hodiny. Pro nezletilého rezervuje zákonný zástupce.', extras: '' },
  'mysel-vitaza-balik': { name: 'Mysl vítěze – balíček', description: '4 samostatné koučovací hodiny mentální přípravy.', extras: '' },
  'relaxacia-balik': { name: 'Hluboká relaxace – balíček', description: '4 individuální relaxační setkání.', extras: '' },
};

export function czkPrice(eurPrice: number) {
  if (eurPrice === 49) return 1990;
  return Math.round((eurPrice * CZECH_PRICE_RATIO) / 10) * 10;
}

export function localizeSettings(settings: BookingSettings, locale: SiteLocale): BookingSettings {
  if (locale !== 'cs') return { ...settings, locale, currency: 'eur' };
  return {
    ...settings,
    locale: 'cs',
    currency: 'czk',
    services: settings.services.map(service => ({
      ...service,
      ...(serviceCs[service.id] || {}),
      price: czkPrice(service.price),
    })),
    packages: settings.packages.map(pack => ({
      ...pack,
      ...(packageCs[pack.id] || {}),
      price: czkPrice(pack.price),
    })),
  };
}

export function localizedPath(path: string, locale: SiteLocale) {
  if (locale === 'sk' || !path.startsWith('/') || path.startsWith('/api/') || /^\/(cz|en)(?:\/|$)/.test(path)) return path;
  return `${locale==='cs'?CZECH_PREFIX:'/en'}${path}`;
}

export function stripLocalePrefix(path: string) {
  return path.replace(/^\/(cz|en)(?=\/|$)/,'')||'/';
}

