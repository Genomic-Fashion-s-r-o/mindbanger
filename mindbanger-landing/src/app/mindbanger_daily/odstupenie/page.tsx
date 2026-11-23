import Link from 'next/link';
import {cookies} from 'next/headers';
import DailyWithdrawalForm from '@/components/legal/DailyWithdrawalForm';
export const metadata={title:'Odstúpenie od zmluvy | Mindbanger'};
export default async function Page(){const value=(await cookies()).get('user-lang')?.value;const locale=value==='cs'||value==='en'?value:'sk';const title=locale==='cs'?'Odstoupení od smlouvy':locale==='en'?'Withdraw from a contract':'Odstúpenie od zmluvy';return <div className="min-h-screen bg-slate-950 text-slate-200 py-20 px-6"><main className="max-w-2xl mx-auto"><Link href="/mindbanger_daily" className="text-amber-500">&larr; Mindbanger Daily</Link><h1 className="my-8 text-3xl md:text-5xl font-serif font-bold text-white">{title}</h1><DailyWithdrawalForm locale={locale}/></main></div>}
