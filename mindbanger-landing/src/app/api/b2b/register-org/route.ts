import { DAILY_ENABLED } from '@/lib/client-platform';
import { getVerifiedSession } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-service';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  if (!DAILY_ENABLED) return NextResponse.json({ error: 'Program Mindbanger Daily je momentálne vypnutý.' }, { status: 410 });
    try {
        const { companyName, email, industry, initialSeats, phone, affiliateId, newUserId } = await req.json();

        // 1. Validated Authenticated User
        const supabase = await createClient();
        const { data: { session } } = await getVerifiedSession(supabase);
        
        let userId = session?.user?.id;

        const supabaseAdmin = getServiceSupabase();

        // Fallback: check Authorization header if session is not yet in cookies
        if (!userId) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
                if (user && !userError) {
                    userId = user.id;
                }
            }
        }

        if (!userId) {
            return new NextResponse('Unauthorized: Please sign in first', { status: 401 });
        }

        // Use SERVICE ROLE key because a new user has no rights to create organizations
        
        // 2. Create Organization
        // Status: 'registered' - means account created but not yet active/paid.
        // Seats: 0 - cannot invite anyone yet (or can invite but they won't get access).
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({
                name: companyName,
                billing_email: email, // Required parameter
                affiliate_id: affiliateId || null // Save affiliate reference
            })
            .select()
            .single();

        if (orgError) throw orgError;

        // 2. Link User as Owner
        const { error: memberError } = await supabaseAdmin
            .from('organization_members')
            .insert({
                organization_id: org.id,
                user_id: userId,
                email: email, // Required column
                role: 'owner',
                status: 'active'
            });

        if (memberError) throw memberError;

        return NextResponse.json({ success: true, orgId: org.id });

    } catch (e: any) {
        console.error('Registration Error:', e);
        return new NextResponse(JSON.stringify({ message: e.message || 'Error occurred' }), { status: 500 });
    }
}