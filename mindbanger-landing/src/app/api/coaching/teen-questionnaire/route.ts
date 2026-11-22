import {prefillQuestionnaire} from '@/lib/coaching-questionnaire-prefill';
import {hasSensitiveAnswers} from '@/lib/coaching-questionnaire-layout';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {sameOrigin} from '@/lib/booking/store';
import {getServiceSupabase} from '@/lib/supabase-service';
import {cardHeaders,encodeContent} from '@/lib/coaching-cards';
import {openTeenForm} from '@/lib/coaching-teen-forms';
import {completeTeenQuestionnaire} from '@/lib/coaching-questionnaires';
import {TEEN_PRIVACY_NOTICE,TEEN_NOTICE_VERSION} from '@/lib/coaching-cards-model';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:cardHeaders});
const open=z.object({action:z.literal('open'),token:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const submit=z.object({action:z.literal('submit'),token:z.string().regex(/^[a-f0-9]{64}$/),answers:z.array(z.string().trim().max(4000)).max(20),accepted:z.literal(true),healthAccepted:z.boolean().default(false),noticeVersion:z.literal(TEEN_NOTICE_VERSION)}).strict();
export async function POST(request:Request){if(!sameOrigin(request))return reply({error:'Neplatný pôvod.'},403);try{if(Number(request.headers.get('content-length'))>100000)return reply({error:'Príliš dlhé odpovede.'},413);const raw=await request.json(),b=(raw.action==='open'?open:submit).parse(raw),valid=await openTeenForm(b.token);if(!valid)return reply({error:'Odkaz už neplatí, bol použitý alebo bolo povolenie odvolané. Kontaktuj kouča na miroslav@mindbanger.com.'},404);const {record:r}=valid,c=prefillQuestionnaire(r.content,null);if(b.action==='open')return reply({form:{title:c.title,text:c.text,questions:c.questions,answers:c.answers,respondent:c.respondent,questionLayout:c.questionLayout,healthAllowed:valid.healthAllowed===true,notice:TEEN_PRIVACY_NOTICE,noticeVersion:TEEN_NOTICE_VERSION,expires:valid.expires}});if(hasSensitiveAnswers(c,b.answers)&&!valid.healthAllowed)return reply({error:'Citlivé otázky preberieme osobne; rodič zatiaľ nepovolil ich písomné spracovanie.'},400);const next=completeTeenQuestionnaire(c,b.answers,new Date().toISOString(),b.healthAccepted);const result=await getServiceSupabase().rpc('coaching_answer_teen_form',{p_record:r.id,p_hash:valid.hash,p_revision:r.revision,p_ciphertext:encodeContent(next,r.id,r.user_id)});if(result.error)throw result.error;if(result.data!==true)return reply({error:'Odkaz už nemožno použiť. Odpovede mohli byť odoslané v inom okne alebo sa zmenilo povolenie.'},409);return reply({ok:true});}catch{return reply({error:'Skontroluj odpovede a potvrdenie. Ak problém pretrváva, kontaktuj kouča.'},400);}}
