import {NextResponse,after} from 'next/server';
import {processTimeRequestMail} from '@/lib/time-request-mail';
import {sameOrigin, getBookingSettings} from '@/lib/booking/store';
import {localizeSettings} from '@/lib/site-locale';
import {getServiceSupabase} from '@/lib/supabase-service';
import {timeRequestSchema} from '@/lib/time-request-model';
import {timeRequestBucket} from '@/lib/time-request-store';
export const dynamic='force-dynamic';
export const maxDuration=45;
const headers={'Cache-Control':'no-store'};
export async function POST(request:Request) {
  if(!sameOrigin(request)) return NextResponse.json({error:'Neplatný pôvod požiadavky.'},{status:403,headers});
  try {
    if(Number(request.headers.get('content-length'))>8000) return NextResponse.json({error:'Príliš veľká požiadavka.'},{status:413,headers});
    const raw=await request.text();
    if(Buffer.byteLength(raw)>8000) return NextResponse.json({error:'Príliš veľká požiadavka.'},{status:413,headers});
    const parsed=timeRequestSchema.safeParse(JSON.parse(raw));
    if(!parsed.success) return NextResponse.json({error:'Skontroluj meno, email, telefón a označ aspoň jedno časové pásmo.'},{status:400,headers});
    const b=parsed.data;
    if(b.website) return NextResponse.json({ok:true},{headers});
    const config=await getBookingSettings(),settings=localizeSettings(config.settings,b.locale);
    const service=settings.services.find(s=>s.id===b.serviceId&&s.active);
    if(b.serviceId&&!service) return NextResponse.json({error:'Vyber aktuálnu službu alebo možnosť „Zatiaľ nemám vybrané“.'},{status:400,headers});
    const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    const {data,error}=await getServiceSupabase().rpc('appointment_time_request_submit',{
      p_key:b.requestId,p_first:b.firstName,p_last:b.lastName,p_email:b.email,p_phone:b.phone,
      p_windows:timeWindowsSorted(b.windows),p_note:b.note,p_service:service?.id||'',p_service_name:service?.name||'',p_locale:b.locale,p_bucket:timeRequestBucket(ip),
    });
    if(error?.message?.includes('request_key_conflict')) return NextResponse.json({error:'Požiadavka s týmto potvrdením už bola prijatá. Obnov formulár pre novú žiadosť.'},{status:409,headers});
    if(error) throw Error('request_store_unavailable');
    if(!data) return NextResponse.json({error:'Príliš veľa požiadaviek. Skús to o hodinu alebo mi napíš email.'},{status:429,headers});
    // The insert trigger durably queued both receipts; failures must not undo an accepted request.
    if(process.env.BREVO_API_KEY)after(async()=>{try{await processTimeRequestMail(b.requestId);}catch{console.warn('time_request_mail_deferred');}});
    return NextResponse.json({ok:true},{headers});
  } catch(e) {return NextResponse.json({error:'Požiadavku sa nepodarilo uložiť. Skús to znova o chvíľu.'},{status:e instanceof SyntaxError?400:503,headers});}
}
function timeWindowsSorted(windows:string[]) {return ['morning','afternoon','evening'].filter(w=>windows.includes(w));}
