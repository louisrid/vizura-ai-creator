-- Update handle_new_user function to give 100 gems instead of 1000
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  INSERT INTO public.credits (user_id, balance)
  VALUES (NEW.id, 100);
  RETURN NEW;
END;
$$;

-- Add onboarding regen tracking columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_face_regens_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_angle_regens_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_body_regens_used integer NOT NULL DEFAULT 0;