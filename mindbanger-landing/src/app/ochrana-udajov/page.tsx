import LegalPage from '@/components/personal/LegalPage';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ochrana osobných údajov | Miroslav Jobus', alternates: { canonical: '/ochrana-udajov' } };
export default function Page() { return <LegalPage kind="privacy" />; }
