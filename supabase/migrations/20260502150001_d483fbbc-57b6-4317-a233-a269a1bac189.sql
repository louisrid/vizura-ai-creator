-- Revoke broad EXECUTE on all relevant functions, then re-grant narrowly.

-- Trigger-only functions: should never be callable via the API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- User-facing RPCs: only signed-in users may call.
REVOKE ALL ON FUNCTION public.update_profile_safe(boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_profile_safe(boolean, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.update_profile_safe(boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_profile_safe(boolean, boolean, boolean) TO authenticated;