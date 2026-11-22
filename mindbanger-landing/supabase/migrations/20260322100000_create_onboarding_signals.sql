
-- Create onboarding_signals table
CREATE TABLE IF NOT EXISTS public.onboarding_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_number INTEGER NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    
    -- Content Fields (Mirroring daily_signals)
    theme TEXT,
    title TEXT,
    signal_text TEXT,
    script TEXT,
    focus_text TEXT,
    focus TEXT,
    affirmation TEXT,
    meditation_text TEXT,
    push_text TEXT,
    
    -- Media
    audio_url TEXT,
    spoken_audio_url TEXT,
    meditation_audio_url TEXT,
    
    -- Meta
    generation_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Constraints
    UNIQUE(day_number, language)
);

-- Comments
COMMENT ON TABLE public.onboarding_signals IS 'Fixed sequence of signals for new users (Days 1-7+)';
COMMENT ON COLUMN public.onboarding_signals.day_number IS 'Sequence number (1 = First day after signup)';

-- Policies (RLS)
ALTER TABLE public.onboarding_signals ENABLE ROW LEVEL SECURITY;

-- Allow read for everyone (authenticated)
CREATE POLICY "Allow read access for authenticated users" ON public.onboarding_signals
    FOR SELECT TO authenticated USING (true);

-- Allow full access for admins (service role or specific users - simplified here to public for admin tools if needed, but safer to restrict)
-- For now, assuming admin uses service role or we rely on app logic. 
-- Let's allow public read for dev simplicity if needed, but strictly:
CREATE POLICY "Allow full access for service role" ON public.onboarding_signals
    FOR ALL TO service_role USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_signals;
