import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { clientIdentity,failure,privateHeaders } from '@/lib/online-programs/http';
import { ProgramError } from '@/lib/online-programs/store';
import { PROGRAM_BUCKET } from '@/lib/online-programs/model';
import { bonusMaterial } from '@/lib/member-funnels/store';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{
 const user=await clientIdentity(),{id}=await context.params;if(!z.uuid().safeParse(id).success)throw new ProgramError('Neplatný materiál.');
 const {asset}=await bonusMaterial(user.id,id),signed=await getServiceSupabase().storage.from(PROGRAM_BUCKET).createSignedUrl(asset.path,60);
 if(signed.error||!signed.data)throw new ProgramError('Materiál je dočasne nedostupný.',503);
 const range=request.headers.get('range');if(range&&!/^bytes=\d*-\d*$/.test(range))return new Response(null,{status:416,headers:privateHeaders});
 const response=await fetch(signed.data.signedUrl,{headers:range?{Range:range}:{},cache:'no-store'});
 if(!response.ok)throw new ProgramError('Materiál sa nepodarilo načítať.',503);
 const headers=new Headers({...privateHeaders,'Content-Type':asset.mime,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(asset.name)}`,'X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'no-referrer'});
 for(const name of ['content-length','content-range','accept-ranges']){const value=response.headers.get(name);if(value)headers.set(name,value);}
 return new Response(response.body,{status:response.status,headers});
}catch(error){return failure(error);}}
