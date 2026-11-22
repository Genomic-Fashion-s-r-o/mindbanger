-- Add explicit columns for meditation text and focus text
ALTER TABLE public.daily_signals
ADD COLUMN IF NOT EXISTS meditation_text TEXT;

ALTER TABLE public.daily_signals
ADD COLUMN IF NOT EXISTS focus_text TEXT;

COMMENT ON COLUMN public.daily_signals.meditation_text IS 'Text for the guided meditation script';
COMMENT ON COLUMN public.daily_signals.focus_text IS 'Daily focus text (short mantra/vibe)';
