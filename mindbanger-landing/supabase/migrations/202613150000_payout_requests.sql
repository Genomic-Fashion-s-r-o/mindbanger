-- 1. Alter table for payout requests
-- We assume it was already created by 20260421070000_create_affiliate_tables.sql

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payout_requests') THEN
        UPDATE public.payout_requests SET paypal_email = 'Not provided' WHERE paypal_email IS NULL;

        ALTER TABLE public.payout_requests 
            ALTER COLUMN amount TYPE NUMERIC(10,2),
            ALTER COLUMN paypal_email SET NOT NULL,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payout_requests') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'payout_requests_status_check'
        ) THEN
            ALTER TABLE public.payout_requests
                ADD CONSTRAINT payout_requests_status_check
                CHECK (status IN ('pending', 'paid', 'rejected'));
        END IF;
    END IF;
END $$;

-- 2. Add Row Level Security
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payout_requests') THEN
        ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
        
        -- Default policies (recreate safely using DROP IF EXISTS approach or via direct catch block if dropping is not supported easily, but typical approach is to ignore if they already exist using a loop logic, or just wrap the table check). We'll assume the migration tool runs these once, but IF table was missing, we skip entirely.
    END IF;
END $$;

-- 3. Policies
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payout_requests') THEN

        DROP POLICY IF EXISTS "Affiliates can view their own payout requests" ON public.payout_requests;
        CREATE POLICY "Affiliates can view their own payout requests" ON public.payout_requests
            FOR SELECT USING (
                auth.uid() IN (
                    SELECT user_id FROM public.affiliates WHERE id = payout_requests.affiliate_id
                )
            );

        DROP POLICY IF EXISTS "Affiliates can insert their own payout requests" ON public.payout_requests;
        CREATE POLICY "Affiliates can insert their own payout requests" ON public.payout_requests
            FOR INSERT WITH CHECK (
                auth.uid() IN (
                    SELECT user_id FROM public.affiliates WHERE id = payout_requests.affiliate_id
                )
            );

        -- Admin policies (can do everything)
        DROP POLICY IF EXISTS "Admins have full access to payout requests" ON public.payout_requests;
        CREATE POLICY "Admins have full access to payout requests" ON public.payout_requests
            FOR ALL USING (
                (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
            );
    END IF;
END $$;
