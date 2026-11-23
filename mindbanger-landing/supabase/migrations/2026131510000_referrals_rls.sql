ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;

-- Note: We do not add public INSERT policy. Inserts are done server-side via service role,
-- except if there is a specific need, but normally referrals are inserted in the stripe webhook.

CREATE POLICY "Users can only select their own referrals as referee" ON "public"."referrals"
FOR SELECT USING (auth.uid() = referee_user_id);

CREATE POLICY "Affiliates can select their own referrals" ON "public"."referrals"
FOR SELECT USING (auth.uid() IN (SELECT user_id FROM affiliates WHERE id = affiliate_id));

CREATE POLICY "Admins can update referrals" ON "public"."referrals"
FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
) WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Do not use `FOR ALL USING (true)`, Service Roles bypass RLS by default.

