import entries from '@/dictionaries/portal.json';
import {portalPath,type PortalLocale} from './portal-locale';
type Entry=[string,string,string];
const exact=new Map<string,Entry>();
for(const entry of entries as Entry[]){exact.set(entry[0],entry);if(entry[1])exact.set(entry[1],entry);}
const templates=(entries as Entry[]).filter(e=>e[0].includes('{0}')&&e[0].replace(/\{\d+\}/g,'').replace(/[^\p{L}]/gu,'').length>=2).sort((a,b)=>b[0].length-a[0].length).map(entry=>({entry,pattern:new RegExp('^'+entry[0].split(/(\{\d+\})/).map(s=>/^\{\d+\}$/.test(s)?'([\\s\\S]*?)':s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')+'$')}));
export function portalText(source:string,locale:PortalLocale):string{
 const raw=source.trim(),core=raw.replace(/\s+/g,' ');if(!core)return source;
 const entry=exact.get(core),index=locale==='sk'?0:locale==='cs'?1:2;
 if(entry)return source.replace(raw,()=>entry[index]||entry[0]);
 for(const {entry,pattern}of templates){const match=core.match(pattern);if(match)return source.replace(raw,()=>(entry[index]||entry[0]).replace(/\{(\d+)\}/g,(_,n)=>match[Number(n)+1]||''));}
 return source;
}
export function portalHtml(html:string,locale:PortalLocale){return html.replace(/>([^<>]+)</g,(_,text:string)=>'>'+portalText(text,locale)+'<').replace(/href="(\/[^"]*)"/g,(_,path:string)=>'href="'+portalPath(path,locale)+'"').replace(/href="https:\/\/(?:www\.)?mindbanger\.com(\/[^"]*)"/g,(_,path:string)=>'href="https://www.mindbanger.com'+portalPath(path,locale)+'"').replace(/<html lang="[^"]*"/, '<html lang="'+locale+'"');}
