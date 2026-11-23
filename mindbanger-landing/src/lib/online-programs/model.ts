import { z } from 'zod';

export const PROGRAM_TERMS_VERSION = 'online-programs-v1';
export const PROGRAM_BUCKET = 'online-programs';
export const MAX_ASSET_BYTES = 250 * 1024 * 1024;
export const assetTypes = ['video/mp4', 'video/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'application/pdf'] as const;
const id = z.uuid();
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const d = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}, 'Zadaj platný dátum.');
const baseBlock = { id, title: z.string().trim().max(160) };
export const blockSchema = z.discriminatedUnion('type', [
  z.object({ ...baseBlock, type: z.literal('text'), text: z.string().max(20000) }).strict(),
  z.object({ ...baseBlock, type: z.enum(['video', 'audio', 'pdf']), assetId: id.nullable(), transcript: z.string().max(30000).default('') }).strict(),
  z.object({ ...baseBlock, type: z.literal('question'), kind: z.enum(['text', 'choice', 'checklist']), options: z.array(z.string().trim().min(1).max(200)).max(20), visibility: z.enum(['private', 'coach']), required: z.boolean() }).strict(),
  z.object({ ...baseBlock, type: z.literal('rating'), phase: z.enum(['before', 'after', 'single']), metric: z.string().trim().max(80), lowLabel: z.string().max(100), highLabel: z.string().max(100), visibility: z.enum(['private', 'coach']), required: z.boolean() }).strict(),
]);
export const lessonSchema = z.object({ id, title: z.string().trim().min(1).max(160), day: z.number().int().min(0).max(730), blocks: z.array(blockSchema).max(40) }).strict();
export const programContentSchema=z.object({enabled:z.boolean(),title:z.string().trim().min(3).max(160),description:z.string().max(5000),terms:z.string().max(20000),intro:z.object({title:z.string().max(160),text:z.string().max(20000),videoAssetId:id.nullable()}).strict(),lessons:z.array(lessonSchema).max(200)}).strict();
export const programConfigSchema = z.object({
  title: z.string().trim().min(3).max(160), description: z.string().max(5000),
  mode: z.enum(['cohort', 'individual']), anchor: z.enum(['payment', 'entry']),
  release: z.enum(['daily', 'custom', 'all']), timezone: z.enum(['Europe/Bratislava', 'Europe/Prague', 'UTC']),
  introRequired: z.boolean(), intro: z.object({ title: z.string().max(160), text: z.string().max(20000), videoAssetId: id.nullable() }).strict(),
  accessDays: z.number().int().min(1).max(3650).nullable(),
  community: z.literal('off'),
  terms: z.string().max(20000),
  lessons: z.array(lessonSchema).max(200),
  translations:z.object({cs:programContentSchema.optional(),en:programContentSchema.optional()}).strict().default({}),
}).strict().superRefine((value, ctx) => {
  const ids = [ ...value.lessons.map(l => l.id), ...value.lessons.flatMap(l => l.blocks.map(b => b.id)) ];
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Lekcie a bloky potrebujú jedinečné identifikátory.' });
  for(const translated of Object.values(value.translations))if(translated){
    if(translated.lessons.length!==value.lessons.length)ctx.addIssue({code:'custom',message:'Jazykové verzie musia mať rovnaké lekcie a bloky.'});
    for(const [i,lesson]of translated.lessons.entries()){
      const original=value.lessons[i];if(!original||original.id!==lesson.id||original.day!==lesson.day||original.blocks.length!==lesson.blocks.length){ctx.addIssue({code:'custom',message:'Jazyková verzia musí zachovať identifikátory a harmonogram lekcií.'});continue;}
      for(const [j,b]of lesson.blocks.entries()){const o=original.blocks[j];if(!o||o.id!==b.id||o.type!==b.type||('kind'in b&&(!('kind'in o)||o.kind!==b.kind||o.options.length!==b.options.length))||('visibility'in b&&(!('visibility'in o)||o.visibility!==b.visibility||o.required!==b.required))||('phase'in b&&(!('phase'in o)||o.phase!==b.phase||o.metric!==b.metric)))ctx.addIssue({code:'custom',message:'Preklad môže meniť texty a médiá, nie štruktúru otázok a ich súkromie.'});}
    }
  }
});
export type ProgramConfig = z.infer<typeof programConfigSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Answer = string | string[] | number;
export type Answers = Record<string, Answer>;
export function syncProgramTranslations(config:ProgramConfig):ProgramConfig{
 const translations={...config.translations};
 for(const locale of ['cs','en'] as const){const t=translations[locale];if(!t)continue;let changed=t.lessons.length!==config.lessons.length;
  const lessons=config.lessons.map(base=>{const old=t.lessons.find(l=>l.id===base.id);if(!old||old.blocks.length!==base.blocks.length||old.day!==base.day)changed=true;
   return{...base,title:old?.title||base.title,blocks:base.blocks.map(b=>{const v=old?.blocks.find(o=>o.id===b.id&&o.type===b.type);if(!v){changed=true;return 'assetId'in b?{...b,assetId:null}:b;}
    if(b.type==='question'&&v.type==='question'){if(b.kind!==v.kind||b.options.length!==v.options.length)changed=true;return{...b,title:v.title,options:b.options.map((o,i)=>v.options[i]||o)};}
    if(b.type==='rating'&&v.type==='rating')return{...b,title:v.title,lowLabel:v.lowLabel,highLabel:v.highLabel};return v;})};});
  translations[locale]={...t,enabled:changed?false:t.enabled,lessons};
 }return{...config,translations};
}
export type ProgramRow = { id: string; slug: string; title: string; draft: ProgramConfig; revision: number; published_version_id: string | null; sales_enabled: boolean; price_cents: number; currency: string; prerequisite_program_id?:string|null };
export type Version = { id: string; program_id: string; version: number; config: ProgramConfig };
export type Cohort = { id: string; program_id: string; version_id: string; name: string; starts_on: string; status: 'open' | 'closed'; created_at: string };
export type Enrollment = { id: string; program_id: string; user_id: string; version_id: string; cohort_id: string | null; activated_at: string; start_at: string | null; intro_completed_at: string | null; expires_at: string | null; status: 'active' | 'revoked'; source: 'manual' | 'purchase' };
export type Progress = { lesson_id: string; completed_at: string | null; position_seconds: number; answers: Answers; revision: number };
export type Asset = { id: string; program_id: string; name: string; mime: string; size_bytes: number; path: string; ready: boolean };

