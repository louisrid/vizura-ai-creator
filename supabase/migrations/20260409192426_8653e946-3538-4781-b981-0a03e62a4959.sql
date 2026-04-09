-- Add SELECT policy to generation_logs so users can only view their own logs
CREATE POLICY "Users can view own generation_logs"
  ON public.generation_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add SELECT policy to rejected_prompts so users can only view their own rejected prompts
CREATE POLICY "Users can view own rejected_prompts"
  ON public.rejected_prompts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);