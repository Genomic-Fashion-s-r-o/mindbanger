import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { checkAdminAuth } from "@/lib/auth-admin";

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await checkAdminAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing keys');
  
  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;
    const authUsers = authData.users;

    const { data: profiles, error: profsError } = await supabaseAdmin.from("profiles").select("*");
    if (profsError) throw profsError;

    const { data: subs, error: subsError } = await supabaseAdmin.from("subscriptions").select("*").order("created_at", { ascending: false });
    if (subsError) throw subsError;

    const profilesMap = new Map();
    profiles.forEach(p => profilesMap.set(p.id, p));

    const subsMap = new Map();
    subs.forEach(s => {
      if (!subsMap.has(s.user_id)) {
        subsMap.set(s.user_id, s);
      } else {
        const existing = subsMap.get(s.user_id);
        if (existing.status !== 'active' && s.status === 'active') {
          subsMap.set(s.user_id, s);
        }
      }
    });

    const joinedList = authUsers.map(user => {
      const profile = profilesMap.get(user.id);
      const sub = subsMap.get(user.id);
      const st = sub ? sub.status : (profile?.subscription_status || 'free');

      return {
        id: sub ? sub.id : user.id,
        user_id: user.id,
        status: st,
        price_id: sub ? sub.price_id : null,
        current_period_end: sub ? sub.current_period_end : null,
        created_at: profile ? profile.created_at : user.created_at,
        country: sub ? sub.country : null,
        amount_total: sub ? sub.amount_total : 0,
        currency: sub ? sub.currency : 'EUR',
        customer_email: user.email,
        display_email: user.email || 'N/A',
        profiles: profile || null
      };
    });

    joinedList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(joinedList);
  } catch (error: any) {
    console.error('GET users error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
