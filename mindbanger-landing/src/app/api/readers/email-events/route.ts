import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { body,json,failure } from '@/lib/readers/http';
import { result } from '@/lib/readers/store';
export async function POST(request:Request){const secret=process.env.READER_EMAIL_WEBHOOK_SECRET,actual=request.headers.get('authorization');if(!secret||!actual||Buffer.byteLength(actual)!==Buffer.byteLength('Bearer '+secret)||!timingSafeEqual(Buffer.from(actual),Buffer.from('Bearer '+secret)))return json({error:'unauthorized'},401);try{const p=z.object({event:z.string(),email:z.email().max(254)}).passthrough().safeParse(await body(request,20000));if(!p.success)return json({error:'invalid_event'},400);const tags=[p.data.tag,p.data.tags].flat().filter(v=>typeof v==='string');if(p.data.event==='unsubscribed'&&!tags.includes('mindbanger-readers'))return json({ok:true});if(['hard_bounce','hardBounce','spam','blocked','invalid','unsubscribed'].includes(p.data.event))result(await getServiceSupabase().rpc('reader_email_suppress',{p_email:p.data.email.trim().toLowerCase()}));return json({ok:true});}catch(e){return failure(e);}}
