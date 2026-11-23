// Stable reporting codes keep service topics, query strings and private URLs out of Google.
export const serviceAnalyticsCodes:Record<string,string>={
 'rychly-rozhovor':'s10','znovu-si-ver':'s01','teenager-pod-tlakom':'s02','opora-pocas-liecby':'s03','vypni-hlavu':'s04',
 'mentalny-trening':'s05','relaxacia':'s06','individualny-coaching':'s07','zvladaj-stres':'s08','premiovy-mentalny-koucing':'s09',
};
export const analyticsPages:Record<string,{path:string;title:string;group:string}>={
 home:{path:'/',title:'Mindbanger',group:'home'},
 ...Object.fromEntries(Object.values(serviceAnalyticsCodes).map(id=>[id,{path:'/sluzby/'+id,title:'Mindbanger – služba '+id.toUpperCase(),group:'service'}])),
 program01:{path:'/program/p01',title:'Mindbanger – program P01',group:'program'},
 booking:{path:'/rezervacia',title:'Mindbanger – výber termínu',group:'booking'},
 booking_details:{path:'/rezervacia/dokoncenie',title:'Mindbanger – dokončenie žiadosti',group:'booking'},
 time_request:{path:'/ziadost-o-termin',title:'Mindbanger – dohoda termínu',group:'booking'},
 login:{path:'/prihlasenie',title:'Mindbanger – prihlásenie',group:'account_entry'},
 signup:{path:'/registracia',title:'Mindbanger – registrácia',group:'account_entry'},
 account_setup:{path:'/dokoncit-ucet',title:'Mindbanger – dokončenie účtu',group:'account_entry'},
 cookies:{path:'/cookies',title:'Mindbanger – cookies',group:'legal'},
 terms:{path:'/podmienky',title:'Mindbanger – podmienky',group:'legal'},
 account_terms:{path:'/podmienky-uctu',title:'Mindbanger – podmienky účtu',group:'legal'},
 privacy:{path:'/ochrana-udajov',title:'Mindbanger – ochrana údajov',group:'legal'},
};
export const analyticsSections=['rezervacny-kalendar','sluzby','ako-to-prebieha','o-mne','cennik','kontakt','co-ziskas','priebeh','prve-stretnutie','registracia','registracny-formular','program-sladke','odborne-zdroje','tvoj-priestor','certifikacie','balicky'];
export function analyticsPage(path:string){
 const locale=path==='/cz'||path.startsWith('/cz/')?'cs':'sk';
 const base=(locale==='cs'?path.slice(3)||'/':path).replace(/\/$/,'')||'/';
 const fixed:Record<string,string>={'/':'home','/produkty/chut-na-sladke':'program01','/rezervacia':'booking','/ucet/rezervovat':'booking_details','/ziadost-o-termin':'time_request','/prihlasenie':'login','/registracia':'signup','/dokoncit-ucet':'account_setup','/cookies':'cookies','/podmienky':'terms','/podmienky-uctu':'account_terms','/ochrana-udajov':'privacy'};
 const id=fixed[base]||(base.startsWith('/sluzby/')?serviceAnalyticsCodes[base.slice(8)]:undefined);
 const p=id&&analyticsPages[id];return p?{...p,id,locale,path:(locale==='cs'?'/cz':'')+(p.path==='/'&&locale==='cs'?'':p.path)}:null;
}
const codes=Object.values(serviceAnalyticsCodes),ids=Object.keys(analyticsPages);
export const analyticsEventRules:Record<string,Record<string,readonly(string|number)[]>>={
 navigation_click:{destination_id:[...ids,'account'],destination_section:['none',...analyticsSections],link_area:['header','footer','related','content'],link_kind:['page','section','contact','external']},
 section_view:{section:analyticsSections},scroll_depth:{percent_scrolled:[25,50,75,90]},active_time:{active_seconds:[10,30,60,120]},
 booking_start:{},booking_service_select:{service_code:codes},booking_slot_select:{},booking_review:{service_code:codes},booking_submit:{service_code:codes},booking_created:{service_code:codes},payment_start:{},
 booking_error:{error_kind:['unavailable','validation','server','network']},
 program_form_start:{},program_submit:{},generate_lead:{method:['program_interest']},program_interest_repeat:{},program_form_error:{error_kind:['validation','server','network']},
 faq_open:{},menu_open:{},video_start:{video_id:['intro']},video_progress:{video_id:['intro'],video_percent:[25,50,75]},video_complete:{video_id:['intro']},
};
export function cleanAnalyticsEvent(name:string,values:Record<string,unknown>={}){
 if(!Object.hasOwn(analyticsEventRules,name))return null;
 const rules=analyticsEventRules[name],clean:Record<string,string|number>={};
 for(const [key,allowed] of Object.entries(rules)){const value=values[key];if(!allowed.includes(value as string|number))return null;clean[key]=value as string|number;}
 return {name,values:clean};
}
