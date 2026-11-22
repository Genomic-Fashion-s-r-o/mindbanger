import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { adminIdentity,failure,json,readJson } from '@/lib/online-programs/http';
import { checked,ProgramError } from '@/lib/online-programs/store';
import { funnelSchema } from '@/lib/member-funnels/model';
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('save'),id:z.uuid().nullable(),revision:z.number().int().min(0),config:funnelSchema}).strict(),
 z.object({action:z.literal('prerequisite'),programId:z.uuid(),requiredId:z.uuid().nullable(),revision:z.number().int().min(0)}).strict(),
]);
export async function GET(request:Request){try{
 await adminIdentity();const db=getServiceSupabase(),program=new URL(request.url).searchParams.get('program');
 if(program){if(!z.uuid().safeParse(program).success)throw new ProgramError('Neplatný program.');return json({assets:checked(await db.from('online_program_assets').select('*').eq('program_id',program).eq('ready',true).order('created_at'))});}
 const [funnels,programs,demographics]=await Promise.all([db.from('member_funnels').select('*').order('created_at',{ascending:false}),db.from('online_programs').select('id,title,price_cents,prerequisite_program_id,revision').order('created_at'),db.rpc('member_funnel_demographics')]);
 return json({funnels:checked(funnels),programs:checked(programs),demographics:checked(demographics)});
}catch(error){return failure(error);}}
export async function POST(request:Request){try{
 const admin=await adminIdentity(request),parsed=schema.safeParse(await readJson(request,50000));
 if(!parsed.success)throw new ProgramError(parsed.error.issues[0]?.message||'Skontroluj nastavenia.');
 const body=parsed.data,db=getServiceSupabase();
 if(body.action==='save')return json({id:checked(await db.rpc('member_funnel_save',{p_id:body.id,p_revision:body.revision,p_config:body.config,p_actor:admin.id}))});
 checked(await db.rpc('online_program_prerequisite_save',{p_program:body.programId,p_required:body.requiredId,p_revision:body.revision,p_actor:admin.id}));return json({ok:true});
}catch(error){return failure(error);}}
