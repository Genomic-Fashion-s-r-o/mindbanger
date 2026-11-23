import Link from 'next/link';
import MarketingBookingList from '@/components/admin/MarketingBookingList';
import { marketingListQuery } from '@/lib/marketing-drilldown';
export const dynamic='force-dynamic';
export default async function MarketingListPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const parsed=marketingListQuery.safeParse(await searchParams);
 if(!parsed.success)return <main className="marketing-dashboard"><h1>Neplatný filter</h1><p>Vráťte sa do prehľadu a zvoľte obdobie.</p><Link href="/mindbanger_daily/admin/marketing">Späť na marketing</Link></main>;
 return <MarketingBookingList {...parsed.data}/>;
}
