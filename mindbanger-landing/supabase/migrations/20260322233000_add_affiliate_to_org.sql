
-- Migration: Add Affiliate ID to Organizations
-- Description: Track which affiliate referred the B2B organization.

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS affiliate_id TEXT;

COMMENT ON COLUMN public.organizations.affiliate_id IS 'Referral ID of the affiliate who brought this organization.';
