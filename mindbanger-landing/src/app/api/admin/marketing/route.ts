import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bookingAdmin } from '@/lib/booking/admin';
import { sameOrigin } from '@/lib/booking/store';
import { getServiceSupabase } from '@/lib/supabase-service';
import { INTERNAL_MARKETING_EXCLUSIONS } from '@/lib/marketing-attribution';
import { SERVICE_CATALOG } from '@/lib/booking/catalog';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control':'private, no-store' };
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
export async function GET(request:Request) {
  if (!(await bookingAdmin())) return NextResponse.json({error:'Prihláste sa ako admin a overte druhý faktor.'},{status:401,headers});
  const url=new URL(request.url),from=day.safeParse(url.searchParams.get('from')),to=day.safeParse(url.searchParams.get('to'));
  if(!from.success||!to.success)return NextResponse.json({error:'Vyberte platné obdobie do 90 dní.'},{status:400,headers});
  const db=getServiceSupabase();
  const [report,campaigns]=await Promise.all([
    db.rpc('marketing_report',{p_from:from.data,p_to:to.data,p_excluded:INTERNAL_MARKETING_EXCLUSIONS}),
    db.from('marketing_campaigns').select('id,name,campaign_name,landing_path,source,active,is_test').order('created_at',{ascending:false}).limit(500),
  ]);
  if(report.error||campaigns.error)return NextResponse.json({error:report.error?.message?.includes('invalid_report_period')?'Obdobie musí byť v posledných 90 dňoch.':'Marketingový prehľad je dočasne nedostupný.'},{status:report.error?.message?.includes('invalid_report_period')?400:503,headers});
  return NextResponse.json({...report.data,campaigns:campaigns.data},{headers});
}
const destinations=['/',...SERVICE_CATALOG.map(s=>'/sluzby/'+s.id)];
const create=z.object({action:z.literal('create'),name:z.string().trim().min(2).max(80),campaignName:z.string().trim().max(80),source:z.enum(['facebook','instagram']),landing:z.string().refine(v=>destinations.includes(v)),isTest:z.boolean()}).strict();
const update=z.object({action:z.literal('active'),id:z.uuid(),active:z.boolean()}).strict();
export async function POST(request:Request) {
  if(!sameOrigin(request))return NextResponse.json({error:'Neplatný pôvod.'},{status:403,headers});
  if(!(await bookingAdmin()))return NextResponse.json({error:'Vyžaduje sa admin s druhým faktorom.'},{status:401,headers});
  if(Number(request.headers.get('content-length'))>2000)return NextResponse.json({error:'Príliš veľká požiadavka.'},{status:413,headers});
  try {
    const body=await request.json(),input=create.safeParse(body),change=update.safeParse(body),db=getServiceSupabase();
    if(input.success){const b=input.data;const {error}=await db.from('marketing_campaigns').insert({name:b.name,campaign_name:b.campaignName,source:b.source,landing_path:b.landing,is_test:b.isTest});if(error)throw error;}
    else if(change.success){const {error}=await db.from('marketing_campaigns').update({active:change.data.active}).eq('id',change.data.id);if(error)throw error;}
    else return NextResponse.json({error:'Skontrolujte názov reklamy, kampaň a cieľ odkazu.'},{status:400,headers});
    return NextResponse.json({ok:true},{headers});
  }catch{return NextResponse.json({error:'Odkaz sa nepodarilo uložiť.'},{status:503,headers});}
}
