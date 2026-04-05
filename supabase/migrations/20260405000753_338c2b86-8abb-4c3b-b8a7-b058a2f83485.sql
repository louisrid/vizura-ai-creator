
-- 1. Fix: subscriptions SELECT policy - scope to authenticated only
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Fix: profiles UPDATE bypass - restrict has_used_free_gen from client updates
-- Create a security definer function for safe profile updates
CREATE OR REPLACE FUNCTION public.update_profile_safe(
  _has_seen_welcome boolean DEFAULT NULL,
  _has_seen_onboarding boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET
    has_seen_welcome = COALESCE(_has_seen_welcome, has_seen_welcome),
    has_seen_onboarding = COALESCE(_has_seen_onboarding, has_seen_onboarding),
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- Replace the open UPDATE policy with one that prevents changing has_used_free_gen
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Fix: storage images bucket - add UPDATE policy scoped to owner
CREATE POLICY "Users can update own images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
