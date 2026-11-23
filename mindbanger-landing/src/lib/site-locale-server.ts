import 'server-only';
import { headers } from 'next/headers';
import type { SiteLocale } from './site-locale';

export async function siteLocale(): Promise<SiteLocale> {
  const value=(await headers()).get('x-site-locale');return value==='cs'||value==='en'?value:'sk';
}

