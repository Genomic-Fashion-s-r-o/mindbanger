import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {bookingAdmin} from '@/lib/booking/admin';
import {sameOrigin} from '@/lib/booking/store';
import {getServiceSupabase} from '@/lib/supabase-service';
import {zoomCredentialsSchema,checkZoomCredentials,sealZoom,zoomConnection,zoomReadiness} from '@/lib/booking/zoom-connection';
import {testZoom} from '@/lib/booking/zoom-meet';
export const maxDuration=120;
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 if(!await bookingAdmin())return NextResponse.json({error:'Vyžaduje sa správca s MFA.'},{status:401,headers});
 try{const status=await zoomReadiness();const {count,error}=await getServiceSupabase().from('appointment_zoom_meetings').select('appointment_id',{count:'exact',head:true}).eq('state','review');if(error)throw error;return NextResponse.json({...status,reviewCount:count||0},{headers});}
 catch{return NextResponse.json({error:'Zoom prepojenie sa nepodarilo overiť.'},{status:503,headers});}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Neplatná požiadavka.'},{status:403,headers});
 if(!await bookingAdmin())return NextResponse.json({error:'Vyžaduje sa správca s MFA.'},{status:401,headers});
 try{
  const raw=await request.text();if(raw.length>2000)return NextResponse.json({error:'Príliš veľká požiadavka.'},{status:413,headers});
  const body=JSON.parse(raw),db=getServiceSupabase();
  if(body.action==='connect'){
   const parsed=zoomCredentialsSchema.safeParse(body.credentials);
   if(!parsed.success)return NextResponse.json({error:'Vyplň Account ID, Client ID, Client Secret a email organizátora.'},{status:400,headers});
   const {data:existing,error:readError}=await db.from('appointment_zoom_connection').select('id').eq('id',1).maybeSingle();
   if(readError)throw readError;
   // Credential replacement needs a separate planned rotation; avoid losing legacy Zoom access.
   if(existing)return NextResponse.json({error:'Zoom je už uložený. Pri zmene aplikácie treba najprv overiť prístup k existujúcim Zoom rezerváciám.'},{status:409,headers});
   const host=await checkZoomCredentials(parsed.data);
   const saved=await db.from('appointment_zoom_connection').insert({id:1,encrypted_credentials:sealZoom(parsed.data),host_email:host.hostEmail,host_type:host.hostType,active:false});
   if(saved.error)throw saved.error;
   return NextResponse.json({ok:true,message:'Prepojenie je bezpečne uložené. Teraz spusti test vytvorenia, načítania, úpravy a odstránenia testovacieho stretnutia.'},{headers});
  }
  if(body.action!=='test_activate')return NextResponse.json({error:'Neplatná akcia.'},{status:400,headers});
  const connection=await zoomConnection();if(!connection)throw Error('zoom_not_connected');
  const host=await checkZoomCredentials(connection.credentials);
  await testZoom(connection.credentials,'technical-test-'+randomUUID());
  const saved=await db.from('appointment_zoom_connection').update({active:true,tested_at:new Date().toISOString(),host_type:host.hostType,updated_at:new Date().toISOString()}).eq('id',1);
  if(saved.error)throw saved.error;
  return NextResponse.json({ok:true,message:'Test vytvorenia, načítania, úpravy a odstránenia Zoom stretnutia prešiel. Nové rezervácie budú používať Zoom. Existujúce odkazy zostávajú zachované.'},{headers});
 }catch{return NextResponse.json({error:'Prepojenie alebo test neprešiel; aktiváciu sme nepotvrdili. Skontroluj aktívnu Server-to-Server OAuth aplikáciu, organizátora a oprávnenia read/create/update/delete meetings a read user. Pri neistom výsledku testu skontroluj v Zoom stretnutia označené technical-test pred opakovaním.'},{status:503,headers});}
}
