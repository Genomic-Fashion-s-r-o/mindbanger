import { assertOrigin, failure, json, readJson } from '@/lib/online-programs/http';
import { ProgramError } from '@/lib/online-programs/store';
import { startSchema, entryLimit, requireBonus, saveEntry } from '@/lib/member-funnels/entry';
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const parsed = startSchema.safeParse(await readJson(request, 3000));
    if (!parsed.success) throw new ProgramError('Zadaj platný email.');
    await entryLimit(request, parsed.data.email);
    await requireBonus(parsed.data.slug);
    const entryId=await saveEntry(parsed.data);
    return json({ ok: true,entryId });
  } catch (error) { return failure(error); }
}
