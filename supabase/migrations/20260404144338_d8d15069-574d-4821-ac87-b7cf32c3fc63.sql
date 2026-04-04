ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS body_anchor_url text DEFAULT NULL;
ALTER TABLE public.characters DROP COLUMN IF EXISTS face_side_url;