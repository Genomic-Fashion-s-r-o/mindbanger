export const COACHING = { id: 'individualny-coaching', name: 'Individuálny online coaching', minutes: 50, price: 49, active: true, description: 'Online rozhovor pre dospelých: utriedenie myšlienok, rozhodovanie, sústredenie a konkrétny ďalší krok.' } as const;
export const COACHING_TOPICS = [
  { id: 'znovu-si-ver', name: 'Znovu si ver' },
  { id: 'teenager-pod-tlakom', name: 'Teenager pod tlakom' },
  { id: 'opora-pocas-liecby', name: 'Opora počas liečby' },
  { id: 'vypni-hlavu', name: 'Vypni hlavu' },
  { id: 'mentalny-trening', name: 'Myseľ víťaza' },
  { id: 'relaxacia', name: 'Hlboká relaxácia' },
  { id: 'individualny-coaching', name: 'Nájdi svoj ďalší krok' },
  { id: 'zvladaj-stres', name: 'Zvládaj stres s väčším pokojom' },
  { id: 'premiovy-mentalny-koucing', name: 'Viac priestoru pre moju tému' },
  { id: 'pokojna-mysel', name: 'Pokojná myseľ' },
  { id: 'najdi-svoj-smer', name: 'Nájdi svoj smer' },
  { id: 'sila-sustredenia', name: 'Sila sústredenia' },
  { id: 'zivot-z-ineho-uhla', name: 'Život z iného uhla' },
  { id: 'zatial-neviem', name: 'Zatiaľ neviem – pomenujeme to spolu' },
] as const;
export const isCoachingTopic = (value: string) => COACHING_TOPICS.some(t => t.id === value);
const topicNamesCs:Record<string,string> = {"znovu-si-ver":"Znovu si věř","teenager-pod-tlakom":"Teenager pod tlakem","opora-pocas-liecby":"Opora během léčby","vypni-hlavu":"Vypni hlavu","mentalny-trening":"Mysl vítěze","relaxacia":"Hluboká relaxace","individualny-coaching":"Najdi svůj další krok","zvladaj-stres":"Zvládej stres s větším klidem","premiovy-mentalny-koucing":"Více prostoru pro mé téma","pokojna-mysel":"Klidná mysl","najdi-svoj-smer":"Najdi svůj směr","sila-sustredenia":"Síla soustředění","zivot-z-ineho-uhla":"Život z jiného úhlu","zatial-neviem":"Zatím nevím – pojmenujeme to společně"};
export const topicLabel = (value?: string | null,locale:'sk'|'cs'|'en'='sk') => (locale==='cs'&&value?topicNamesCs[value]:undefined) || COACHING_TOPICS.find(t => t.id === value)?.name || '';
export function resolveBookingTopic(value?:string,legacyService?:string){
 if(isCoachingTopic(value||''))return value!;
 return ['pokojna-mysel','najdi-svoj-smer','sila-sustredenia','zivot-z-ineho-uhla'].includes(legacyService||'')?legacyService!:'zatial-neviem';
}
export function withBookingTopic(path:string,topic?:string){
 if(!isCoachingTopic(topic||''))return path;
 const url=new URL(path,'https://mindbanger.invalid');url.searchParams.set('tema',topic!);return url.pathname+url.search+url.hash;
}
export const coachingUrl = (topic = '', startsAt = '') => '/rezervacia?' + new URLSearchParams({ sluzba: COACHING.id, ...(isCoachingTopic(topic) ? { tema: topic } : {}), ...(startsAt ? { termin: startsAt } : {}) }).toString();
