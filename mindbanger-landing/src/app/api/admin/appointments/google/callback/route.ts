import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'node:crypto';
import { bookingAdmin } from '@/lib/booking/admin';
import { siteOrigin } from '@/lib/booking/store';
import { getServiceSupabase } from '@/lib/supabase-service';
import { GOOGLE_OWNER, encryptGoogleToken, googleOAuthConfigured } from '@/lib/booking/google-connection';
export async function GET(request:Request){
 if(!await bookingAdmin())return NextResponse.json({error:'Vyžaduje sa správca s MFA.'},{status:401});
 const origin=siteOrigin(),jar=await cookies(),query=new URL(request.url).searchParams;
 const expected=jar.get('mb_google_state')?.value||'',state=query.get('state')||'',verifier=jar.get('mb_google_verifier')?.value||'';
 for (const name of ['mb_google_state','mb_google_verifier']) jar.set(name,'',{path:'/api/admin/appointments/google',maxAge:0,httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax'});
 if(!googleOAuthConfigured()||!expected||!state||Buffer.byteLength(expected)!==Buffer.byteLength(state)||!timingSafeEqual(Buffer.from(expected),Buffer.from(state))||!verifier)return NextResponse.json({error:'Prepojenie vypršalo. Spustite ho znova z administrácie.'},{status:400});
 try{
  if(query.has('error')||!query.get('code'))throw Error('declined');
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GOOGLE_CALENDAR_CLIENT_ID!,client_secret:process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,code:query.get('code')!,code_verifier:verifier,redirect_uri:origin+'/api/admin/appointments/google/callback',grant_type:'authorization_code'}),signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!r.ok)throw Error('token');const token=await r.json();if(typeof token.access_token!=='string'||typeof token.refresh_token!=='string')throw Error('token');
  const profile=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!profile.ok)throw Error('profile');const owner=await profile.json();
  if(String(owner.email||'').toLowerCase()!==GOOGLE_OWNER||owner.verified_email!==true)throw Error('wrong_owner');
  const {error}=await getServiceSupabase().from('appointment_google_connection').upsert({id:1,owner_email:GOOGLE_OWNER,encrypted_refresh_token:encryptGoogleToken(token.refresh_token),scope:String(token.scope||''),updated_at:new Date().toISOString()});
  if(error)throw Error('save');return NextResponse.redirect(origin+'/mindbanger_daily/admin/rezervacie?google=connected');
 }catch{return NextResponse.redirect(origin+'/mindbanger_daily/admin/rezervacie?google=failed');}
}
