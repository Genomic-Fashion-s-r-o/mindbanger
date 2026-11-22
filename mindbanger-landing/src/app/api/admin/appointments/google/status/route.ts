import { NextResponse } from 'next/server';
import { bookingAdmin } from '@/lib/booking/admin';
import { googleMeetReadiness } from '@/lib/booking/google-meet';
export async function GET(){
 if(!await bookingAdmin())return NextResponse.json({error:'Vyžaduje sa správca s MFA.'},{status:401});
 try{return NextResponse.json(await googleMeetReadiness(),{headers:{'Cache-Control':'private, no-store'}});}catch{return NextResponse.json({ready:false,error:'Google kalendár sa nepodarilo overiť. Skontrolujte prepojenie.'},{status:503});}
}
