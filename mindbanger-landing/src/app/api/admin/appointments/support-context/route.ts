import {NextResponse} from 'next/server';import {z} from 'zod';
import {bookingAdmin} from '@/lib/booking/admin';
import {getSupportBooking,readSupportContext} from '@/lib/booking/support-context-store';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer'};
export async function GET(request:Request){if(!await bookingAdmin())return NextResponse.json({error:'Vyžaduje sa overený administrátorský prístup a druhý faktor.'},{status:401,headers});try{const id=new URL(request.url).searchParams.get('id');if(!z.uuid().safeParse(id).success)return NextResponse.json({error:'Neplatná rezervácia.'},{status:400,headers});const b=await getSupportBooking(id!);if(!b)return NextResponse.json({error:'Rezervácia sa nenašla.'},{status:404,headers});if(['cancelled','expired'].includes(b.status)||Date.parse(b.starts_at)+30*86400000<=Date.now())return NextResponse.json({context:null},{headers});return NextResponse.json({context:await readSupportContext(b.id,b.user_id)},{headers});}catch{return NextResponse.json({error:'Dôverný opis teraz nie je dostupný.'},{status:503,headers});}}
