import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

// Legacy callers only need session.user. Verify with Auth, never trust cookie data.
export async function getVerifiedSession(client: SupabaseClient) {
  const { data: { user }, error } = await client.auth.getUser();
  return { data: { session: user && !error ? { user } : null }, error };
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Skript pre admin pristup bez RLS obmedzeni (napr. na webooky)
export async function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // This MUST NOT be NEXT_PUBLIC
    {
      cookies: {
        getAll() { return [] },
        setAll() {}
      }
    }
  );
}
