import { useEffect, useMemo, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import GoogleIcon from "@/components/GoogleIcon";
import { useLocation } from "react-router-dom";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { ArrowRight, Loader2 } from "@/lib/icons";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import PageTitle from "@/components/PageTitle";
import BackButton from "@/components/BackButton";

import { toast } from "@/components/ui/sonner";
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
        toast.error("log in error");
        setGoogleLoading(false);
        return;
      }
      if (!result?.redirected) {
        // Session already set — Auth page useEffect will handle redirect
      }
    } catch (err: any) {
      sessionStorage.removeItem("facefox_post_auth_home");
      sessionStorage.removeItem("facefox_login_only");
      toast.error("log in error");
      setGoogleLoading(false);
    }
  };

  if (user) {
    if (document.getElementById("splash-screen")) {
      return <LoadingScreen />;
    }
    return <div className="min-h-screen" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative z-[1] w-full max-w-lg mx-auto px-[24px] pt-7 md:max-w-2xl md:px-[44px]">
        <div className="w-full md:max-w-md md:mx-auto">
          <div className="mb-7 flex items-center gap-4">
            <BackButton always />
            <PageTitle className="mb-0">log in</PageTitle>
          </div>

          <div className="rounded-[8px] border-[1.5px] border-[hsl(var(--border-mid))] p-5 md:p-8 space-y-3 md:space-y-4" style={{ backgroundColor: "hsl(var(--card))" }}>
            {!inWebView && (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || submitting}
                  className="w-full h-14 md:h-16 flex items-center justify-center gap-2 disabled:opacity-50 transition-transform duration-150"
                  style={{ background: "#ffe603", color: "#000000", borderRadius: 8, fontSize: 14, fontWeight: 900, textTransform: "lowercase", border: "none", WebkitTapHighlightColor: "transparent" }}
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      connecting...
                    </>
                  ) : (
                    <>
                      <GoogleIcon />
                      log in with google
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
              className="w-full h-12 md:h-14 border-[1.5px] border-[hsl(var(--border-mid))] px-4 text-base font-extrabold lowercase text-foreground placeholder:text-white/60 outline-none focus:border-neon-yellow transition-colors"
              style={{ backgroundColor: "#000000", borderRadius: 8 }}
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
              className="w-full h-12 md:h-14 border-[1.5px] border-[hsl(var(--border-mid))] px-4 text-base font-extrabold lowercase text-foreground placeholder:text-white/60 outline-none focus:border-neon-yellow transition-colors"
              style={{ backgroundColor: "#000000", borderRadius: 8 }}
              disabled={submitting || googleLoading}
            />

            <button
              onClick={handleEmailAuth}
              disabled={submitting || googleLoading}
              className="w-full h-14 md:h-16 flex items-center justify-center gap-2 disabled:opacity-50 transition-transform duration-150"
              style={{ background: "#ffe603", color: "#000000", borderRadius: 8, fontSize: 14, fontWeight: 900, textTransform: "lowercase", border: "none" }}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  logging in...
                </>
              ) : (
                <>
                  log in
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
