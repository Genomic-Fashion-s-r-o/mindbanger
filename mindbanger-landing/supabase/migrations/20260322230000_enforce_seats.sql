
-- TRIGGER: Enforce Seat Limits
-- Description: Prevent adding new members if the organization's seat limit is reached.

CREATE OR REPLACE FUNCTION public.check_org_seat_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    limit_count INTEGER;
    org_status TEXT;
BEGIN
    -- 1. Get Organization Details
    SELECT seats_limit, subscription_status INTO limit_count, org_status
    FROM public.organizations
    WHERE id = NEW.organization_id;

    -- 2. Check Subscription Status (Optional strictness)
    -- If organization is not active or trialing, maybe prevent adding members?
    -- For now, we only enforce numeric limit.

    -- 3. Count existing members (active + invited)
    SELECT count(*) INTO current_count
    FROM public.organization_members
    WHERE organization_id = NEW.organization_id
      AND status IN ('active', 'invited');

    -- 4. Check Limit
    -- Allow updates to existing rows (e.g. changing role), validation only needed on INSERT
    -- Or if we allow soft delete/restore?
    
    IF current_count >= limit_count THEN
        RAISE EXCEPTION 'Organization seat limit reached (% seats)', limit_count;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS on_org_member_add_check_limit ON public.organization_members;

CREATE TRIGGER on_org_member_add_check_limit
BEFORE INSERT ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.check_org_seat_limit();
