import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { BUCKET } from '@/lib/readers/model';
import { accessibleMaterial,currentReader,ownsEmail,ReaderError } from '@/lib/readers/store';
import { failure,noStore } from '@/lib/readers/http';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;if(!z.uuid().safeParse(id).success)throw new ReaderError('reader_invalid_input');const user=await currentReader();const {asset}=await accessibleMaterial(id,user&&ownsEmail(user)?user.id:null);const signed=await getServiceSupabase().storage.from(BUCKET).createSignedUrl(asset.path,300);if(signed.error||!signed.data)throw new ReaderError('reader_unavailable',503);
 const range=request.headers.get('range');if(range&&!/^bytes=\d*-\d*$/.test(range))return new Response(null,{status:416,headers:noStore});
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);let upstream:Response;try{upstream=await fetch(signed.data.signedUrl,{headers:range?{Range:range}:{},cache:'no-store',signal:controller.signal});}finally{clearTimeout(timeout);}if(!upstream.ok&&upstream.status!==416)throw new ReaderError('reader_unavailable',503);const headers=new Headers({...noStore,'Content-Type':asset.mime,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(asset.name)}`,'X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"sandbox; default-src 'none'"});for(const key of ['content-range','content-length','accept-ranges']){const v=upstream.headers.get(key);if(v)headers.set(key,v);}return new Response(upstream.body,{status:upstream.status,headers});
}catch(e){return failure(e);}}
