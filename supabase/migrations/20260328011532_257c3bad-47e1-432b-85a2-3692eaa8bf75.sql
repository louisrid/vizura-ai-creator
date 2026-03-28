
-- Add has_used_free_gen to profiles
ALTER TABLE public.profiles ADD COLUMN has_used_free_gen boolean NOT NULL DEFAULT false;

-- Add face_image_url and generation_prompt to characters
ALTER TABLE public.characters ADD COLUMN face_image_url text DEFAULT null;
ALTER TABLE public.characters ADD COLUMN generation_prompt text DEFAULT null;

-- Create free_gen_ips table for IP-based limiting
CREATE TABLE public.free_gen_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.free_gen_ips ENABLE ROW LEVEL SECURITY;

-- Only service role inserts into free_gen_ips (via edge function), no public access needed
