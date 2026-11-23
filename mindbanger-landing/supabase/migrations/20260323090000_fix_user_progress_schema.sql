-- Fix type mismatch for user_progress table
-- The previous migration created signal_id as UUID, but daily_signals.id is BIGINT.

-- Drop the table to recreate with correct schema
DROP TABLE IF EXISTS public.user_progress;

CREATE TABLE public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signal_id UUID NOT NULL REFERENCES public.daily_signals(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, signal_id) -- User can complete a signal only once
);

-- Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Re-create policies
CREATE POLICY "Users can view own daily progress" ON public.user_progress
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can track own daily progress" ON public.user_progress
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_user_progress_user_signal ON public.user_progress(user_id, signal_id);
