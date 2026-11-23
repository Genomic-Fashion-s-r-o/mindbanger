import {NextResponse,after} from 'next/server';
import {tryMobilePush} from '@/lib/admin-mobile/push';
import {createHmac} from 'node:crypto';
import {z} from 'zod';
import {sameOrigin} from '@/lib/booking/store';
import {getServiceSupabase} from '@/lib/supabase-service';
import {interestBucket,interestHash,interestToken} from '@/lib/program-interest';
import {processProgramWelcome} from '@/lib/program-welcome';
export const dynamic='force-dynamic';
export const maxDuration=30;
const schema=z.object({email:z.email().trim().toLowerCase().max(254),consent:z.literal(true),website:z.string().max(100).default('')}).strict();
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 if(!sameOrigin(request))return NextResponse.json({error:'Neplatný pôvod požiadavky.'},{status:403,headers});
 if(Number(request.headers.get('content-length'))>2000)return NextResponse.json({error:'Príliš veľká požiadavka.'},{status:413,headers});
 try{const b=schema.safeParse(await request.json());if(!b.success)return NextResponse.json({error:'Zadaj platný email a potvrď súhlas.'},{status:400,headers});if(b.data.website)return NextResponse.json({ok:true},{headers});
 const unsubscribe=interestToken(),ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const {data,error}=await getServiceSupabase().rpc('program_interest_register_welcome',{p_email:b.data.email,p_unsubscribe:interestHash(unsubscribe),p_bucket:interestBucket(ip)});if(error)throw error;
 if(!data?.ok)return NextResponse.json({error:'Príliš veľa pokusov. Skús to o hodinu znova.'},{status:429,headers});
 try{await processProgramWelcome(data.interestId);}catch{console.warn('program_welcome_pending');}
 // Opaque receipt is used only for browser-local duplicate suppression, never sent to GA.
 let analyticsReceipt:string|undefined;
 try{const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(key&&typeof data.interestId==='string')analyticsReceipt=createHmac('sha256',key).update('program-interest:'+data.interestId).digest('hex');}catch{/* Optional analytics cannot change a saved registration. */}
 after(tryMobilePush);
 return NextResponse.json({ok:true,analyticsReceipt},{headers});
 }catch{return NextResponse.json({error:'Registráciu sa nepodarilo dokončiť. Skús to o minútu znova alebo napíš na miroslav@mindbanger.com.'},{status:503,headers});}
}
