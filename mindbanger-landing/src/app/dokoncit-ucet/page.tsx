import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireClient } from '@/lib/client-context';
import { safeClientReturn } from '@/lib/client-platform';
import ClientProfileForm from '@/components/client/ClientProfileForm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dokončenie účtu | Mindbanger', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [context, query] = await Promise.all([requireClient(), searchParams]);
  const next = safeClientReturn(query.next);
  if (context.accepted) redirect(next);
  return <div className="client-site client-onboarding"><Link className="client-brand" href="/">mindbanger<span>PRIESTOR PRE VÁS</span></Link><main className="client-card"><p className="client-eyebrow">EŠTE JEDEN MALÝ KROK</p><h1>Dokončime váš <em>účet.</em></h1><p>Potvrďte údaje a podmienky bezplatného klientského účtu. Neaktivujete tým žiadne predplatné.</p><ClientProfileForm onboarding name={context.profile?.full_name || ''} email={context.user.email || ''} language={context.profile?.preferred_language || 'sk'} timezone={context.profile?.timezone || 'Europe/Bratislava'} next={next} /></main></div>;
}
