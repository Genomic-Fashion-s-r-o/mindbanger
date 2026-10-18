import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase-service';
import { clientProfileSchema } from '@/lib/client-validation';
import { sameOrigin } from '@/lib/booking/store';
import { CLIENT_TERMS_VERSION } from '@/lib/client-platform';
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Neplatný pôvod požiadavky.' }, { status: 403 });
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Prihláste sa znova.' }, { status: 401 });
  try {
    if (Number(request.headers.get('content-length')) > 5000) return NextResponse.json({ error: 'Príliš veľká požiadavka.' }, { status: 413 });
    const parsed = clientProfileSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Skontrolujte údaje profilu.' }, { status: 400 });
    const p = parsed.data;
    const service = getServiceSupabase();
    // The authenticated identity supplies the row ID; no permission or billing fields are accepted.
    const { error: saveError } = await service.from('profiles').upsert({ id: user.id, full_name: p.fullName, preferred_language: p.language, timezone: p.timezone }, { onConflict: 'id' });
    if (saveError) throw saveError;
    if (p.accepted) {
      const { error: consentError } = await service.from('client_consents').upsert({ user_id: user.id, version: CLIENT_TERMS_VERSION }, { onConflict: 'user_id,version', ignoreDuplicates: true });
      if (consentError) throw consentError;
    }
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Údaje sa nepodarilo uložiť. Skúste to znova.' }, { status: 503 }); }
}
