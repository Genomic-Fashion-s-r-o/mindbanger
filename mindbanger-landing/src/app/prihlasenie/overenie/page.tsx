import {localizedClientMetadata}from '@/lib/portal-metadata';
import ClientMagicLogin from '@/components/client/ClientMagicLogin';
const baseMetadata = {title:'Prihlasujem ťa | Mindbanger',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export async function generateMetadata(){return localizedClientMetadata(baseMetadata);}
export default function Page(){return <ClientMagicLogin/>;}
