
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS face_side_url text;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS face_angle_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'images');
CREATE POLICY "Authenticated users can upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');
CREATE POLICY "Users can delete own images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
