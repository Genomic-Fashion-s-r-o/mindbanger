-- Allows Admins to view all signal progress for stats
CREATE POLICY "Admins can view onboarding progress" ON public.user_progress_onboarding
    FOR SELECT TO authenticated
    USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "Admins can view corporate progress" ON public.user_progress_corporate
    FOR SELECT TO authenticated
    USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );
