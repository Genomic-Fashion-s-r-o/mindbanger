import 'server-only';
import {cookies,headers} from 'next/headers';
import {normalizeLocale,type PortalLocale} from './portal-locale';
export async function portalLocale(request?:Request):Promise<PortalLocale>{
 const h=request?.headers||await headers();
 if(h.get('x-site-locale'))return normalizeLocale(h.get('x-site-locale'));
 const cookie=(await cookies()).get('user-lang')?.value;
 if(cookie)return normalizeLocale(cookie);
 try{const path=new URL(h.get('referer')||'https://mindbanger.invalid').pathname;return path.startsWith('/en/')?'en':path.startsWith('/cz/')?'cs':'sk';}catch{return 'sk';}
}
