import {portalLocale} from '@/lib/portal-locale-server';
import {portalPath} from '@/lib/portal-locale';
import { createClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase-service';
import { ADMIN_EMAILS } from '@/lib/booking/admin';
import { assertOrigin, failure, json, readJson } from '@/lib/online-programs/http';
import { checked, ProgramError } from '@/lib/online-programs/store';
import { passwordSchema, loadEntry, clearEntry, entryLimit, requireBonus, grantBonus } from '@/lib/member-funnels/entry';

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const parsed = passwordSchema.safeParse(await readJson(request, 4000));
    if (!parsed.success) throw new ProgramError(parsed.error.issues[0]?.message || 'Skontroluj údaje.');
    const input = parsed.data, intent = await loadEntry(input.entryId);
    await entryLimit(request, intent.email);
    const funnel = await requireBonus(intent.slug), service = getServiceSupabase(), db = await createClient();
    // Starting another bonus must never silently replace an already signed-in identity.
    const current = await db.auth.getUser();
    if (current.data.user) {
      if(current.data.user.email?.toLowerCase()!==intent.email)throw new ProgramError('Už si prihlásený/á do iného účtu. Otvor odkaz na bonus znova.',409);
      const access=await grantBonus(current.data.user.id,intent.email,funnel.id);
      await clearEntry();return json({redirect:portalPath('/ucet/ponuka/'+access,await portalLocale())});
    }
    let createdId: string | null = null;
    if (input.mode === 'create') {
      if (ADMIN_EMAILS.includes(intent.email)) return json({ error: 'Použi existujúce prihlásenie alebo emailový odkaz.', code: 'account_exists' }, 409);
      // Only create a NEW identity. Never set a password on an email-selected existing user.
      // This is intentionally instant signup; auto-confirm is not proof of mailbox ownership.
      const result = await service.auth.admin.createUser({ email: intent.email, password: input.password, email_confirm: true,
        app_metadata: { signup_source: 'bonus_password', email_ownership: 'unverified' } });
      if (result.error) {
        if (['email_exists', 'user_already_exists'].includes(result.error.code || '')) return json({ error: 'Tento email už má účet. Zadaj svoje existujúce heslo alebo použi odkaz do emailu.', code: 'account_exists' }, 409);
        throw new ProgramError(result.error.code === 'weak_password' ? 'Zvoľ silnejšie heslo s aspoň 12 znakmi.' : 'Účet sa nepodarilo vytvoriť. Skús prihlásenie alebo emailový odkaz.', 400);
      }
      createdId = result.data.user?.id || null;
      if (!createdId) throw new ProgramError('Účet sa nepodarilo vytvoriť.', 503);
      // Write demographics only for the identity just created, never to an existing account.
      checked(await service.from('profiles').upsert({ id: createdId, birth_year: input.birthYear }, { onConflict: 'id' }));
    }
    const { data, error } = await db.auth.signInWithPassword({ email: intent.email, password: input.password });
    if (error || !data.user || (createdId && data.user.id !== createdId)) throw new ProgramError('Email alebo heslo nesedí. Použi existujúce heslo alebo prihlasovací odkaz.', 401);
    const access = await grantBonus(data.user.id, intent.email, funnel.id);
    await clearEntry();
    return json({ redirect: portalPath('/ucet/ponuka/' + access,await portalLocale()) });
  } catch (error) { return failure(error); }
}
