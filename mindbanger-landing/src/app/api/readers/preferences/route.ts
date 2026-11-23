import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { createClient } from '@/lib/supabase-server';
import { requireReader,result,ReaderError } from '@/lib/readers/store';
import { body,origin,json,failure } from '@/lib/readers/http';
import { readerLocale } from '@/lib/readers/locale';
const schema=z.discriminatedUnion('action',[z.object({action:z.literal('save'),locale:z.string().max(35),audioLocale:z.string().max(35),marketing:z.boolean()}).strict(),z.object({action:z.literal('leave'),membershipId:z.uuid()}).strict(),z.object({action:z.literal('logout')}).strict()]);
export async function POST(request:Request){try{origin(request);const p=schema.safeParse(await body(request));if(!p.success)throw new ReaderError('reader_invalid_input');if(p.data.action==='logout'){const db=await createClient();await db.auth.signOut();return json({ok:true});}const u=await requireReader(),db=getServiceSupabase();if(p.data.action==='save'){if(readerLocale(p.data.locale)!==p.data.locale||readerLocale(p.data.audioLocale)!==p.data.audioLocale)throw new ReaderError('reader_invalid_locale');result(await db.rpc('reader_preferences_save',{p_user:u.id,p_locale:p.data.locale,p_audio:p.data.audioLocale,p_marketing:p.data.marketing}));}else result(await db.from('reader_memberships').update({status:'left'}).eq('id',p.data.membershipId).eq('user_id',u.id).select('id'));return json({ok:true});}catch(e){return failure(e);}}
