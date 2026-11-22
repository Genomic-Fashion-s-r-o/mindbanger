-- Add JSONB column for rich master content
ALTER TABLE public.daily_signals
ADD COLUMN IF NOT EXISTS content_payload JSONB;
