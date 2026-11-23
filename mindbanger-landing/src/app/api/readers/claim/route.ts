import { after } from 'next/server';
import { processReaderWelcomes } from '@/lib/readers/welcome';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { requireReader,result,hashToken,hashEmail,ReaderError } from '@/lib/readers/store';
import { body,origin,json,failure } from '@/lib/readers/http';
export const maxDuration=30;
const schema=z.object({intent:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export async function POST(request:Request){try{origin(request);const parsed=schema.safeParse(await body(request));if(!parsed.success)throw new ReaderError('reader_invalid_input');const u=await requireReader();result(await getServiceSupabase().rpc('reader_claim',{p_user:u.id,p_token_hash:hashToken(parsed.data.intent),p_email_hash:hashEmail(u.email!)}));after(async()=>{try{await processReaderWelcomes(u.id);}catch{console.error('Reader welcome processing failed');}});return json({ok:true});}catch(e){return failure(e);}}
