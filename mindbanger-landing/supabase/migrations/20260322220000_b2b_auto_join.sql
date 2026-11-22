
-- TRIGGER: Auto-link new users to existing organization invitations
-- Description: When a new user registers, check if their email matches any pending invitations in organization_members. If so, link them.

-- 1. Create Function
CREATE OR REPLACE FUNCTION public.handle_new_user_org_invite()
RETURNS TRIGGER AS $$
BEGIN
    -- Update any pending invitations for this email
    UPDATE public.organization_members
    SET user_id = NEW.id,
        status = 'active', -- Automatically activate membership upon registration
        updated_at = NOW()
    WHERE email = NEW.email
      AND user_id IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Trigger
-- Drop if exists to ensure idempotency
DROP TRIGGER IF EXISTS on_auth_user_created_link_org ON auth.users;

CREATE TRIGGER on_auth_user_created_link_org
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_org_invite();
