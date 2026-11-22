import { checkAdminAuth } from '@/lib/auth-admin';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSecureAudioUrl } from '@/lib/cloudflare-r2';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  // Client for Authentication check
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
           try {
             cookiesToSet.forEach(({ name, value, options }) =>
               cookieStore.set(name, value, options)
             )
           } catch {}
        },
      },
    }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();     
  if (!(await checkAdminAuth())) { return NextResponse.json({ error: 'Unauthorized Admin' }, { status: 401 }); }

  const { searchParams } = new URL(request.url);
  const fileKey = searchParams.get('fileKey');

  if (!fileKey) {
    return NextResponse.json({ error: 'Missing fileKey parameter' }, { status: 400 });
  }

  try {
    const signedUrl = await getSecureAudioUrl(fileKey);
    return NextResponse.json({ signedUrl });
  } catch (error: any) {
    console.error('Error generating secure audio URL:', error);
    return NextResponse.json({ error: 'Failed to generate secure URL', details: error.message }, { status: 500 });
  }
}
