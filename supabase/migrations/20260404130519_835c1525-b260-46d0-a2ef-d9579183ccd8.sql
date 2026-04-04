
-- 1. Add RLS policies for free_gen_ips (service-role only writes, users can see own)
CREATE POLICY "Users can view own free_gen_ips"
  ON public.free_gen_ips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own free_gen_ips"
  ON public.free_gen_ips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Fix storage images bucket INSERT policy to enforce folder ownership
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'images' AND
    (storage.foldername(name))[1] = (auth.uid())::text
  );
