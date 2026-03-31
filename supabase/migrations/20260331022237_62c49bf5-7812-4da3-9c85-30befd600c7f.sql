CREATE POLICY "Users can create their own generations" ON public.generations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations" ON public.generations
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);