import { useEffect, useMemo, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { useLocation } from "react-router-dom";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import PageTitle from "@/components/PageTitle";
import BackButton from "@/components/BackButton";

import { toast } from "@/components/ui/sonner";
import DotDecal from "@/components/DotDecal";
import { fetchAndCacheOnboardingState } from "@/lib/onboardingState";
import { registerBlockingLoader } from "@/lib/startupSplash";
import { supabase } from "@/integrations/supabase/client";

function isInAppWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|WhatsApp|Discord|Line|Snapchat|Twitter|MicroMessenger|WebView|wv\)/i.test(ua);
}

const Auth = () => {
  const { user, signIn } = useAuth();
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const redirectTo = useMemo(() => new URLSearchParams(location.search).get("redirect") || "/", [location.search]);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const inWebView = useMemo(() => isInAppWebView(), []);

  useEffect(() => {
    const resetLoading = () => setGoogleLoading(false);
    const onVisibility = () => {
      if (document.visibilityState === "visible") setGoogleLoading(false);
    };
    window.addEventListener("pageshow", resetLoading);
    window.addEventListener("focus", resetLoading);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", resetLoading);
      window.removeEventListener("focus", resetLoading);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    sessionStorage.removeItem("facefox_resume_after_auth");
    sessionStorage.removeItem("facefox_auto_opened");
    sessionStorage.removeItem("facefox_creator_dismissed");
    sessionStorage.removeItem("facefox_guided_flow_state");
    sessionStorage.removeItem("facefox_post_auth_home");

    // Hold splash up through the entire check → signout (if needed) → navigate cycle.
    // Without this, splash hides when auth resolves, then user sees brief flashes of
    // header/home before onboarding redirect or signout completes.
    const unregisterSplash = registerBlockingLoader();
    let didUnregister = false;
    const safeUnregister = () => {
      if (didUnregister) return;
      didUnregister = true;
      unregisterSplash();
    };

    const checkNewAccount = async () => {
      try {
        const resolvedState = await fetchAndCacheOnboardingState(user.id);
        if (cancelled) return;

        if (!resolvedState.onboardingComplete) {
          await supabase.auth.signOut();
          sessionStorage.setItem("facefox_show_start_toast", "1");
          navigate("/", { replace: true });
          return;
        }

        navigate(redirectTo, { replace: true });
      } catch (err) {
        console.error("[auth-check] error:", err);
        if (!cancelled) navigate(redirectTo, { replace: true });
      } finally {
        // Keep splash up a tick after navigate so the target page has time to mount
        // and register its own blocking loader (e.g. Home.tsx) before splash hides.
        setTimeout(safeUnregister, 600);
      }
    };

    void checkNewAccount();

    return () => {
      cancelled = true;
      // Safety net if component unmounts before the finally block schedules its unregister.
      safeUnregister();
    };
  }, [user, navigate, redirectTo]);



  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const hasOAuthReturn = hash.includes("access_token") || search.includes("code=");
    if (hasOAuthReturn) {
      sessionStorage.setItem("facefox_post_auth_home", "1");
      setSubmitting(true);
    }
  }, []);

  const handleEmailAuth = async () => {
    setSubmitting(true);
    try {
      if (!email.trim() || !password.trim()) {
        toast.error("fill details");
        setSubmitting(false);
        return;
      }

      await signIn(email.trim(), password);
    } catch (err: any) {
      toast.error("try again");
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    sessionStorage.setItem("facefox_post_auth_home", "1");
    sessionStorage.removeItem("facefox_resume_after_auth");
    // Mark this OAuth round-trip as a LOGIN attempt (not signup) so we can block
    // Google accounts that have no Facefox profile when they come back.
    sessionStorage.setItem("facefox_login_only", "1");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
        extraParams: {
          prompt: "select_account",
        },
      });
      if (result?.error) {
        sessionStorage.removeItem("facefox_post_auth_home");
        sessionStorage.removeItem("facefox_login_only");
        toast.error("sign in error");
        setGoogleLoading(false);
        return;
      }
      if (!result?.redirected) {
        // Session already set — Auth page useEffect will handle redirect
      }
    } catch (err: any) {
      sessionStorage.removeItem("facefox_post_auth_home");
      sessionStorage.removeItem("facefox_login_only");
      toast.error("sign in error");
      setGoogleLoading(false);
    }
  };

  if (user) {
    if (document.getElementById("splash-screen")) {
      return <LoadingScreen />;
    }
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="relative z-[1] w-full max-w-lg mx-auto px-[14px] pt-7 md:max-w-2xl md:px-10">
        <div className="w-full md:max-w-md md:mx-auto">
          <div className="mb-7 flex items-center gap-3">
            <BackButton />
            <PageTitle className="mb-0">sign in</PageTitle>
          </div>

          <div className="rounded-[10px] border-2 border-[hsl(var(--border-mid))] p-5 md:p-8 space-y-3 md:space-y-4" style={{ backgroundColor: "hsl(var(--card))" }}>
            {!inWebView && (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || submitting}
                  className="w-full h-14 md:h-16 flex items-center justify-center gap-2 disabled:opacity-50 transition-transform duration-150"
                  style={{ background: "#000000", color: "#ffe603", borderRadius: 10, fontSize: 14, fontWeight: 900, textTransform: "lowercase", border: "2px solid #ffe603", WebkitTapHighlightColor: "transparent" }}
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      connecting...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      sign in with google
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-[2px] bg-border" />
                  <span className="text-[11px] font-extrabold lowercase text-white">or use email</span>
                  <div className="flex-1 h-[2px] bg-border" />
                </div>
              </>
            )}

            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              className="w-full h-12 md:h-14 border-2 border-[hsl(var(--border-mid))] px-4 text-base font-extrabold lowercase text-foreground placeholder:text-muted-foreground outline-none focus:border-neon-yellow transition-colors"
              style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }}
              disabled={submitting || googleLoading}
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleEmailAuth(); }}
              spellCheck={false}
              autoCorrect="off"
              className="w-full h-12 md:h-14 border-2 border-[hsl(var(--border-mid))] px-4 text-base font-extrabold lowercase text-foreground placeholder:text-muted-foreground outline-none focus:border-neon-yellow transition-colors"
              style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }}
              disabled={submitting || googleLoading}
            />

            <button
              onClick={handleEmailAuth}
              disabled={submitting || googleLoading}
              className="w-full h-14 md:h-16 flex items-center justify-center gap-2 disabled:opacity-50 transition-transform duration-150"
              style={{ background: "#000000", color: "#ffe603", borderRadius: 10, fontSize: 14, fontWeight: 900, textTransform: "lowercase", border: "2px solid #ffe603" }}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  signing in...
                </>
              ) : (
                <>
                  sign in
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
