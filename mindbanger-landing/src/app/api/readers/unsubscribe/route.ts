import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { origin,body,json,failure } from '@/lib/readers/http';
import { result,ReaderError } from '@/lib/readers/store';
export async function POST(request:Request){try{origin(request);const p=z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).strict().safeParse(await body(request,2000));if(!p.success)throw new ReaderError('reader_invalid_input');result(await getServiceSupabase().rpc('reader_unsubscribe',{p_token:p.data.token}));return json({ok:true});}catch(e){return failure(e);}}
