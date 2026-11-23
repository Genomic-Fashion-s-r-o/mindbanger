-- Tabuľka pre internú komunikáciu B2B
CREATE TABLE IF NOT EXISTS public.b2b_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Kto správu poslal
    content TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT FALSE, -- TRUE ak píše Super Admin, FALSE ak píše Klient
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.b2b_messages ENABLE ROW LEVEL SECURITY;

-- 1. Klient (Owner/Admin) vidí len správy svojej organizácie
CREATE POLICY "Users can view messages of their organization" ON public.b2b_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = b2b_messages.organization_id
            AND om.user_id = auth.uid()
        )
    );

-- 2. Klient môže písať len za svoju organizáciu
CREATE POLICY "Users can insert messages for their organization" ON public.b2b_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = b2b_messages.organization_id
            AND om.user_id = auth.uid()
        )
    );

-- 3. Super Admin vidí všetko (na základe role v profiles)
CREATE POLICY "Super Admins can view all messages" ON public.b2b_messages
    FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

-- 4. Super Admin môže odpovedať (vkladať)
CREATE POLICY "Super Admins can reply" ON public.b2b_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

-- 5. Super Admin môže označiť prečítané (update)
CREATE POLICY "Super Admins can update status" ON public.b2b_messages
    FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );
