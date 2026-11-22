import LegalPage from '@/components/personal/LegalPage';
import { siteLocale } from '@/lib/site-locale-server';
export const dynamic = 'force-dynamic';
export async function generateMetadata(){const cs=(await siteLocale())==='cs';return {title:cs?'Ochrana osobních údajů | Miroslav Jobus':'Ochrana osobných údajov | Miroslav Jobus',alternates:{canonical:cs?'/cz/ochrana-udajov':'/ochrana-udajov',languages:{sk:'/ochrana-udajov','cs-CZ':'/cz/ochrana-udajov','x-default':'/ochrana-udajov'}}};}
export default function Page() { return <LegalPage kind="privacy" />; }
