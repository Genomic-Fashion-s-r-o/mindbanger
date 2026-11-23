'use client';
import Link from'next/link';
import type{ComponentProps}from'react';
import{useDictionary}from'@/components/LanguageProvider';
import{normalizeLocale,portalPath}from'@/lib/portal-locale';
import{localizedChildren}from'./PortalElement';
import{portalText}from'@/lib/portal-text';
export default function PortalLink({href,children,...props}:ComponentProps<typeof Link>){
 const locale=normalizeLocale(useDictionary().lang),target=typeof href==='string'?portalPath(href,locale):{...href,pathname:href.pathname?portalPath(href.pathname,locale):href.pathname};
 const translated={...props};for(const key of ['title','aria-label'] as const)if(typeof translated[key]==='string')translated[key]=portalText(translated[key]!,locale);
 return <Link {...translated} href={target}>{localizedChildren(children,locale)}</Link>;
}
