import LegalPage from '@/components/personal/LegalPage';
import { siteLocale } from '@/lib/site-locale-server';
export const dynamic = 'force-dynamic';
export async function generateMetadata(){const cs=(await siteLocale())==='cs';return {title:cs?'Podmínky setkání | Miroslav Jobus':'Podmienky stretnutí | Miroslav Jobus',alternates:{canonical:cs?'/cz/podmienky':'/podmienky',languages:{sk:'/podmienky','cs-CZ':'/cz/podmienky','x-default':'/podmienky'}}};}
export default function Page() { return <LegalPage kind="terms" />; }
