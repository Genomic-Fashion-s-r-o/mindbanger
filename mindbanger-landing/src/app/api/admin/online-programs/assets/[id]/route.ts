import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-service';
import { adminIdentity, failure, privateHeaders } from '@/lib/online-programs/http';
import { checked, ProgramError } from '@/lib/online-programs/store';
import { PROGRAM_BUCKET } from '@/lib/online-programs/model';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await adminIdentity(); const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw new ProgramError('Neplatný súbor.');
    const db = getServiceSupabase(), asset = checked(await db.from('online_program_assets').select('path').eq('id', id).eq('ready', true).single());
    const result = await db.storage.from(PROGRAM_BUCKET).createSignedUrl(asset.path, 3600);
    if (result.error || !result.data) throw new ProgramError('Súbor je dočasne nedostupný.', 503);
    return NextResponse.redirect(result.data.signedUrl, { status: 307, headers: privateHeaders });
  } catch (error) { return failure(error); }
}
