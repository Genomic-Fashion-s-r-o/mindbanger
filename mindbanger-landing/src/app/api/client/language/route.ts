import{z}from'zod';
import{createClient}from'@/lib/supabase-server';
import{getServiceSupabase}from'@/lib/supabase-service';
import{assertOrigin,failure,json,readJson}from'@/lib/online-programs/http';
import{checked,ProgramError}from'@/lib/online-programs/store';
const schema=z.object({language:z.enum(['sk','cs','en'])}).strict();
export async function PATCH(request:Request){try{assertOrigin(request);const input=schema.safeParse(await readJson(request,1000));if(!input.success)throw new ProgramError('Skontroluj údaje.');const db=await createClient(),{data:{user},error}=await db.auth.getUser();if(error||!user)throw new ProgramError('Najprv sa prihlás do svojho účtu.',401);checked(await getServiceSupabase().from('profiles').update({preferred_language:input.data.language}).eq('id',user.id).select('id'));return json({ok:true});}catch(error){return failure(error);}}
