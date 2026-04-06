
-- 2. Fix: Remove direct UPDATE policy on profiles to prevent free-gen bypass
-- Users must use the update_profile_safe() RPC instead
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
