import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { checkAdminAuth } from "@/lib/auth-admin";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!(await checkAdminAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, fullName } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, supabaseServiceKey);

    // Aktualizácia profilu (Service Role key prepíše RLS)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", userId);

    if (profileError) {
      throw profileError;
    }

    // Ak chceme aktualizovať aj auth layer metadata 
    // (táto vrstva drží meno napr z Google SSO, môže pomôcť ak sa lognú znova)
    try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userData?.user) {
           await supabaseAdmin.auth.admin.updateUserById(userId, {
              user_metadata: {
                 ...userData.user.user_metadata,
                 full_name: fullName
              }
           });
        }
    } catch (authErr) {
        console.error("Could not update auth metadata, non-critical:", authErr);
    }

    return NextResponse.json({ success: true, fullName });

  } catch (error: any) {
    console.error("Update name error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}