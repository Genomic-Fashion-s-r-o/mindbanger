import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { checkAdminAuth } from "@/lib/auth-admin";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(await checkAdminAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";

  if (q.length < 3) {
    return NextResponse.json([]);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Fetch profiles based on full_name
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .ilike("full_name", `%${q}%`)
      .limit(20);

    // 2. Fetch subscriptions based on customer_email
    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, customer_email")
      .ilike("customer_email", `%${q}%`)
      .limit(20);

    // 3. Spojíme profily podľa reálnych Auth dát (toto je spoľahlivejšie, ak by mali Google mail namiesto full_name)
    const { data: allUsersData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    const usersMap = new Map();

    // Namapujeme si priamo auth dáta na IDčká, pre presné e-maily a mená ak existujú
    if (allUsersData?.users) {
        // Skúsime pridať aj tých, lognutých cez auth, ktorým presne machuje email
        const matchedByEmail = allUsersData.users.filter(u => 
             u.email?.toLowerCase().includes(q.toLowerCase()) || 
             u.user_metadata?.full_name?.toLowerCase().includes(q.toLowerCase())
        );

        for (const u of matchedByEmail) {
            usersMap.set(u.id, {
                id: u.id,
                full_name: u.user_metadata?.full_name || u.email, // fallback full_name na email
                email: u.email
            });
        }
    }

    // Pridáme výsledky z profilov, ak náhodou neprešli auth matchovaním
    if (profs) {
      for (const p of profs) {
        if (!usersMap.has(p.id)) {
            // Potrebujeme doplniť email
            let emailFallback = null;
            if (allUsersData?.users) {
               const authUser = allUsersData.users.find(x => x.id === p.id);
               if (authUser) emailFallback = authUser.email;
            }
            usersMap.set(p.id, {
               id: p.id,
               full_name: p.full_name,
               email: emailFallback || "Neznámy email"
            });
        }
      }
    }

    // Pridáme výsledky zo subscriptions (ak nakúpili cez checkout ale chýba im iný zápis)
    if (subs) {
      for (const s of subs) {
        if (s.user_id && !usersMap.has(s.user_id)) {
            let nameFallback = s.customer_email;
            if (allUsersData?.users) {
                const authUser = allUsersData.users.find(x => x.id === s.user_id);
                if (authUser && authUser.user_metadata?.full_name) {
                    nameFallback = authUser.user_metadata.full_name;
                }
            }
            usersMap.set(s.user_id, {
               id: s.user_id,
               full_name: nameFallback,
               email: s.customer_email
            });
        }
      }
    }

    return NextResponse.json(Array.from(usersMap.values()).slice(0, 10)); // max 10 výsledkov

  } catch (error: any) {
    console.error("GET search users error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}