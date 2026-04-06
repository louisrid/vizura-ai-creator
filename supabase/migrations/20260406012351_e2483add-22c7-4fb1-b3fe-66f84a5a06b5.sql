
-- 1. Fix: Credits SELECT policy — restrict from 'public' to 'authenticated'
DROP POLICY IF EXISTS "Users can view own credits" ON public.credits;
CREATE POLICY "Users can view own credits"
  ON public.credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
