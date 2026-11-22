import 'server-only';
import { getServiceSupabase } from '@/lib/supabase-service';
import { createClient } from '@/lib/supabase-server';
import { enrollmentActive, lessonAvailability, programConfigSchema, localizedProgram, type Asset, type Cohort, type Enrollment, type ProgramRow, type Version, type Progress, type Answers } from './model';
import {portalLocale} from '@/lib/portal-locale-server';
import type { PriceQuote } from '@/lib/member-funnels/model';

export class ProgramError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function checked<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) {
    const message = result.error.message;
    if (/revision_conflict/.test(message)) throw new ProgramError('Údaje sa zmenili v inom okne. Obnov stránku pred ďalšou úpravou.', 409);
    if (/cohort_in_use/.test(message)) throw new ProgramError('Turnus už má účastníkov alebo objednávky. Dátum štartu zostáva zachovaný; vytvor nový turnus.', 409);
    if (/publish_first/.test(message)) throw new ProgramError('Najprv publikuj pripravený obsah programu.', 409);
    if (/already_enrolled/.test(message)) throw new ProgramError('K tomuto programu už máš aktívny prístup.', 409);
    if (/prerequisite_cycle/.test(message)) throw new ProgramError('Programy nemôžu vyžadovať samy seba ani vytvoriť kruhovú nadväznosť.',409);
    if (/prerequisite_required/.test(message)) throw new ProgramError('Tento program sa sprístupní po absolvovaní predchádzajúceho programu.',403);
    if (/invalid_bonus_ticket/.test(message)) throw new ProgramError('Odkaz na bonus vypršal alebo patrí inému emailu. Vyžiadaj si nový odkaz.',403);
    if (/bonus_unavailable|bonus_required|invalid_bonus_asset/.test(message)) throw new ProgramError('Nahraj a vyber súbor bonusu. Bonus musí byť aktívny a dostupný.',409);
    if (/funnel_in_use/.test(message)) throw new ProgramError('Tento bonus už má členov. Pre iný program vytvor nový bonus.',409);
    if (/lesson_locked|access_denied/.test(message)) throw new ProgramError('Táto lekcia alebo program teraz nie sú dostupné.', 403);
    if (/sales_closed|invalid_cohort|cohort_required|checkout_in_progress|terms_missing|cohort_mode_required/.test(message)) throw new ProgramError('Skontroluj turnus, publikovaný obsah a nastavenie predaja. Obnov stránku.', 409);
    console.error('Online program database operation failed:', message);
    throw new ProgramError('Programy sú dočasne nedostupné. Skús to znova neskôr.', 503);
  }
  return result.data as NonNullable<T>;
}
export async function loadEnrollment(userId: string, enrollmentId: string) {
  const db = getServiceSupabase();
  const enrollment = checked(await db.from('online_program_enrollments').select('*').eq('id', enrollmentId).eq('user_id', userId).maybeSingle()) as Enrollment | null;
  if (!enrollment || !enrollmentActive(enrollment)) throw new ProgramError('K tomuto programu nemáš aktívny prístup.', 403);
  const version = checked(await db.from('online_program_versions').select('*').eq('id', enrollment.version_id).single()) as Version;
  const config = programConfigSchema.parse(version.config);
  return { db, enrollment, config };
}
export async function clientProgramView(userId: string, enrollmentId: string) {
  const { db, enrollment, config:baseConfig } = await loadEnrollment(userId, enrollmentId);
  const requestedLocale=await portalLocale(),config=localizedProgram(baseConfig,requestedLocale);
  const userDb = await createClient();
  const [progressResult, notesResult] = await Promise.all([
    db.from('online_program_progress').select('lesson_id,completed_at,position_seconds,answers,revision').eq('enrollment_id', enrollment.id),
    userDb.from('online_program_private_notes').select('lesson_id,answers,revision').eq('enrollment_id', enrollment.id).eq('user_id', userId),
  ]);
  const progress = checked(progressResult) as Progress[];
  const notes = checked(notesResult) as { lesson_id: string; answers: Answers; revision: number }[];
  const now = new Date();
  return {
    ...(requestedLocale!=='sk'&&!baseConfig.translations?.[requestedLocale]?.enabled?{fallback:true}:{}),
    id: enrollment.id, title: config.title, description: config.description, timezone: config.timezone,
    intro: config.intro, started: !!enrollment.start_at, introCompleted: !!enrollment.intro_completed_at,
    expiresAt: enrollment.expires_at, community: config.community,
    lessons: config.lessons.map((lesson, index) => {
      const availability = lessonAvailability(config, enrollment, index, now);
      const saved = progress.find(p => p.lesson_id === lesson.id);
      const note = notes.find(n => n.lesson_id === lesson.id);
      return { id: lesson.id, title: lesson.title, availability, blocks: availability.available ? lesson.blocks : [],
        completedAt: saved?.completed_at || null, position: saved?.position_seconds || 0,
        answers: availability.available ? { ...saved?.answers, ...note?.answers } : {}, revision: saved?.revision || 0, privateRevision: note?.revision || 0 };
    }),
  };
}
export type ClientProgramView = Awaited<ReturnType<typeof clientProgramView>>;
export async function listClientPrograms(userId: string) {
  const db = getServiceSupabase();
  const [programResult, enrollmentResult, cohortResult] = await Promise.all([
    db.from('online_programs').select('id,title,slug,published_version_id,sales_enabled,price_cents,currency').order('created_at'),
    db.from('online_program_enrollments').select('*').eq('user_id', userId).order('activated_at', { ascending: false }),
    db.from('online_program_cohorts').select('*').eq('status', 'open').order('starts_on'),
  ]);
  if (programResult.error?.code === '42P01' || programResult.error?.code === 'PGRST205') return { installed: false as const, mine: [], offers: [] };
  const programs = checked(programResult), enrollments = checked(enrollmentResult) as Enrollment[], cohorts = checked(cohortResult) as Cohort[];
  const versionIds = [...new Set([...programs.map(p => p.published_version_id), ...enrollments.map(e => e.version_id), ...cohorts.map(c => c.version_id)].filter(Boolean))];
  const versions = versionIds.length ? checked(await db.from('online_program_versions').select('*').in('id', versionIds)) as Version[] : [];
  const locale=await portalLocale();
  const version = (id: string) => {const v=versions.find(v => v.id === id);return v?{...v,config:localizedProgram(programConfigSchema.parse(v.config),locale)}:undefined;};
  const pricing=checked(await db.rpc('member_funnel_catalog',{p_user:userId})) as {programId:string;eligible:boolean;quote:PriceQuote}[];
  return { installed: true as const,
    mine: enrollments.map(e => ({ id: e.id, title: version(e.version_id)?.config.title || 'Online program', active: enrollmentActive(e), cohort: cohorts.find(c => c.id === e.cohort_id)?.name || null, expiresAt: e.expires_at })),
    offers: programs.filter(p => p.published_version_id && p.sales_enabled && pricing.find(q=>q.programId===p.id)?.eligible).map(p => {
      const config = version(p.published_version_id!)!.config;
      const quote=pricing.find(q=>q.programId===p.id)!.quote;
      return { id: p.id, title: config.title, description: config.description, price: quote.price,quote, currency: p.currency, mode: config.mode, terms: config.terms,
        cohorts: cohorts.filter(c => c.program_id === p.id).map(c => ({ id: c.id, name: c.name, date: c.starts_on, terms: version(c.version_id)!.config.terms })),
        ownedCohorts: enrollments.filter(e => e.program_id === p.id && enrollmentActive(e)).map(e => e.cohort_id) };
    }),
  };
}
export async function adminProgramDetail(id: string) {
  const db = getServiceSupabase();
  const [programResult, versionsResult, cohortsResult, assetsResult, enrollmentResult] = await Promise.all([
    db.from('online_programs').select('*').eq('id', id).single(),
    db.from('online_program_versions').select('*').eq('program_id', id).order('version', { ascending: false }),
    db.from('online_program_cohorts').select('*').eq('program_id', id).order('starts_on', { ascending: false }),
    db.from('online_program_assets').select('*').eq('program_id', id).eq('ready', true).order('created_at'),
    db.from('online_program_enrollments').select('*').eq('program_id', id).order('activated_at', { ascending: false }).limit(500),
  ]);
  const program = checked(programResult) as ProgramRow, versions = checked(versionsResult) as Version[], cohorts = checked(cohortsResult) as Cohort[], assets = checked(assetsResult) as Asset[], enrollments = checked(enrollmentResult) as Enrollment[];
  const userIds = [...new Set(enrollments.map(e => e.user_id))];
  const enrollmentIds = enrollments.map(e => e.id);
  const [profileResult, progressResult] = await Promise.all([
    userIds.length ? db.from('profiles').select('id,full_name').in('id', userIds) : Promise.resolve({ data: [], error: null }),
    enrollmentIds.length ? db.from('online_program_progress').select('enrollment_id,lesson_id,completed_at,answers').in('enrollment_id', enrollmentIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const profiles = checked(profileResult), progress = checked(progressResult);
  return { program, versions, cohorts, assets,
    participants: enrollments.map(e => ({ ...e, name: profiles.find(p => p.id === e.user_id)?.full_name || 'Klient', progress: progress.filter(p => p.enrollment_id === e.id) })),
    // Private notes are intentionally neither queried nor included here.
  };
}
export type AdminProgramDetail = Awaited<ReturnType<typeof adminProgramDetail>>;