export function newProgramConfig(): ProgramConfig {
  return { title: 'Nový online program', description: '', mode: 'cohort', anchor: 'payment', release: 'daily', timezone: 'Europe/Bratislava', introRequired: true, intro: { title: 'Vitaj v programe', text: '', videoAssetId: null }, accessDays: null, community: 'off', terms: '', lessons: [],translations:{} };
}
export function localDate(instant: string | Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function addDays(date: string, days: number) {
  const value = new Date(date + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function programMidnight(date: string, timezone: string) {
  const desired = Date.parse(date + 'T00:00:00Z');
  let instant = desired;
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(instant));
    const value = (type: string) => Number(parts.find(p => p.type === type)!.value);
    const local = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
    instant += desired - local;
  }
  return new Date(instant).toISOString();
}
export function enrollmentActive(enrollment: Enrollment, now = new Date()) {
  return enrollment.status === 'active' && (!enrollment.expires_at || Date.parse(enrollment.expires_at) > now.getTime());
}
export function lessonAvailability(config: ProgramConfig, enrollment: Enrollment, lessonIndex: number, now = new Date(), completed: Set<string> = new Set()) {
  const lesson = config.lessons[lessonIndex];
  if (!lesson || !enrollmentActive(enrollment, now)) return { available: false, date: null, reason: 'access' as const };
  if (!enrollment.start_at) return { available: false, date: null, reason: 'start' as const };
  const start = localDate(enrollment.start_at, config.timezone);
  const offset = config.release === 'all' ? 0 : config.release === 'daily' ? lessonIndex : lesson.day;
  const date = addDays(start, offset);
  if (localDate(now, config.timezone) < date || now.getTime() < Date.parse(enrollment.start_at)) return { available: false, date, reason: 'date' as const };
  if (config.introRequired && !enrollment.intro_completed_at) return { available: false, date, reason: 'intro' as const };
  // Completion records describe progress; missing a day never blocks the next lesson.
  void completed;
  return { available: true, date, reason: null };
}
export function publishProblems(config: ProgramConfig) {
  const problems: string[] = [];
  for(const [locale,content]of Object.entries(config.translations||{}))if(content?.enabled)problems.push(...publishProblems({...config,...content,translations:{}}).map(message=>locale.toUpperCase()+': '+message));
  if (!config.intro.text.trim() && !config.intro.videoAssetId) problems.push('Doplň úvodný text alebo video.');
  if (!config.lessons.length) problems.push('Pridaj aspoň jednu lekciu.');
  for (const lesson of config.lessons) {
    if (!lesson.blocks.length) problems.push(`${lesson.title}: pridaj obsah.`);
    for (const block of lesson.blocks) {
      if (['video', 'audio', 'pdf'].includes(block.type) && 'assetId' in block && !block.assetId) problems.push(`${lesson.title}: nahraj súbor pre ${block.title || block.type}.`);
      if (block.type === 'text' && !block.text.trim()) problems.push(`${lesson.title}: doplň text.`);
      if ((block.type === 'question' || block.type === 'rating') && !block.title.trim()) problems.push(`${lesson.title}: doplň znenie otázky.`);
      if (block.type === 'question' && block.kind !== 'text' && (block.options.length < 2 || new Set(block.options).size !== block.options.length)) problems.push(`${lesson.title}: otázka potrebuje aspoň dve rôzne možnosti.`);
      if (block.type === 'rating' && !block.metric.trim()) problems.push(`${lesson.title}: pomenuj meranú veličinu.`);
    }
  }
  return problems;
}
export function referencedAssets(config: ProgramConfig) {
  return [...new Set(programVariants(config).flatMap(v=>[v.intro.videoAssetId,...v.lessons.flatMap(l=>l.blocks.flatMap(b=>'assetId'in b?[b.assetId]:[]))]).filter((value):value is string=>!!value))];
}
export function programVariants(config:ProgramConfig):ProgramConfig[]{return [config,...Object.values(config.translations||{}).filter(t=>t?.enabled).map(t=>({...config,...t!,translations:{}}))];}
export function localizedProgram(config:ProgramConfig,locale:'sk'|'cs'|'en'){
  const translated=locale==='sk'?undefined:config.translations?.[locale];
  return translated?.enabled?{...config,...translated,translations:{},lessons:translated.lessons.map((l,i)=>({...l,blocks:l.blocks.map((b,j)=>({...b,...(b.type==='question'&&config.lessons[i]?.blocks[j]?.type==='question'?{optionValues:(config.lessons[i].blocks[j] as Extract<Block,{type:'question'}>).options}:{})}))}))}:config;
}
export function validateAnswers(lesson: Lesson, input: Answers, complete: boolean) {
  const shared: Answers = {}, privateAnswers: Answers = {};
  const fields = new Map(lesson.blocks.filter(b => b.type === 'question' || b.type === 'rating').map(b => [b.id, b]));
  for (const [key, answer] of Object.entries(input)) {
    const field = fields.get(key);
    if (!field || (field.type !== 'question' && field.type !== 'rating')) throw new Error('Neznáma otázka.');
    const valid = field.type === 'rating'
      ? typeof answer === 'number' && Number.isInteger(answer) && answer >= 0 && answer <= 10
      : field.kind === 'text'
        ? typeof answer === 'string' && answer.length <= 20000
        : field.kind === 'choice'
          ? typeof answer === 'string' && field.options.includes(answer)
          : Array.isArray(answer) && answer.length <= field.options.length && new Set(answer).size === answer.length && answer.every(v => field.options.includes(v));
    if (!valid) throw new Error('Skontroluj odpovede a hodnotenia.');
    (field.visibility === 'private' ? privateAnswers : shared)[key] = answer;
  }
  if (complete) for (const field of fields.values()) {
    if (field.type !== 'question' && field.type !== 'rating') continue;
    const value = input[field.id];
    if (field.required && (value === undefined || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length))) throw new Error('Pred dokončením vyplň povinné otázky.');
  }
  return { shared, privateAnswers };
}
