import{localeTag,type PortalLocale}from '@/lib/portal-locale';
import { z } from 'zod';
export const bonusTranslationSchema=z.object({enabled:z.boolean(),title:z.string().trim().min(3).max(160),description:z.string().max(5000),assetId:z.uuid().nullable(),offerTitle:z.string().trim().min(3).max(160),offerBody:z.string().max(10000)}).strict().refine(v=>!v.enabled||!!v.assetId,'Dokončená jazyková verzia potrebuje vlastný súbor.');
export const funnelSchema = z.object({
 slug:z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100),programId:z.uuid(),
 title:z.string().trim().min(3).max(160),description:z.string().max(5000),assetId:z.uuid().nullable(),
 offerTitle:z.string().trim().min(3).max(160),offerBody:z.string().max(10000),
 valueCents:z.number().int().min(0).max(10000000),standardCents:z.number().int().min(1).max(10000000),
 introCents:z.number().int().min(1).max(10000000),memberCents:z.number().int().min(1).max(10000000),
 minutes:z.number().int().min(1).max(60),active:z.boolean(),
 translations:z.object({cs:bonusTranslationSchema.optional(),en:bonusTranslationSchema.optional()}).strict().default({}),
}).strict().refine(v=>v.introCents<=v.memberCents&&v.memberCents<=v.standardCents,'Úvodná cena musí byť najnižšia; členská najviac štandardná.');
export type FunnelConfig=z.infer<typeof funnelSchema>;
export type Funnel={id:string;slug:string;program_id:string;title:string;description:string;asset_id:string|null;offer_title:string;offer_body:string;value_cents:number;standard_cents:number;intro_cents:number;member_cents:number;minutes:number;active:boolean;revision:number;translations?:FunnelConfig['translations']};
export type BonusAccess={id:string;user_id:string;funnel_id:string;asset_id:string;title:string;description:string;acquired_at:string;offer_started_at:string|null;offer_expires_at:string|null;intro_cents:number|null;member_cents:number;standard_cents:number;value_cents:number;shown_session_id:string|null;content_snapshot?:Record<string,z.infer<typeof bonusTranslationSchema>>};
export type PriceQuote={price:number;tier:'standard'|'intro'|'member';deadline:string|null;accessId:string|null;memberPrice?:number;introPrice?:number;standardPrice?:number};
export function defaultFunnel(programId:string):FunnelConfig{return{slug:'bonus-'+Date.now().toString(36),programId,title:'Nový materiál zdarma',description:'',assetId:null,offerTitle:'7-dňový tréning',offerBody:'',valueCents:35000,standardCents:4900,introCents:1990,memberCents:2990,minutes:10,active:false,translations:{}};}
export function funnelToConfig(f:Funnel):FunnelConfig{return{slug:f.slug,programId:f.program_id,title:f.title,description:f.description,assetId:f.asset_id,offerTitle:f.offer_title,offerBody:f.offer_body,valueCents:f.value_cents,standardCents:f.standard_cents,introCents:f.intro_cents,memberCents:f.member_cents,minutes:f.minutes,active:f.active,translations:f.translations||{}};}
export const euro=(cents:number,locale:PortalLocale='sk')=>new Intl.NumberFormat(localeTag(locale),{style:'currency',currency:'EUR'}).format(cents/100);
export function effectiveQuote(quote:PriceQuote,now=Date.now()){
 const expired=quote.tier==='intro'&&!!quote.deadline&&Date.parse(quote.deadline)<=now;
 return {price:expired?(quote.memberPrice??quote.price):quote.price,tier:expired?'member' as const:quote.tier,seconds:quote.deadline?Math.max(0,Math.ceil((Date.parse(quote.deadline)-now)/1000)):0};
}
