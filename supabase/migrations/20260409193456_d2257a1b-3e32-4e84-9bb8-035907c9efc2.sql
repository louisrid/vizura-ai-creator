-- Drop existing user-facing policies on free_gen_ips
-- Only the service role (backend) should access this table
DROP POLICY IF EXISTS "Users can view own free_gen_ips" ON public.free_gen_ips;
DROP POLICY IF EXISTS "Users can insert own free_gen_ips" ON public.free_gen_ips;

-- Drop any existing UPDATE policy on profiles (should not exist, but ensure)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;