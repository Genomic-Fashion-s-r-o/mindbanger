import {z} from 'zod';
import {validateQuestionnaireAnswers,hasSensitiveAnswers} from './coaching-questionnaire-layout';
import {isParentForm,isTeenForm,TEEN_NOTICE_VERSION,CARD_HEALTH_CONSENT} from './coaching-cards-model';
import type {CardContent} from './coaching-cards-model';
export const QUESTIONNAIRE_ACK='Potvrdzujem';
export type QuestionnaireSubmission={answers:string[];respondent:string;childName:string;childAge:number;teenEmail?:string;directTeenCommunication?:boolean;healthAccepted?:boolean};
// Validate the immutable assigned form, rather than trusting a client-supplied form type or wording.
export function completeQuestionnaire(content:CardContent,input:QuestionnaireSubmission,consentVersion:string,answeredAt:string,respondentEmail=''):CardContent{
 if(!content.questions.length||input.answers.length>content.questions.length)throw Error('Neplatné odpovede.');
 if(content.answerMode==='acknowledgements'&&(input.answers.length!==content.questions.length||input.answers.some(v=>v!==QUESTIONNAIRE_ACK)))throw Error('Potvrď každý bod súhlasu samostatne.');
 if(content.answerMode==='acknowledgements'&&isParentForm(content.formType)&&(input.respondent.trim().length<2||input.childName.trim().length<2||input.childAge<13||input.childAge>17))throw Error('Uveď meno teenagera a vek od 13 do dovŕšenia 18 rokov.');
 if(isParentForm(content.formType)&&input.childAge!==0&&(input.childAge<13||input.childAge>17))throw Error('Vek teenagera musí byť od 13 do dovŕšenia 18 rokov, alebo ho nechaj prázdny.');const validated=validateQuestionnaireAnswers(content,input.answers);const sensitive=hasSensitiveAnswers(content,validated);if(sensitive&&!input.healthAccepted)throw Error('Pre citlivé odpovede potrebuješ osobitne potvrdiť výslovný súhlas alebo ich nechať na osobný rozhovor.');
 const direct=isParentForm(content.formType)&&input.directTeenCommunication===true;const teenEmail=direct?(input.teenEmail||'').trim().toLowerCase():'';if(direct&&!z.email().safeParse(teenEmail).success)throw Error('Pri povolení priamej komunikácie uveď platný email teenagera.');
 return {...content,healthConsentAt:input.healthAccepted?answeredAt:'',healthConsentVersion:input.healthAccepted?CARD_HEALTH_CONSENT:'',teenEmail,directTeenCommunication:direct,answers:validated,respondent:input.respondent.trim(),respondentEmail,childName:isParentForm(content.formType)?input.childName.trim():'',childAge:isParentForm(content.formType)?input.childAge:0,accepted:true,answeredAt,submittedConsentVersion:consentVersion};
}

export function completeTeenQuestionnaire(content:CardContent,answers:string[],answeredAt:string,healthAccepted=false):CardContent{if(!isTeenForm(content.formType))throw Error('Neplatný formulár.');return {...completeQuestionnaire(content,{answers,respondent:content.childName,childName:'',childAge:0,healthAccepted},TEEN_NOTICE_VERSION,answeredAt,content.teenEmail),childName:content.childName,childAge:content.childAge,teenEmail:content.teenEmail,guardianRecordId:content.guardianRecordId};}
