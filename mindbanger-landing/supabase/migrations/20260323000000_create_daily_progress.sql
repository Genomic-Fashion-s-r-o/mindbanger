-- Create table for tracking daily signal completions (user_progress)
-- If it already exists, ensure it has the correct structure (though we assume it's missing based on errors)
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.daily_signals(id) ON DELETE CASCADE, -- Assumes daily_signals exists and has UUID PK
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, signal_id)
);

-- RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own daily progress" ON public.user_progress;
CREATE POLICY "Users can view own daily progress" ON public.user_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can track own daily progress" ON public.user_progress;
CREATE POLICY "Users can track own daily progress" ON public.user_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_progress_user_signal ON public.user_progress(user_id, signal_id);
