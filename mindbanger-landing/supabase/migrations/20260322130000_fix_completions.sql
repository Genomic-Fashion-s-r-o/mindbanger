
-- 1. Onboarding Progress
CREATE TABLE IF NOT EXISTS public.user_progress_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    signal_id UUID REFERENCES public.onboarding_signals(id) ON DELETE CASCADE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, signal_id) -- User can complete a signal only once
);

-- 2. Corporate Progress
CREATE TABLE IF NOT EXISTS public.user_progress_corporate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    signal_id UUID REFERENCES public.corporate_signals(id) ON DELETE CASCADE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, signal_id)
);

-- RLS
ALTER TABLE public.user_progress_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress_corporate ENABLE ROW LEVEL SECURITY;

-- Policies Onboarding
DROP POLICY IF EXISTS "Users can view own onboarding progress" ON public.user_progress_onboarding;
CREATE POLICY "Users can view own onboarding progress" ON public.user_progress_onboarding
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can track own onboarding progress" ON public.user_progress_onboarding;
CREATE POLICY "Users can track own onboarding progress" ON public.user_progress_onboarding
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policies Corporate
DROP POLICY IF EXISTS "Users can view own corporate progress" ON public.user_progress_corporate;
CREATE POLICY "Users can view own corporate progress" ON public.user_progress_corporate
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can track own corporate progress" ON public.user_progress_corporate;
CREATE POLICY "Users can track own corporate progress" ON public.user_progress_corporate
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
