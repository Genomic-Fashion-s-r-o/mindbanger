
-- 1. Organizations Table (Firmy)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE, -- For potential vanity URLs or internalref
    tax_id TEXT, -- ICO
    vat_id TEXT, -- DIC/VAT
    billing_email TEXT NOT NULL,
    contact_person TEXT,
    contact_phone TEXT,
    industry TEXT, -- 'finance', 'retail', 'sport', etc.
    
    -- Subscription Info
    subscription_status TEXT DEFAULT 'inactive', -- 'active', 'trialing', 'past_due', 'canceled'
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    seats_limit INTEGER DEFAULT 0,
    
    -- Features
    is_personalized BOOLEAN DEFAULT false, -- If true, gets specific content
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Organization Members (Zamestnanci / Clenovia)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Linked when registered
    email TEXT NOT NULL, -- To invite people before they register
    
    role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
    status TEXT DEFAULT 'invited', -- 'invited', 'active', 'disabled'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(organization_id, email)
);

-- 3. Corporate Signals (Firemny Obsah)
CREATE TABLE IF NOT EXISTS public.corporate_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Targeting
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- Specific to one org
    industry TEXT, -- Specific to an industry (if organization_id is NULL)
    
    -- Date & Locale (Same as daily_signals)
    date DATE NOT NULL,
    language TEXT NOT NULL DEFAULT 'en', -- 'en', 'sk', 'cz'
    
    -- Content
    theme TEXT,
    title TEXT,
    signal_text TEXT,
    focus_text TEXT,
    affirmation TEXT,
    meditation_text TEXT,
    push_text TEXT,
    
    -- Media
    audio_url TEXT,
    spoken_audio_url TEXT,
    meditation_audio_url TEXT,
    
    is_published BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_cust ON public.organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_email ON public.organization_members(email);
CREATE INDEX IF NOT EXISTS idx_corp_signals_date ON public.corporate_signals(date);
CREATE INDEX IF NOT EXISTS idx_corp_signals_org ON public.corporate_signals(organization_id);

-- Encryption/RLS Policies

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_signals ENABLE ROW LEVEL SECURITY;

-- Policies for Organizations
-- 1. Admins (Service Role) can do everything.
DROP POLICY IF EXISTS "Service Role Full Access Orgs" ON public.organizations;
CREATE POLICY "Service Role Full Access Orgs" ON public.organizations
    FOR ALL TO service_role USING (true);

-- 2. Organization Members can view their own organization details
DROP POLICY IF EXISTS "Members can view own organization" ON public.organizations;
CREATE POLICY "Members can view own organization" ON public.organizations
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- 3. App Admins (Super Admins) need full access - currently simplified via service role or specific email check in app

-- Policies for Organization Members
-- 1. Service Role
DROP POLICY IF EXISTS "Service Role Full Access Members" ON public.organization_members;
CREATE POLICY "Service Role Full Access Members" ON public.organization_members
    FOR ALL TO service_role USING (true);

-- 2. Organization Admins/Owners can view/edit their members
DROP POLICY IF EXISTS "Org Admins can manage members" ON public.organization_members;
CREATE POLICY "Org Admins can manage members" ON public.organization_members
    FOR ALL TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND status = 'active'
        )
    );

-- 3. Members can view themselves
DROP POLICY IF EXISTS "Members can view own membership" ON public.organization_members;
CREATE POLICY "Members can view own membership" ON public.organization_members
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());


-- Policies for Corporate Signals
-- 1. Service Role
DROP POLICY IF EXISTS "Service Role Full Access Signals" ON public.corporate_signals;
CREATE POLICY "Service Role Full Access Signals" ON public.corporate_signals
    FOR ALL TO service_role USING (true);

-- 2. Members can view relevant signals
-- Logic: 
-- Signal is for my Organization OR
-- Signal is for my Organization's Industry AND Signal has no org_id (Industry wide) OR
-- Signal is General (no org_id, no industry) -- optional, maybe for generic B2B
DROP POLICY IF EXISTS "Members can view corporate signals" ON public.corporate_signals;
CREATE POLICY "Members can view corporate signals" ON public.corporate_signals
    FOR SELECT TO authenticated
    USING (
        -- 1. Direct Organization Match
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
        OR 
        -- 2. Industry Match (User's org industry matches signal industry)
        (
            organization_id IS NULL 
            AND industry IN (
                SELECT o.industry 
                FROM public.organizations o
                JOIN public.organization_members m ON m.organization_id = o.id
                WHERE m.user_id = auth.uid() AND m.status = 'active'
            )
        )
    );
