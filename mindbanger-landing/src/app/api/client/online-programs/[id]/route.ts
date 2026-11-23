import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { clientIdentity, failure, json, readJson } from '@/lib/online-programs/http';
import { checked, clientProgramView, loadEnrollment, ProgramError } from '@/lib/online-programs/store';
import { lessonAvailability, validateAnswers } from '@/lib/online-programs/model';
const answer = z.union([z.string().max(20000), z.array(z.string().max(200)).max(20), z.number().int()]);
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }).strict(),
  z.object({ action: z.literal('progress'), lessonId: z.uuid(), answers: z.record(z.string(), answer), position: z.number().int().min(0).max(86400), complete: z.boolean(), revision: z.number().int().min(0), privateRevision: z.number().int().min(0) }).strict(),
]);
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try { const user = await clientIdentity(), { id } = await context.params; if (!z.uuid().safeParse(id).success) throw new ProgramError('Neplatný program.'); return json(await clientProgramView(user.id, id)); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const user = await clientIdentity(request), { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw new ProgramError('Neplatný program.');
    const parsed = schema.safeParse(await readJson(request, 900000));
    if (!parsed.success) throw new ProgramError('Skontroluj odpovede.');
    const input = parsed.data, { db, enrollment, config } = await loadEnrollment(user.id, id);
    if (input.action === 'start') {
      checked(await db.rpc('online_program_start', { p_id: id, p_user: user.id, p_complete_intro: true }));
      return json(await clientProgramView(user.id, id));
    }
    const index = config.lessons.findIndex(l => l.id === input.lessonId);
    if (!lessonAvailability(config, enrollment, index).available) throw new ProgramError('Lekcia ešte nie je dostupná.', 403);
    let answers;
    try { answers = validateAnswers(config.lessons[index], input.answers, input.complete); }
    catch (error) { throw new ProgramError(error instanceof Error ? error.message : 'Skontroluj odpovede.'); }
    const userDb = await createClient();
    let privateRevision = input.privateRevision;
    const privateFields = config.lessons[index].blocks.some(b => (b.type === 'question' || b.type === 'rating') && b.visibility === 'private');
    if (privateFields) {
      const row = { enrollment_id: id, user_id: user.id, lesson_id: input.lessonId, answers: answers.privateAnswers, revision: privateRevision + 1, updated_at: new Date().toISOString() };
      if (privateRevision === 0) {
        const saved = await userDb.from('online_program_private_notes').insert(row);
        if (saved.error?.code === '23505') throw new ProgramError('Zápis sa zmenil v inom okne. Obnov stránku.', 409);
        checked(saved);
      } else {
        const saved = checked(await userDb.from('online_program_private_notes').update(row).eq('enrollment_id', id).eq('user_id', user.id).eq('lesson_id', input.lessonId).eq('revision', privateRevision).select('revision'));
        if (!saved.length) throw new ProgramError('Zápis sa zmenil v inom okne. Obnov stránku.', 409);
      }
      privateRevision++;
    }
    const revision = checked(await db.rpc('online_program_progress_save', { p_enrollment: id, p_user: user.id, p_lesson: input.lessonId, p_answers: answers.shared, p_position: input.position, p_complete: input.complete, p_revision: input.revision }));
    return json({ revision, privateRevision, completed: input.complete });
  } catch (error) { return failure(error); }
}
