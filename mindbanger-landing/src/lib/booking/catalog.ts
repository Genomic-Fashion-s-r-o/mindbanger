import type { Service } from './model';
export const DURATION_NOTICE='30 min predstavuje rezervačný blok s približne 25 minútami rozhovoru a 5 minútami prestávky. 1 h predstavuje rezervačný slot. Samotné stretnutie trvá približne 50 minút; zvyšný čas je prestávka medzi klientmi. Pri prémiovom koučingu je rezervačný slot 1,5 h a samotné stretnutie trvá približne 80 minút. Pri dlhších stretnutiach z balíka si zvolíš rezervačný čas po 30 minútach; samotný rozhovor je o 10 minút kratší.';
export const QUICK_CONVERSATION:Service={id:'rychly-rozhovor',name:'Rýchly rozhovor',price:26,minutes:25,slotMinutes:30,active:true,description:'Krátky online rozhovor na úvodné zoznámenie, ujasnenie spolupráce alebo konzultáciu jednej aktuálnej situácie.'};
export const SERVICE_CATALOG:Service[]=[
 QUICK_CONVERSATION,

 {id:'vypni-hlavu',name:'Vypni hlavu',price:49,minutes:50,slotMinutes:60,active:true,description:'Priestor na utriedenie myšlienok, spomalenie a hľadanie konkrétneho ďalšieho kroku.'},
 {id:'zvladaj-stres',name:'Zvládaj stres s väčším pokojom',price:49,minutes:50,slotMinutes:60,active:true,description:'Pomenuj zdroje záťaže a nájdi praktické kroky, ktoré ti pomôžu zvládať každodenné situácie.'},
 {id:'znovu-si-ver',name:'Znovu si ver',price:49,minutes:50,slotMinutes:60,active:true,description:'Preskúmaj svoje silné stránky, hranice a možnosti, o ktoré sa môžeš oprieť.'},
 {id:'individualny-coaching',name:'Nájdi svoj ďalší krok',price:49,minutes:50,slotMinutes:60,active:true,description:'Ujasni si rozhodnutie, smer alebo zmenu a pomenuj zvládnuteľný ďalší krok.'},
 {id:'teenager-pod-tlakom',name:'Teenager pod tlakom',price:49,minutes:50,slotMinutes:60,active:true,guardian:true,description:'Podporný nezdravotnícky rozhovor o tlaku, očakávaniach a každodenných výzvach. Koučing je určený mladým vo veku 13–19 rokov. Do 18 rokov rezervuje a platí zákonný zástupca zo svojho účtu a potvrdí súhlas s účasťou. Od 18 rokov si termín rezervuješ a platíš samostatne.'},
 {id:'mentalny-trening',name:'Myseľ víťaza',price:49,minutes:50,slotMinutes:60,active:true,description:'Mentálna príprava na výkon, práca so sústredením a vlastnými cieľmi.'},
 {id:'relaxacia',name:'Hlboká relaxácia',price:49,minutes:50,slotMinutes:60,active:true,description:'Vedená relaxácia, priestor na spomalenie a nácvik uvoľnenia.'},
 
 {"id":"opora-pocas-liecby","name":"Opora počas liečby","price":49,"minutes":50,"slotMinutes":60,"active":true,"description":"Individuálny nezdravotnícky koučing popri lekárskej starostlivosti. Priestor pre obavy, pokojnejší prístup a zvládnuteľné kroky v každodennom živote."},
 {id:'premiovy-mentalny-koucing',name:'Prémiový mentálny koučing',price:77,minutes:80,slotMinutes:90,active:true,description:'Predĺžený priestor na dôkladné preskúmanie témy a prípravu konkrétneho postupu.'},
];
export const LEGACY_PACKAGE_CATALOG=[
 {id:'program-zmena',name:'Program ZMENA',serviceId:'individualny-coaching',sessions:3,price:139,active:true,extras:'Individuálne cvičenia',description:'3 koučovacie hodiny a individuálne cvičenia.'},
 {id:'program-transformacia',name:'Program TRANSFORMÁCIA',serviceId:'individualny-coaching',sessions:6,price:259,active:true,extras:'Cvičenia a nahrávky',description:'6 koučovacích hodín, cvičenia a nahrávky.'},
 {id:'teenager-balik',name:'Teenager pod tlakom – balíček',serviceId:'teenager-pod-tlakom',sessions:4,price:179,active:true,extras:'',description:'4 samostatné koučovacie hodiny. Pre neplnoletého rezervuje zákonný zástupca.'},
 {id:'mysel-vitaza-balik',name:'Myseľ víťaza – balíček',serviceId:'mentalny-trening',sessions:4,price:179,active:true,extras:'',description:'4 samostatné koučovacie hodiny mentálnej prípravy.'},
 {id:'relaxacia-balik',name:'Hlboká relaxácia – balíček',serviceId:'relaxacia',sessions:4,price:179,active:true,extras:'',description:'4 individuálne relaxačné stretnutia.'},
];
export const TIME_CREDIT_PACKAGES=[
 {id:'koucing-3-hodiny',name:'3 hodiny koučingu',serviceId:'individualny-coaching',sessions:3,creditMinutes:180,validityMonths:12,price:135,active:true,extras:'',description:'Čas na rozhovor podľa tvojich potrieb. Termíny si vyberáš postupne; čas môžeš čerpať po 30 minútach, aj 2 h a viac po dohode.'},
 {id:'koucing-5-hodin',name:'5 hodín koučingu',serviceId:'individualny-coaching',sessions:5,creditMinutes:300,validityMonths:12,price:205,active:true,extras:'',description:'Viac priestoru na priebežnú podporu. Termíny si vyberáš postupne; čas môžeš čerpať po 30 minútach, aj 2 h a viac po dohode.'},
];
export const PACKAGE_CATALOG=[...LEGACY_PACKAGE_CATALOG.map(p=>({...p,active:false})),...TIME_CREDIT_PACKAGES];
export function durationLabel(minutes:number){return minutes===25?'30 min':new Intl.NumberFormat('sk-SK',{maximumFractionDigits:1}).format((minutes+10)/60)+' h';}
export function slotDuration(service:{minutes:number;slotMinutes?:number},buffer=10){return service.minutes===25&&service.slotMinutes===30?30:Math.max(service.slotMinutes||service.minutes+10,service.minutes+buffer);}
export function serviceUrl(serviceId:string,packageId='',startsAt='',entitlementId=''){
 return '/rezervacia?'+new URLSearchParams({sluzba:serviceId,...(packageId?{balik:packageId}:{}),...(startsAt?{termin:startsAt}:{}),...(entitlementId?{kredit:entitlementId}:{})}).toString();
}

export function sessionTimingNotice(service:{minutes:number;slotMinutes?:number},buffer=10,locale:'sk'|'cs'|'en'='sk'){
 const duration=durationLabel(service.minutes),slot=slotDuration(service,buffer);
 return locale==='cs'
  ? `${duration} představuje rezervační slot (${slot} minut). Samotné setkání trvá přibližně ${service.minutes} minut; zbývající čas je přestávka mezi klienty.`
  : `${duration} predstavuje rezervačný slot (${slot} minút). Samotné stretnutie trvá približne ${service.minutes} minút; zvyšný čas je prestávka medzi klientmi.`;
}

export const SERVICE_DISPLAY_ORDER=['rychly-rozhovor','znovu-si-ver','teenager-pod-tlakom','opora-pocas-liecby','vypni-hlavu','mentalny-trening','relaxacia','individualny-coaching','zvladaj-stres','premiovy-mentalny-koucing'] as const;
export function orderedServices<T extends {id:string}>(services:readonly T[]):T[]{const rank=new Map<string,number>(SERVICE_DISPLAY_ORDER.map((id,i)=>[id,i]));return [...services].sort((a,b)=>(rank.get(a.id)??rank.size)-(rank.get(b.id)??rank.size));}
