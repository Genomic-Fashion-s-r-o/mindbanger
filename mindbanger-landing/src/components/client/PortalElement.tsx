'use client';
import {Children,Fragment,cloneElement,createElement,isValidElement,type JSX,type ReactNode}from'react';
import {useDictionary}from'@/components/LanguageProvider';
import {normalizeLocale,portalPath,type PortalLocale}from'@/lib/portal-locale';
import {portalText}from'@/lib/portal-text';
export function localizedChildren(children:ReactNode,locale:PortalLocale):ReactNode{
 return Children.map(children,child=>typeof child==='string'?portalText(child,locale):isValidElement<{children?:ReactNode}>(child)&&child.type===Fragment?cloneElement(child,{},localizedChildren(child.props.children,locale)):child);
}
export function usePortalLocale(){return normalizeLocale(useDictionary().lang);}
export default function PortalElement<T extends keyof JSX.IntrinsicElements>({as,children,...props}:{as:T}&JSX.IntrinsicElements[T]){
 const locale=normalizeLocale(useDictionary().lang),translated={...props} as Record<string,unknown>;
 for(const key of ['title','placeholder','aria-label','alt'])if(typeof translated[key]==='string')translated[key]=portalText(translated[key] as string,locale);
 if(as==='a'&&typeof translated.href==='string')translated.href=portalPath(translated.href,locale);
 return createElement(as,translated,localizedChildren(children,locale));
}
