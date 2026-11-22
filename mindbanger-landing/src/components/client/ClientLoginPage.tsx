import {portalPath}from '@/lib/portal-locale';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { safeClientReturn } from '@/lib/client-platform';
import ClientLogin from './ClientLogin';
import { siteLocale } from '@/lib/site-locale-server';
export type LoginQuery={next?:string;redirect?:string;email?:string;metoda?:string;znova?:string};
export default async function ClientLoginPage({query,registration=false}:{query:LoginQuery;registration?:boolean}){
 const next=safeClientReturn(query.next||query.redirect),db=await createClient(),locale=await siteLocale();
 const {data:{user}}=await db.auth.getUser();
 // Redirect before rendering a form; explicit reauthentication remains available for password changes.
 if(user&&query.znova!=='1')redirect(portalPath(next,locale));
 return <ClientLogin registration={registration} next={portalPath(next,locale)} initialEmail={typeof query.email==='string'?query.email.slice(0,254):''} linkMode={query.metoda==='odkaz'} locale={locale}/>;
}
