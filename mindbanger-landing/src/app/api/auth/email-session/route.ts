import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase-service';
import { assertOrigin, failure, json, readJson } from '@/lib/online-programs/http';
import { ProgramError } from '@/lib/online-programs/store';
const schema=z.object({tokenHash:z.string().regex(/^[A-Za-z0-9_-]{20,256}$/)}).strict();
export async function POST(request:Request){try{
 assertOrigin(request);const input=schema.safeParse(await readJson(request,2000));
 if(!input.success)throw new ProgramError('Neplatný prihlasovací odkaz.');
 const db=await createClient();const {data,error}=await db.auth.verifyOtp({token_hash:input.data.tokenHash,type:'email'});
 if(error||!data.user)throw new ProgramError('Tento odkaz už vypršal alebo bol použitý. Vyžiadaj si nový prihlasovací email.',401);
 if(data.user.app_metadata.email_ownership==='unverified'){
  // First mailbox proof must invalidate any password chosen before ownership was established.
  // Otherwise a person who pre-registered someone else's email could retain password access.
  const service=getServiceSupabase();
  const rotated=await service.auth.admin.updateUserById(data.user.id,{password:randomBytes(48).toString('base64url')});
  if(rotated.error)throw new ProgramError('Overenie účtu sa nepodarilo dokončiť.',503);
  const revoked=await db.auth.signOut({scope:'others'});
  if(revoked.error)throw new ProgramError('Overenie účtu sa nepodarilo dokončiť.',503);
  const saved=await service.auth.admin.updateUserById(data.user.id,{app_metadata:{...data.user.app_metadata,email_ownership:'verified'}});
  if(saved.error)throw new ProgramError('Overenie účtu sa nepodarilo dokončiť.',503);
  // Password rotation can revoke the session just created by verifyOtp. Establish
  // a fresh session only for the identity whose mailbox was proven above.
  const fresh=await service.auth.admin.generateLink({type:'magiclink',email:data.user.email!});
  if(fresh.error||fresh.data.user?.id!==data.user.id||!fresh.data.properties?.hashed_token)throw new ProgramError('Overenie účtu sa nepodarilo dokončiť.',503);
  const resumed=await db.auth.verifyOtp({token_hash:fresh.data.properties.hashed_token,type:'email'});
  if(resumed.error||resumed.data.user?.id!==data.user.id)throw new ProgramError('Overenie účtu sa nepodarilo dokončiť.',503);
 }
 return json({ok:true});
}catch(error){return failure(error);}}
