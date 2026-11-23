-- 1. Odstránenie existujúceho unikátneho obmedzenia na dátum (pretože teraz budeme mať viac jazykov pre jeden dátum)
ALTER TABLE public.daily_signals DROP CONSTRAINT IF EXISTS daily_signals_date_key;

-- 2. Pridanie nových stĺpcov pre jazykovú podporu a proces generovania
ALTER TABLE public.daily_signals 
ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en', -- napr. 'en', 'sk', 'cs'
ADD COLUMN IF NOT EXISTS script TEXT,                               -- Celý text, ktorý bude čítať AI
ADD COLUMN IF NOT EXISTS push_text TEXT,                            -- Text pre push notifikáciu
ADD COLUMN IF NOT EXISTS spoken_audio_url TEXT,                     -- URL pre hovorené slovo (ak sa líši od audio_url)
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',      -- 'draft' (koncept), 'generated' (vygenerované), 'published' (zverejnené)
ADD COLUMN IF NOT EXISTS audio_duration INTEGER,                    -- Dĺžka audia v sekundách
ADD COLUMN IF NOT EXISTS generation_metadata JSONB;                 -- Metadáta o použitom modeli (napr. {"model": "gpt-4o", "voice": "alloy"})

-- 3. Pridanie nového unikátneho kľúča pre kombináciu (dátum + jazyk)
-- Toto zabezpečí, že pre jeden deň a jazyk existuje len jeden záznam
ALTER TABLE public.daily_signals DROP CONSTRAINT IF EXISTS daily_signals_date_language_key;
ALTER TABLE public.daily_signals 
ADD CONSTRAINT daily_signals_date_language_key UNIQUE (date, language);

-- 4. Index pre rýchlejšie vyhľadávanie obsahu podľa dátumu a jazyka
CREATE INDEX IF NOT EXISTS idx_daily_signals_date_lang ON public.daily_signals(date, language);

-- 5. Nastavenie RLS politík pre nové použitie (voliteľné, ak sa zmenili požiadavky na prístup)
-- Zatiaľ ponechávame existujúce, ale uistíme sa, že 'published' je to, čo verejnosť vidí
-- (Toto by sa riešilo v aplikačnej logike, napr. "WHERE status = 'published'")
