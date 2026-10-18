
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OnboardingManager from '@/components/admin/OnboardingManager';

export default function OnboardingAdminPage() {
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/mindbanger_daily/admin/login');
      setSession(session);
    });
  }, [router]);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-serif text-amber-500 mb-2">Onboarding Sequence</h1>
                <p className="text-slate-400">Manage the first 7+ fixed days for new users.</p>
            </div>
            <button 
                onClick={() => router.push('/mindbanger_daily/admin/dashboard')}
                className="text-slate-400 hover:text-white underline"
            >
                Back to Dashboard
            </button>
        </header>
        <OnboardingManager />
      </div>
    </div>
  );
}
