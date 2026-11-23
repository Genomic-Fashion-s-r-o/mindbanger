import 'server-only';
import type{Metadata}from'next';
import{portalLocale}from'./portal-locale-server';
import{portalText}from'./portal-text';
export async function localizedClientMetadata(base:{title:string;[key:string]:unknown}):Promise<Metadata>{const locale=await portalLocale();return{...base,title:portalText(base.title,locale),description:portalText(typeof base.description==='string'?base.description:'Tvoj účet, programy a bonusové materiály v Mindbangeri.',locale),...(base.openGraph?{openGraph:{...(base.openGraph as Record<string,unknown>),title:portalText(base.title,locale)}}:{})}as Metadata;}
