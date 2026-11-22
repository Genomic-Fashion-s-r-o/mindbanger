import Link from 'next/link';
import {bookingAdmin} from '@/lib/booking/admin';
import ProgramCampaigns from '@/components/admin/ProgramCampaigns';
export const dynamic='force-dynamic';
export default async function Page(){if(!await bookingAdmin())return <div><p>Prihlás sa ako správca a over druhý faktor.</p><Link className="personal-text-link" href="/mindbanger_daily/admin/dashboard">Overiť prihlásenie a druhý faktor ↗</Link><p>Po overení sa vráť na tento zoznam cez Marketing.</p></div>;return <ProgramCampaigns/>;}
