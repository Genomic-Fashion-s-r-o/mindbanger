import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'node:crypto';
import { bookingAdmin } from '@/lib/booking/admin';
import { siteOrigin } from '@/lib/booking/store';
import { GOOGLE_OWNER, GOOGLE_SCOPES, googleOAuthConfigured } from '@/lib/booking/google-connection';
export async function GET(){
 if(!await bookingAdmin())return NextResponse.json({error:'Vyžaduje sa správca s MFA.'},{status:401});
 if(!googleOAuthConfigured())return NextResponse.json({error:'Najprv nastavte Google OAuth klienta a šifrovací kľúč servera.'},{status:503});
 const state=randomBytes(32).toString('base64url'),verifier=randomBytes(48).toString('base64url'),jar=await cookies();
 const options={httpOnly:true,secure:siteOrigin().startsWith('https:'),sameSite:'lax' as const,path:'/api/admin/appointments/google',maxAge:600};
 jar.set('mb_google_state',state,options);jar.set('mb_google_verifier',verifier,options);
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 url.search=new URLSearchParams({client_id:process.env.GOOGLE_CALENDAR_CLIENT_ID!,redirect_uri:siteOrigin()+'/api/admin/appointments/google/callback',response_type:'code',scope:GOOGLE_SCOPES.join(' '),access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',login_hint:GOOGLE_OWNER}).toString();
 return NextResponse.redirect(url);
}
