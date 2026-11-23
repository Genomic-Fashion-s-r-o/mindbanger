import {localizedClientMetadata}from '@/lib/portal-metadata';
import TeenQuestionnaire from '@/components/client/TeenQuestionnaire';
const baseMetadata = {title:'Tvoj súkromný dotazník | Mindbanger',robots:{index:false,follow:false}};
export async function generateMetadata(){return localizedClientMetadata(baseMetadata);}
export default function Page(){return <TeenQuestionnaire/>;}
