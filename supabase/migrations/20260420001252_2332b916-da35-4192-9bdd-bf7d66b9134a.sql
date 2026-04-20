-- Change new-user gem seed from 100 to 0.
-- Onboarding regens/gens are now free via explicit skip-during-onboarding logic
-- in the generate edge function, not via a hidden pre-loaded balance.
-- Existing users keep whatever balance they currently have.
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
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$;