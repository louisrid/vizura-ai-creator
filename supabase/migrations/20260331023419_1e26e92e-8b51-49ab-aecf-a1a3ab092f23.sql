DROP POLICY IF EXISTS "Users can view own generations" ON public.generations;
CREATE POLICY "Users can view own generations" ON public.generations
FOR SELECT TO authenticated
USING (auth.uid() = user_id);