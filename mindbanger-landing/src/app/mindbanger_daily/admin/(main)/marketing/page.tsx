import MarketingDashboard from '@/components/admin/MarketingDashboard';
import Link from 'next/link';
export default async function MarketingPage({searchParams}:{searchParams:Promise<{from?:string;to?:string}>}) { const q=await searchParams;const valid=(v?:string)=>v&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:undefined; return <><p style={{padding:'20px 24px'}}><Link className="personal-text-link" href="/mindbanger_daily/admin/zaujemcovia">Záujemcovia: Chuť na sladké · November 2026 ↗</Link></p><MarketingDashboard initialFrom={valid(q.from)} initialTo={valid(q.to)}/></>; }
