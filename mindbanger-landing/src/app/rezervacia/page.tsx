import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function BookingPage({ searchParams }: { searchParams: Promise<{sluzba?:string}> }) {
 const query=await searchParams;redirect('/ucet/rezervovat'+(query.sluzba?'?sluzba='+encodeURIComponent(query.sluzba):''));
}
