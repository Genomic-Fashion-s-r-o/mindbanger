import {localizedClientMetadata}from '@/lib/portal-metadata';
import ClientLoginPage, { type LoginQuery } from '@/components/client/ClientLoginPage';
const baseMetadata = { title: 'Vytvoriť účet | Mindbanger', robots: { index: false, follow: false } };
export async function generateMetadata(){return localizedClientMetadata(baseMetadata);}
export default async function Page({searchParams}:{searchParams:Promise<LoginQuery>}) { return <ClientLoginPage registration query={await searchParams}/>; }
