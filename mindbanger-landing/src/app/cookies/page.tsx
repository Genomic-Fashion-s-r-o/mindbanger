import LegalPage from '@/components/personal/LegalPage';
import { siteLocale } from '@/lib/site-locale-server';
export const dynamic = 'force-dynamic';
export async function generateMetadata(){const cs=(await siteLocale())==='cs';return {title:'Cookies | Miroslav Jobus',alternates:{canonical:cs?'/cz/cookies':'/cookies',languages:{sk:'/cookies','cs-CZ':'/cz/cookies','x-default':'/cookies'}}};}
export default function Page() { return <LegalPage kind="cookies" />; }
