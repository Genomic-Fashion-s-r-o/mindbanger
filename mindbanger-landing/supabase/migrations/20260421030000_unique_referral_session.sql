DO $ $
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'uq_referrals_stripe_session'
    ) THEN
        ALTER TABLE public.referrals ADD CONSTRAINT uq_referrals_stripe_session UNIQUE (stripe_session_id);
    END IF;
END $ $;
