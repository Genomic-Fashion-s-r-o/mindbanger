import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase-service';
import { adminIdentity, failure, json, readJson } from '@/lib/online-programs/http';
import { adminProgramDetail, checked, ProgramError } from '@/lib/online-programs/store';
import { assetTypes, dateSchema, MAX_ASSET_BYTES, PROGRAM_BUCKET, programConfigSchema, programVariants, publishProblems, referencedAssets, type Asset, type ProgramConfig } from '@/lib/online-programs/model';
export const dynamic = 'force-dynamic';
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), id: z.uuid().nullable(), revision: z.number().int().min(0), slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100), draft: programConfigSchema }).strict(),
  z.object({ action: z.literal('publish'), id: z.uuid(), revision: z.number().int().min(0) }).strict(),
  z.object({ action: z.literal('sales'), id: z.uuid(), revision: z.number().int().min(0), enabled: z.boolean(), price: z.number().int().min(0).max(10000000) }).strict(),
  z.object({ action: z.literal('cohort'), id: z.uuid().nullable(), programId: z.uuid(), name: z.string().trim().min(2).max(160), date: dateSchema, status: z.enum(['open', 'closed']) }).strict(),
  z.object({ action: z.literal('grant'), programId: z.uuid(), userId: z.uuid(), cohortId: z.uuid().nullable() }).strict(),
  z.object({ action: z.literal('revoke'), id: z.uuid(), programId: z.uuid() }).strict(),
  z.object({ action: z.literal('asset'), programId: z.uuid(), name: z.string().trim().min(1).max(200), mime: z.enum(assetTypes), size: z.number().int().min(1).max(MAX_ASSET_BYTES) }).strict(),
  z.object({ action: z.literal('assetComplete'), id: z.uuid(), programId: z.uuid() }).strict(),
]);
export async function GET(request: Request) {
  try {
    await adminIdentity();
    const url = new URL(request.url), db = getServiceSupabase();
    if (url.searchParams.has('search')) {
      const search = (url.searchParams.get('search') || '').slice(0, 100);
      return json({ clients: checked(await db.rpc('online_program_candidates', { p_search: search })) });
    }
    const id = url.searchParams.get('id');
    if (id) { if (!z.uuid().safeParse(id).success) throw new ProgramError('Neplatný program.'); return json(await adminProgramDetail(id)); }
    const result = await db.from('online_programs').select('id,slug,title,revision,published_version_id,sales_enabled,price_cents').order('created_at');
    if (result.error?.code === '42P01' || result.error?.code === 'PGRST205') return json({ installed: false, programs: [] });
    return json({ installed: true, programs: checked(result), paymentsConfigured: !!process.env.PROGRAM_STRIPE_SECRET_KEY && !!process.env.PROGRAM_STRIPE_WEBHOOK_SECRET });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const admin = await adminIdentity(request);
    const parsed = actionSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new ProgramError(parsed.error.issues[0]?.message || 'Skontroluj zadané údaje.');
    const input = parsed.data, db = getServiceSupabase();
    if (input.action === 'save') {
      const id = checked(await db.rpc('online_program_save', { p_id: input.id, p_revision: input.revision, p_slug: input.slug, p_draft: input.draft, p_actor: admin.id }));
      return json({ id });
    }
    if (input.action === 'publish') {
      const program = checked(await db.from('online_programs').select('draft,revision').eq('id', input.id).single());
      if (program.revision !== input.revision) throw new ProgramError('Koncept sa medzičasom zmenil. Obnov stránku.', 409);
      const config = programConfigSchema.parse(program.draft), problems = publishProblems(config);
      if (problems.length) throw new ProgramError(problems.join('\n'));
      const ids = referencedAssets(config);
      const assets = ids.length ? checked(await db.from('online_program_assets').select('*').eq('program_id', input.id).eq('ready', true).in('id', ids)) as Asset[] : [];
      if (assets.length !== ids.length) throw new ProgramError('Niektorý súbor chýba alebo ešte nie je nahraný.');
      const compatible = (assetId: string, type: string) => assets.some(a => a.id === assetId && (type === 'pdf' ? a.mime === 'application/pdf' : a.mime.startsWith(type + '/')));
      for(const variant of programVariants(config)){
      if (variant.intro.videoAssetId && !compatible(variant.intro.videoAssetId, 'video')) throw new ProgramError('Úvod potrebuje video súbor.');
      for (const lesson of variant.lessons) for (const block of lesson.blocks) if ('assetId' in block && block.assetId && !compatible(block.assetId, block.type)) throw new ProgramError('Typ nahraného súboru nezodpovedá bloku lekcie.');
      }
      checked(await db.rpc('online_program_publish', { p_id: input.id, p_revision: input.revision, p_actor: admin.id }));
      return json({ ok: true });
    }
    if (input.action === 'cohort') {
      const id = checked(await db.rpc('online_program_cohort_save', { p_id: input.id, p_program: input.programId, p_name: input.name, p_date: input.date, p_status: input.status, p_actor: admin.id }));
      return json({ id });
    }
    if (input.action === 'sales') {
      if (input.enabled) {
        if (!process.env.PROGRAM_STRIPE_SECRET_KEY || !process.env.PROGRAM_STRIPE_WEBHOOK_SECRET) throw new ProgramError('Najprv nastav platobné pripojenie online programov na serveri.');
        if (input.price <= 0) throw new ProgramError('Nastav cenu programu.');
        const p = checked(await db.from('online_programs').select('published_version_id').eq('id', input.id).single());
        if (!p.published_version_id) throw new ProgramError('Najprv publikuj obsah.');
        const version = checked(await db.from('online_program_versions').select('config').eq('id', p.published_version_id).single());
        if ((version.config as ProgramConfig).terms.trim().length < 20) throw new ProgramError('Doplň podmienky nákupu a publikuj ich spolu s programom.');
      }
      const result = checked(await db.from('online_programs').update({ sales_enabled: input.enabled, price_cents: input.price, revision: input.revision + 1, updated_at: new Date().toISOString() }).eq('id', input.id).eq('revision', input.revision).select('id'));
      if (!result.length) throw new ProgramError('Nastavenie sa zmenilo. Obnov stránku.', 409);
      checked(await db.from('online_program_audit').insert({ actor_id: admin.id, program_id: input.id, action: input.enabled ? 'sales_opened' : 'sales_closed' }).select('id'));
      return json({ ok: true });
    }
    if (input.action === 'grant') {
      const id = checked(await db.rpc('online_program_grant', { p_user: input.userId, p_program: input.programId, p_cohort: input.cohortId, p_actor: admin.id }));
      return json({ id });
    }
    if (input.action === 'revoke') {
      const rows = checked(await db.from('online_program_enrollments').update({ status: 'revoked' }).eq('id', input.id).eq('program_id', input.programId).select('id'));
      if (!rows.length) throw new ProgramError('Účasť sa nenašla.', 404);
      checked(await db.from('online_program_audit').insert({ actor_id: admin.id, program_id: input.programId, action: 'access_revoked', subject_id: input.id }).select('id'));
      return json({ ok: true });
    }
    if (input.action === 'asset') {
      const id = crypto.randomUUID(), name = input.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${input.programId}/${id}/${name}`;
      checked(await db.from('online_program_assets').insert({ id, program_id: input.programId, path, name: input.name, mime: input.mime, size_bytes: input.size }).select('id'));
      const result = await db.storage.from(PROGRAM_BUCKET).createSignedUploadUrl(path);
      if (result.error || !result.data) throw new ProgramError('Nahrávanie je dočasne nedostupné.', 503);
      return json({ id, path, token: result.data.token });
    }
    const asset = checked(await db.from('online_program_assets').select('*').eq('id', input.id).eq('program_id', input.programId).single()) as Asset;
    const result = await db.storage.from(PROGRAM_BUCKET).info(asset.path);
    if (result.error || !result.data || Number(result.data.size) !== asset.size_bytes || result.data.contentType !== asset.mime) throw new ProgramError('Súbor sa nenahral celý alebo má odlišný typ. Skús nahrávanie znova.');
    checked(await db.from('online_program_assets').update({ ready: true }).eq('id', asset.id).select('id'));
    return json({ asset: { ...asset, ready: true } });
  } catch (error) { return failure(error); }
}
