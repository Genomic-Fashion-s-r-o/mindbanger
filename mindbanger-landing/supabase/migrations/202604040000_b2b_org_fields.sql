-- Upraví tabuľku organizations pre podporu B2B platieb a affiliate sledovania

ALTER TABLE "organizations" 
ADD COLUMN IF NOT EXISTS "affiliate_id" TEXT,
ADD COLUMN IF NOT EXISTS "contact_phone" TEXT;

-- Uistíme sa, že tabuľka vie pracovať s affiliates, ale rolu affiliate necháme voliteľnú
-- Rovnako pridáme comment, prečo sú stĺpce pridané:
COMMENT ON COLUMN "organizations"."affiliate_id" IS 'ID použitého affiliate partnera, ktorý organizáciu priviedol (nullable)';
COMMENT ON COLUMN "organizations"."contact_phone" IS 'Kontaktné telefónne číslo na administrátora pre B2B predaj';
