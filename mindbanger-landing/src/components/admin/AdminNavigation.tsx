'use client';
import './questionnaire-notifications.css';
import QuestionnaireNotifications from './QuestionnaireNotifications';
import BrandLogo from '@/components/BrandLogo';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
const base = '/mindbanger_daily/admin';
export default function AdminNavigation({ email }: { email: string }) {
  const path = usePathname();
  return <header className="admin-navigation"><a className="admin-skip-link" href="#admin-obsah">Preskočiť na obsah</a><BrandLogo className="admin-brand" href={`${base}/rezervacie`} account/><nav aria-label="Hlavná administrácia"><Link href={`${base}/klienti`} aria-current={path.startsWith(`${base}/klienti`) ? 'page' : undefined}>Karty klientov</Link><Link href={`${base}/rezervacie`} aria-current={path === `${base}/rezervacie` ? 'page' : undefined}>Kalendár a rezervácie</Link><Link href={`${base}/poziadavky-na-termin`} aria-current={path === `${base}/poziadavky-na-termin` ? 'page' : undefined}>Požiadavky na uvoľnenie termínu</Link><Link href={`${base}/programy`} aria-current={path.startsWith(`${base}/programy`) ? 'page' : undefined}>Online programy</Link><Link href={`${base}/bonusy`} aria-current={path.startsWith(`${base}/bonusy`) ? 'page' : undefined}>Bonusy a ponuky</Link><Link href={`${base}/marketing`} aria-current={path === `${base}/marketing` ? 'page' : undefined}>Marketing</Link><Link href={`${base}/dashboard`} aria-current={path === `${base}/dashboard` ? 'page' : undefined}>Mindbanger Daily</Link></nav><a className="reader-admin-link" href="/mindbanger_daily/admin/citatelia">Čitatelia kníh</a><QuestionnaireNotifications/><span className="admin-signed-in">{email}</span></header>;
}
