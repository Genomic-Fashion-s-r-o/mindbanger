import LegalPage from '@/components/personal/LegalPage';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cookies | Miroslav Jobus', alternates: { canonical: '/cookies' } };
export default function Page() { return <LegalPage kind="cookies" />; }
