import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import PageTitle from "@/components/PageTitle";
import { toast } from "@/components/ui/sonner";
import DotDecal from "@/components/DotDecal";
import { fetchAndCacheOnboardingState, needsOnboardingRedirect, readCachedOnboardingState } from "@/lib/onboardingState";

function isInAppWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|WhatsApp|Discord|Line|Snapchat|Twitter|MicroMessenger|WebView|wv\)/i.test(ua);
}

const Auth = () => {
  const { user, loading: authLoading, signIn, signUp, signInPreview } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = useMemo(() => new URLSearchParams(location.search).get("redirect") || "/", [location.search]);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const inWebView = useMemo(() => isInAppWebView(), []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    sessionStorage.removeItem("facefox_resume_after_auth");
    sessionStorage.removeItem("facefox_auto_opened");
    sessionStorage.removeItem("facefox_creator_dismissed");
    sessionStorage.removeItem("facefox_guided_flow_state");
    sessionStorage.removeItem("facefox_post_auth_home");

    const cachedState = readCachedOnboardingState(user.id);
    if (needsOnboardingRedirect(cachedState)) {
      navigate("/", { replace: true, state: { openCreator: true, onboardingRedirect: true } });
      return () => {
        cancelled = true;
      };
    }

    if (cachedState) {
      navigate(redirectTo, { replace: true });
      return () => {
        cancelled = true;
      };
    }

    const checkNewAccount = async () => {
      try {
        const resolvedState = await fetchAndCacheOnboardingState(user.id);
        if (cancelled) return;

        if (needsOnboardingRedirect(resolvedState)) {
          navigate("/", { replace: true, state: { openCreator: true, onboardingRedirect: true } });
          return;
        }

        navigate(redirectTo, { replace: true });
      } catch {
        if (!cancelled) navigate(redirectTo, { replace: true });
      }
    };

    void checkNewAccount();

    return () => {
      cancelled = true;
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
      if (!isSignUp && !email.trim() && !password.trim()) {
        sessionStorage.setItem("facefox_post_auth_home", "1");
        await signInPreview();
        toast.success("signed in");
        return;
      }

      if (!email.trim() || !password.trim()) {
        toast.error("fill details");
        setSubmitting(false);
        return;
      }

      if (isSignUp) {
        try {
          await signUp(email.trim(), password);
          toast.success("check email");
        } catch (err: any) {
          if (err.message?.toLowerCase().includes("already registered")) {
            await signIn(email.trim(), password);
          } else {
            throw err;
          }
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      toast.error("try again");
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    sessionStorage.setItem("facefox_post_auth_home", "1");
    sessionStorage.removeItem("facefox_resume_after_auth");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
        extraParams: {
          prompt: "select_account",
        },
      });
      if (result?.error) {
        sessionStorage.removeItem("facefox_post_auth_home");
        toast.error("sign in error");
        setGoogleLoading(false);
        return;
      }
      if (!result?.redirected) {
        // Session already set — Auth page useEffect will handle redirect
      }
    } catch (err: any) {
      sessionStorage.removeItem("facefox_post_auth_home");
      toast.error("sign in error");
      setGoogleLoading(false);
    }
  };

  const handleBack = () => {
    // Go back to the start/hero screen — use history if available, otherwise home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  if (authLoading || user) {
    return (
      <div className="relative min-h-screen bg-background overflow-hidden">
        <DotDecal />
        <main className="relative z-[1] mx-auto w-full max-w-lg px-4 pt-10 pb-[280px] flex flex-col items-center">
          <div className="flex items-center gap-3 mb-10 w-full">
            <div className="w-[40px] h-[40px]" style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))" }} />
            <div className="h-7 w-24" style={{ borderRadius: 8, backgroundColor: "hsl(var(--card))" }} />
          </div>
          <div className="w-full space-y-3 p-5" style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))" }}>
            <div className="w-full h-14" style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))" }} />
            <div className="w-full h-12" style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))" }} />
            <div className="w-full h-12" style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))" }} />
            <div className="w-full h-14" style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))" }} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      {/* Desktop: centered card layout */}
      <main className="relative z-[1] mx-auto w-full max-w-lg px-4 pt-10 pb-[280px] md:flex md:flex-col md:items-center md:justify-center md:min-h-screen md:pt-0 md:pb-0 md:max-w-2xl">
        <div className="w-full md:max-w-md">
          <div className="mb-7 flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="w-10 h-10 rounded-[10px] bg-neon-yellow flex items-center justify-center text-neon-yellow-foreground hover:opacity-90 transition-colors active:scale-95 md:w-12 md:h-12"
              aria-label="go back"
            >
              <ArrowLeft size={18} strokeWidth={3} />
            </button>
            <PageTitle className="mb-0">sign in</PageTitle>
          </div>

          <div className="rounded-[10px] border-2 border-[hsl(var(--border-mid))] p-5 md:p-8 space-y-3 md:space-y-4" style={{ backgroundColor: "hsl(var(--card))" }}>
            {!inWebView && (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || submitting}
                  className="w-full h-14 md:h-16 bg-neon-yellow text-neon-yellow-foreground text-sm md:text-xl font-extrabold lowercase disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ borderRadius: 10, transition: "transform 0.1s ease-out", WebkitTapHighlightColor: "transparent" }}
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

            <Button className="h-14 md:h-16 w-full text-sm md:text-xl" onClick={handleEmailAuth} disabled={submitting || googleLoading}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  signing in...
                </>
              ) : (
                <>
                  {isSignUp ? "sign up" : email.trim() || password.trim() ? "sign in" : "preview login"}
                  <ArrowRight size={14} />
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => setIsSignUp((v) => !v)}
              className="w-full text-center text-[11px] md:text-[13px] font-extrabold lowercase text-white hover:text-white/80 transition-colors"
            >
              {isSignUp ? "already have an account? " : "no account? "}
              <span className="underline">{isSignUp ? "sign in" : "sign up"}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
