import { NextResponse } from 'next/server';
import { bookingAdmin } from '@/lib/booking/admin';
import { getServiceSupabase } from '@/lib/supabase-service';
import { INTERNAL_MARKETING_EXCLUSIONS } from '@/lib/marketing-attribution';
import { marketingListQuery } from '@/lib/marketing-drilldown';
export const dynamic = 'force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
export async function GET(request:Request) {
 if(!(await bookingAdmin())) return NextResponse.json({error:'Prihláste sa ako admin a overte druhý faktor.'},{status:401,headers});
 const parsed=marketingListQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
 if(!parsed.success) return NextResponse.json({error:'Skontrolujte obdobie a filter zoznamu.'},{status:400,headers});
 const {from,to,metric,campaign,offset}=parsed.data;
 try {
  const {data,error}=await getServiceSupabase().rpc('marketing_booking_list',{p_from:from,p_to:to,p_metric:metric,p_campaign:campaign,p_offset:offset,p_excluded:INTERNAL_MARKETING_EXCLUSIONS});
  if(error) return NextResponse.json({error:error.message.includes('invalid_report_period')?'Obdobie musí byť v posledných 90 dňoch.':'Zoznam sa nepodarilo načítať.'},{status:error.message.includes('invalid_report_period')?400:503,headers});
  return NextResponse.json(data,{headers});
 } catch {return NextResponse.json({error:'Zoznam sa nepodarilo načítať.'},{status:503,headers});}
}
