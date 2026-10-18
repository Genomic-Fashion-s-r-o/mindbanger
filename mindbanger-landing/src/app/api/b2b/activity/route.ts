import { getVerifiedSession } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase-service';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const orgId = searchParams.get('orgId');
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        if (!orgId || !start || !end) {
            return new NextResponse('Missing parameters', { status: 400 });
        }

        // 1. Verify user's session and permissions
        const supabase = await createClient();
        const { data: { session } } = await getVerifiedSession(supabase);

        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', orgId)
            .eq('user_id', session.user.id)
            .in('role', ['owner', 'admin'])
            .single();

        if (!membership) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        // 2. Fetch all members with accounts
        const supabaseAdmin = getServiceSupabase();
        
        const { data: orgMembers, error: membersError } = await supabaseAdmin
            .from('organization_members')
            .select(`
                user_id,
                email,
                profiles (
                   full_name
                )
            `)
            .eq('organization_id', orgId)
            .eq('status', 'active')
            .not('user_id', 'is', null);

        if (membersError) throw membersError;

        const userIds = orgMembers?.map(m => m.user_id) || [];

        if (userIds.length === 0) {
            // No active members yet
            return NextResponse.json({ members: [] });
        }

        // 3. Fetch progress logs
        // Daily progress
        const { data: dailyProgress, error: dailyError } = await supabaseAdmin
            .from('user_progress')
            .select('user_id, completed_at')
            .in('user_id', userIds)
            .gte('completed_at', start)
            .lte('completed_at', end);

        if (dailyError) throw dailyError;

        // Corporate progress
        const { data: corpProgress, error: corpError } = await supabaseAdmin
            .from('user_progress_corporate')
            .select('user_id, completed_at')
            .in('user_id', userIds)
            .gte('completed_at', start)
            .lte('completed_at', end);

        if (corpError) throw corpError;

        // Corporate Onboarding progress
        const { data: corpOnboardingProgress, error: corpOnboardingError } = await supabaseAdmin
            .from('user_progress_corporate_onboarding')
            .select('user_id, completed_at')
            .in('user_id', userIds)
            .gte('completed_at', start)
            .lte('completed_at', end);

        if (corpOnboardingError) throw corpOnboardingError;

        // 4. Map the data efficiently
        const membersData = orgMembers.map(m => {
            const userId = m.user_id;

            // Extract date strings (YYYY-MM-DD) natively
            const dailyLogs = dailyProgress
                .filter(p => p.user_id === userId)
                .map(p => new Date(p.completed_at).toISOString().split('T')[0]);

            const corpLogsRaw = [
                ...corpProgress.filter(p => p.user_id === userId),
                ...corpOnboardingProgress.filter(p => p.user_id === userId)
            ];
            
            const corpLogs = corpLogsRaw.map(p => new Date(p.completed_at).toISOString().split('T')[0]);
            // Deduplicate per day
            const dailyDates = Array.from(new Set(dailyLogs));
            const corpDates = Array.from(new Set(corpLogs));

            const profiles = m.profiles as any;
            return {
                id: userId,
                name: (Array.isArray(profiles) ? profiles[0]?.full_name : profiles?.full_name) || m.email,
                email: m.email,
                dailyLogs: dailyDates,
                corpLogs: corpDates
            };
        });

        return NextResponse.json({ members: membersData });

    } catch (e: any) {
        console.error('B2B Activity fetch error:', e);
        return new NextResponse(e.message || 'Internal Server Error', { status: 500 });
    }
}