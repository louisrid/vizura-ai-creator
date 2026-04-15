CREATE OR REPLACE FUNCTION public.update_profile_safe(
  _has_seen_welcome boolean DEFAULT NULL,
  _has_seen_onboarding boolean DEFAULT NULL,
  _onboarding_complete boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET
    has_seen_welcome = COALESCE(_has_seen_welcome, has_seen_welcome),
    has_seen_onboarding = COALESCE(_has_seen_onboarding, has_seen_onboarding),
    onboarding_complete = COALESCE(_onboarding_complete, onboarding_complete),
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;