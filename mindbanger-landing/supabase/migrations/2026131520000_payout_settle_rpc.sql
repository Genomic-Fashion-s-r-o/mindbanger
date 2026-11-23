DROP FUNCTION IF EXISTS admin_settle_payout(UUID);

CREATE OR REPLACE FUNCTION admin_settle_payout(payout_id UUID)
RETURNS boolean AS $$
DECLARE
    updated_count integer;
BEGIN
    UPDATE public.payout_requests
    SET status = 'paid', updated_at = NOW()
    WHERE id = payout_id AND status = 'pending';

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    IF updated_count > 0 THEN
        UPDATE public.referrals
        SET status = 'paid'
        WHERE payout_request_id = payout_id AND status = 'pending';
        
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke execute from public to prevent unauthorized calling
REVOKE EXECUTE ON FUNCTION admin_settle_payout(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_settle_payout(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_settle_payout(UUID) FROM authenticated;

-- Grant execution only to the service_role
GRANT EXECUTE ON FUNCTION admin_settle_payout(UUID) TO service_role;