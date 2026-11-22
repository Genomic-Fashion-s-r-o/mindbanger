import {localizedClientMetadata}from '@/lib/portal-metadata';
import ClientLoginPage, { type LoginQuery } from '@/components/client/ClientLoginPage';
const baseMetadata = { title: 'Prihlásenie | Mindbanger', robots: { index: false, follow: false } };
export async function generateMetadata(){return localizedClientMetadata(baseMetadata);}
export default async function Page({searchParams}:{searchParams:Promise<LoginQuery>}) { return <ClientLoginPage query={await searchParams}/>; }
