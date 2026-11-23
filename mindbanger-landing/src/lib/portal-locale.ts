export const portalLocales=['sk','cs','en'] as const;
export type PortalLocale=typeof portalLocales[number];
export const normalizeLocale=(value:unknown):PortalLocale=>value==='cs'||value==='en'?value:'sk';
export const localeTag=(locale:PortalLocale)=>({sk:'sk-SK',cs:'cs-CZ',en:'en-GB'})[locale];
export function resolvePortalLocale(path:string,cookie?:string|null,requested?:string|null,country?:string|null,browserLanguage?:string|null):PortalLocale{
 const bare=barePath(path);if(bare.startsWith('/mindbanger_daily/admin'))return 'sk';
 if(/^\/cz(?:\/|$)/.test(path))return 'cs';if(/^\/en(?:\/|$)/.test(path))return 'en';
 if(portalLocales.includes(requested as PortalLocale))return requested as PortalLocale;
 if(portalLocales.includes(cookie as PortalLocale))return cookie as PortalLocale;
 const region=country?.trim().toUpperCase();
 if(region==='SK')return 'sk';if(region==='CZ')return 'cs';
 if(region)return 'en';
 const first=browserLanguage?.split(',')[0]?.split(';')[0]?.split('-')[0]?.toLowerCase();
 return first==='sk'||first==='cs'?first:'en';
}
export function barePath(path:string){return path.replace(/^\/(cz|en)(?=\/|$)/,'')||'/';}
export function portalPath(path:string,locale:PortalLocale){
 if(!path.startsWith('/')||path.startsWith('//')||/^\/api(?:\/|$)/.test(path))return path;
 const bare=barePath(path);
 if(bare.startsWith('/mindbanger_daily/'))return bare;
 return locale==='sk'?bare:(locale==='cs'?'/cz':'/en')+(bare==='/'?'':bare);
}
