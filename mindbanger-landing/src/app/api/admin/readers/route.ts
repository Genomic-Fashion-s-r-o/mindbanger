import { z } from 'zod';
import { adminIdentity } from '@/lib/online-programs/http';
import { getServiceSupabase } from '@/lib/supabase-service';
import { adminData,members } from '@/lib/readers/admin';
import { bookInput,editionInput,materialInput,mimeTypes,MAX_BYTES,BUCKET,csvCell } from '@/lib/readers/model';
import { result,ReaderError } from '@/lib/readers/store';
import { origin,body,json,failure,noStore } from '@/lib/readers/http';
import { readerLocale } from '@/lib/readers/locale';
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('book'),value:bookInput}).strict(),z.object({action:z.literal('edition'),value:editionInput}).strict(),z.object({action:z.literal('material'),value:materialInput}).strict(),
 z.object({action:z.literal('upload'),name:z.string().trim().min(1).max(200),mime:z.enum(mimeTypes),size:z.number().int().min(1).max(MAX_BYTES)}).strict(),z.object({action:z.literal('uploadComplete'),id:z.uuid()}).strict(),
 z.object({action:z.literal('settings'),registrations:z.boolean(),campaigns:z.boolean()}).strict(),
 z.object({action:z.literal('campaign'),bookId:z.uuid().nullable(),locale:z.string().max(35),subject:z.string().trim().min(3).max(200),text:z.string().trim().min(20).max(20000)}).strict(),
 z.object({action:z.literal('queue'),id:z.uuid()}).strict(),z.object({action:z.literal('pause'),id:z.uuid()}).strict(),
 z.object({action:z.literal('offer'),bookId:z.uuid().nullable(),programId:z.uuid(),price:z.number().int().min(1).max(10000000),active:z.boolean(),endsAt:z.iso.datetime().nullable()}).strict(),
 z.object({action:z.literal('offerStop'),id:z.uuid()}).strict(),
]);
export async function GET(request:Request){try{const admin=await adminIdentity();const q=new URL(request.url).searchParams;if(q.has('accounts')){const rows=result(await getServiceSupabase().rpc('reader_admin_accounts',{p_search:(q.get('search')||'').slice(0,100),...(q.get('before')?{p_before:q.get('before'),p_before_id:q.get('beforeId')}:{})}))as {id:string;registered_at:string}[];return json({accounts:rows.slice(0,100),next:rows.length>100?{before:rows[99].registered_at,beforeId:rows[99].id}:null});}if(q.has('members')){const rows=await members(request);if(q.has('csv')){result(await getServiceSupabase().from('reader_audit').insert({actor_id:admin.id,action:'members_export'}));const csv='\uFEFF'+[['Email','Kniha','Jazyk','Stav','Marketing','Registrácia'],...rows.slice(0,100).map(r=>[r.email,r.title,r.locale,r.status,r.marketing,r.joined_at])].map(row=>row.map(csvCell).join(',')).join('\r\n');return new Response(csv,{headers:{...noStore,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="citatelia-strana.csv"'}});}return json({members:rows.slice(0,100),next:rows.length>100?{before:rows[99].joined_at,beforeId:rows[99].id}:null});}return json(await adminData());}catch(e){return failure(e);}}
export async function POST(request:Request){try{origin(request);const admin=await adminIdentity();const p=schema.safeParse(await body(request,80000));if(!p.success)return json({error:p.error.issues[0]?.message||'reader_invalid_input'},400);const input=p.data,db=getServiceSupabase();
 const audit=async(action:string,id?:string)=>{result(await db.from('reader_audit').insert({actor_id:admin.id,action,subject_id:id||null}));};
 if(input.action==='book'||input.action==='edition'||input.action==='material'){
  const value=input.value,{id,revision,...fields}=value;
  if('locale'in fields&&readerLocale(fields.locale)!==fields.locale)throw new ReaderError('reader_locale_not_ready');
  if(input.action==='edition'){
   const v=input.value;if(!v.slug.startsWith(v.locale.toLowerCase()+'-'))throw new ReaderError('reader_slug_locale_prefix');
   if(v.status==='published'&&(v.description.trim().length<20||v.public_body.trim().length<30))throw new ReaderError('reader_public_content_required');
   if(v.format==='kindle'&&v.club_invitation&&v.status==='published'){
    // Explicit admin action is recorded; the editor explains KDP review is required.
    await audit('kindle_invitation_enabled',v.id||undefined);
   }
  }
  if(input.action==='material'){
   const v=input.value;if(v.edition_id){const e=result(await db.from('reader_editions').select('book_id').eq('id',v.edition_id).single());if(e.book_id!==v.book_id)throw new ReaderError('reader_edition_mismatch');}
   if(v.asset_id){const a=result(await db.from('reader_assets').select('ready').eq('id',v.asset_id).single());if(!a.ready)throw new ReaderError('reader_asset_required');}if(v.status==='published'&&!v.asset_id)throw new ReaderError('reader_asset_required');
  }
  const table=input.action==='book'?'reader_books':input.action==='edition'?'reader_editions':'reader_materials';
  const extra=input.action==='material'?{published_at:input.value.status==='published'?new Date().toISOString():null}:{};
  const row=id?result(await db.from(table).update({...fields,...extra,revision:revision+1}).eq('id',id).eq('revision',revision).select('id').maybeSingle()):result(await db.from(table).insert({...fields,...extra}).select('id').single());if(!row)throw new ReaderError('reader_revision_conflict',409);
  await audit(input.action+'_saved',row.id);return json({ok:true,id:row.id});
 }
 if(input.action==='upload'){const id=crypto.randomUUID(),path=id+'/'+input.name.replace(/[^a-zA-Z0-9._-]/g,'_');result(await db.from('reader_assets').insert({id,path,name:input.name,mime:input.mime,size_bytes:input.size}));const signed=await db.storage.from(BUCKET).createSignedUploadUrl(path);if(signed.error||!signed.data)throw new ReaderError('reader_upload_unavailable',503);return json({id,path,token:signed.data.token});}
 if(input.action==='uploadComplete'){const a=result(await db.from('reader_assets').select('*').eq('id',input.id).single());const info=await db.storage.from(BUCKET).info(a.path);if(info.error||!info.data||Number(info.data.size)!==a.size_bytes||info.data.contentType!==a.mime)throw new ReaderError('reader_upload_incomplete');result(await db.from('reader_assets').update({ready:true}).eq('id',a.id));await audit('asset_uploaded',a.id);return json({ok:true});}
 if(input.action==='settings'){if(input.campaigns&&!process.env.READER_EMAIL_WEBHOOK_SECRET)throw new ReaderError('Najprv nakonfiguruj spracovanie odhlásení a nedoručiteľných emailov.');result(await db.from('reader_settings').update({registrations_enabled:input.registrations,campaigns_enabled:input.campaigns}).eq('id',true));await audit('settings_saved');}
 if(input.action==='campaign'){if(readerLocale(input.locale)!==input.locale)throw new ReaderError('reader_locale_not_ready');result(await db.from('reader_campaigns').insert({book_id:input.bookId,locale:input.locale,subject:input.subject,body:input.text}));await audit('campaign_created');}
 if(input.action==='queue'){const count=result(await db.rpc('reader_campaign_queue',{p_id:input.id}));await audit('campaign_queued',input.id);return json({ok:true,count});}
 if(input.action==='pause'){result(await db.from('reader_campaigns').update({status:'paused'}).eq('id',input.id));await audit('campaign_paused',input.id);}
 if(input.action==='offer'){if(input.endsAt&&Date.parse(input.endsAt)<=Date.now())throw new ReaderError('reader_offer_expired');result(await db.from('reader_offers').insert({book_id:input.bookId,program_id:input.programId,price_cents:input.price,active:input.active,ends_at:input.endsAt}));await audit('offer_created');}
 if(input.action==='offerStop'){result(await db.from('reader_offers').update({active:false}).eq('id',input.id));await audit('offer_stopped',input.id);}
 return json({ok:true});
}catch(e){return failure(e);}}
