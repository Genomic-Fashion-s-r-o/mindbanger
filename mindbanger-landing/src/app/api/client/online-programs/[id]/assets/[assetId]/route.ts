import { z } from 'zod';
import { NextResponse } from 'next/server';
import { clientIdentity, failure, privateHeaders } from '@/lib/online-programs/http';
import { checked, loadEnrollment, ProgramError } from '@/lib/online-programs/store';
import { lessonAvailability, programVariants, PROGRAM_BUCKET } from '@/lib/online-programs/model';
export async function GET(_request: Request, context: { params: Promise<{ id: string; assetId: string }> }) {
  try {
    const user = await clientIdentity(), { id, assetId } = await context.params;
    if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(assetId).success) throw new ProgramError('Neplatný súbor.');
    const { db, enrollment, config } = await loadEnrollment(user.id, id);
    const allowed = programVariants(config).some(variant=>variant.intro.videoAssetId === assetId || variant.lessons.some((lesson, index) => lessonAvailability(config, enrollment, index).available && lesson.blocks.some(b => 'assetId' in b && b.assetId === assetId)));
    if (!allowed) throw new ProgramError('Súbor teraz nie je dostupný.', 403);
    const asset = checked(await db.from('online_program_assets').select('path,name,mime').eq('id', assetId).eq('program_id', enrollment.program_id).eq('ready', true).single());
    const result = await db.storage.from(PROGRAM_BUCKET).createSignedUrl(asset.path, 3600, asset.mime === 'application/pdf' ? { download: asset.name } : undefined);
    if (result.error || !result.data) throw new ProgramError('Súbor je dočasne nedostupný.', 503);
    return NextResponse.redirect(result.data.signedUrl, { status: 307, headers: privateHeaders });
  } catch (error) { return failure(error); }
}
