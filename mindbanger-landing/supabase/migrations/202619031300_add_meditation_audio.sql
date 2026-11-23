-- Add explicit column for guided meditation audio
ALTER TABLE public.daily_signals
ADD COLUMN IF NOT EXISTS meditation_audio_url TEXT;

COMMENT ON COLUMN public.daily_signals.meditation_audio_url IS 'URL to the guided meditation audio file';
