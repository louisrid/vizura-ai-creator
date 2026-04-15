-- Add explicit SELECT policy on free_gen_ips scoped to owning user
CREATE POLICY "Users can view own free_gen_ips"
  ON public.free_gen_ips
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);