-- Function to atomically create a payout request and link pending referrals
CREATE OR REPLACE FUNCTION create_payout_request(p_affiliate_id UUID, p_paypal_email TEXT)
RETURNS UUID AS $$
DECLARE
    v_payout_id UUID;
    v_calculated_amount NUMERIC(10,2);
    v_pending_count INT;
BEGIN
    -- 1. Check if there's already a pending payout request for this affiliate
    SELECT count(*) INTO v_pending_count
    FROM public.payout_requests
    WHERE affiliate_id = p_affiliate_id AND status = 'pending';

    IF v_pending_count > 0 THEN
        RAISE EXCEPTION 'Máte už jeden nespracovaný výber (pending). Počkajte na jeho vybavenie.' USING ERRCODE = 'P0001';
    END IF;

    -- 2. Calculate sum of pending commission amounts mapping only those without a payout request
    SELECT COALESCE(SUM(commission_amount), 0)
    INTO v_calculated_amount
    FROM public.referrals
    WHERE affiliate_id = p_affiliate_id AND status = 'pending' AND payout_request_id IS NULL;

    IF v_calculated_amount < 20 THEN
        RAISE EXCEPTION 'Vypočítaná suma je menšia ako minimálny výber (20 EUR)' USING ERRCODE = 'P0002';
    END IF;

    -- 3. Create the payout request
    INSERT INTO public.payout_requests (affiliate_id, amount, status, paypal_email)
    VALUES (p_affiliate_id, v_calculated_amount, 'pending', p_paypal_email)
    RETURNING id INTO v_payout_id;

    -- 4. Atomically link all unlinked pending referrals to this new request
    UPDATE public.referrals
    SET payout_request_id = v_payout_id
    WHERE affiliate_id = p_affiliate_id AND status = 'pending' AND payout_request_id IS NULL;

    RETURN v_payout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke public execution to prevent unauthorized or context-skipping calls
REVOKE EXECUTE ON FUNCTION create_payout_request(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_payout_request(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION create_payout_request(UUID, TEXT) FROM authenticated;

-- Grant execution explicitly to the backend service role
GRANT EXECUTE ON FUNCTION create_payout_request(UUID, TEXT) TO service_role;
