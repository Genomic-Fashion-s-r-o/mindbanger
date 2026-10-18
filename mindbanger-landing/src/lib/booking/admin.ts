import 'server-only';
import { createClient } from '@/lib/supabase-server';
export const ADMIN_EMAILS = ['miroslav.jobus@gmail.com', 'jobusmiro@gmail.com'];
export async function bookingAdmin(requireMfa = true) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return null;
  if (requireMfa) {
    const { data, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (mfaError || data?.currentLevel !== 'aal2') return null;
  }
  return user;
}
