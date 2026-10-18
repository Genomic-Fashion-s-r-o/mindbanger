import LegalPage from '@/components/personal/LegalPage';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Podmienky stretnutí | Miroslav Jobus', alternates: { canonical: '/podmienky' } };
export default function Page() { return <LegalPage kind="terms" />; }
