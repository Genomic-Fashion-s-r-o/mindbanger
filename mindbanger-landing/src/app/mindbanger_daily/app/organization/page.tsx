import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n';
import OrganizationDashboard from '@/components/organization/OrganizationDashboard';
import B2BLanguageSwitcher from '@/components/b2b/B2BLanguageSwitcher';

export const revalidate = 0;

export default async function OrganizationPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/mindbanger_daily/login');
  }

  // 1. Get User's Organization(s) where they are Admin/Owner
  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select(`
      role,
      organizations (
        id,
        name,
        tax_id,
        billing_email,
        seats_limit,
        subscription_status,
        industry
      )
    `)
    .eq('user_id', session.user.id)
    .in('role', ['owner', 'admin'])
    .eq('status', 'active')
    .single();

  if (membershipError && membershipError.code !== 'PGRST116') {
      console.error("Organization Membership Error:", membershipError);
      return <div className="p-20 pt-32 text-red-500">Error loading membership: {JSON.stringify(membershipError)}</div>;
  }

  if (!membership || !membership.organizations) {
    // User is not an admin or owner of any organization
    // Redirect them back to their personal space
    redirect('/mindbanger_daily/app/today');
  }

  // Supabase typing for joined tables needs explicit definition
  const orgData = membership.organizations;
  const organization = Array.isArray(orgData) ? orgData[0] : (orgData as any);
  const userRole = membership.role;

  // 2. Get All Members of this Organization
    const { data: rawMembers, error: membersError } = await supabase
      .from('organization_members')
      .select(`
        id,
        email,
        role,
        status,
        created_at,
        user_id
      `)
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });

    if (membersError) {
        console.error("Fetch members error:", membersError);
    }
    
    let members = rawMembers || [];

    // Manually fetch profiles since joining across schemas without direct FK causes PGRST200
    const profileUserIds = members.filter(m => m.user_id !== null).map(m => m.user_id);
    if (profileUserIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', profileUserIds);
            
        if (profiles) {
            members = members.map(m => {
                const p = profiles.find(pr => pr.id === m.user_id);
                return { ...m, profiles: p ? { full_name: p.full_name, avatar_url: p.avatar_url } : null };
            });
        }
    }
  // 3. Get Dictionary
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language')
    .eq('id', session.user.id)
    .single();

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get('user-lang')?.value;
    
  const lang = cookieLang || profile?.preferred_language || 'en';
  const dict = getDictionary(lang);

  // 4. Analytics (Basic)
  const userIds = members?.filter(m => m.user_id).map(m => m.user_id) || [];
  const stats = {
      corporate: 0,
      daily: 0
  };

  if (userIds.length > 0) {
      const { count: corpCount } = await supabase
        .from('user_progress_corporate')
        .select('*', { count: 'exact', head: true })
        .in('user_id', userIds);
      
      const { count: corpOnboardingCount } = await supabase
        .from('user_progress_corporate_onboarding')
        .select('*', { count: 'exact', head: true })
        .in('user_id', userIds);

      const { count: dailyCount } = await supabase
        .from('user_progress') // Correct table for daily signals
        .select('*', { count: 'exact', head: true })
        .in('user_id', userIds);

      stats.corporate = (corpCount || 0) + (corpOnboardingCount || 0);
      stats.daily = dailyCount || 0;
  }

  return (
    <div className="py-6 space-y-8">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-white mb-2">{organization.name}</h1>
          <p className="text-slate-400">
             {(lang === 'sk' || lang === 'cs') ? 'Správa organizácie' : 'Organization Management'} • {userRole === 'owner' ? ((lang === 'sk' || lang === 'cs') ? 'Vlastník' : 'Owner') : 'Admin'}
          </p>
        </div>
        <div className="flex bg-slate-900 rounded-full px-4 py-2 border border-white/5 shadow-inner">
          <B2BLanguageSwitcher initialLang={((lang === 'sk' || lang === 'cs') || lang === 'cs' || lang === 'en') ? lang : 'en'} />
        </div>
      </header>

      <OrganizationDashboard 
        organization={organization}
        initialMembers={members || []}
        userRole={userRole}
        lang={lang}
        dict={dict}
        stats={stats}
      />
    </div>
  );
}
