import {NextResponse} from 'next/server';
import {sameOrigin} from '@/lib/booking/store';
import {getServiceSupabase} from '@/lib/supabase-service';
import {interestHash,interestTokenValid} from '@/lib/program-interest';
export async function POST(request:Request){
 // A no-referrer document can send Origin:null on a native form POST.
 // Fetch Metadata still proves that the form came from this same origin.
 if(!sameOrigin(request)&&request.headers.get('sec-fetch-site')!=='same-origin')return new Response('Neplatný pôvod.',{status:403});
 const form=await request.formData(),token=form.get('token'),leave=form.get('action')==='unsubscribe',cs=form.get('locale')==='cs';
 let result='chyba';
 if(interestTokenValid(token)){const {data,error}=await getServiceSupabase().rpc(leave?'program_interest_unsubscribe':'program_interest_confirm',{p_hash:interestHash(token)});if(!error&&data)result=leave?'odhlasene':'potvrdene';}
 const response=NextResponse.redirect(new URL((cs?'/cz':'')+'/produkty/chut-na-sladke/potvrdenie?stav='+result,request.url),303);response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
}
