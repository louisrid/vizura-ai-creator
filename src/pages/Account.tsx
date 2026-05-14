import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { ArrowRight, Loader2, Eye, Gem, Lock, Settings } from "@/lib/icons";
import GoogleIcon from "@/components/GoogleIcon";

import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/components/ui/sonner";

const Account = () => {
  const { user, loading: authLoading, signOut, signIn, signUp } = useAuth();
  const { refetch: refetchSub } = useSubscription();
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get("redirect");

  useEffect(() => {
    if (user && redirectTo) navigate(redirectTo, { replace: true });
  }, [user, redirectTo, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") { refetchSub(); }
  }, [location.search, refetchSub]);

  const hasCachedUser = typeof window !== "undefined" && !!localStorage.getItem("facefox_cached_user");
  if (authLoading && !hasCachedUser) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <main className="relative z-[1] w-full max-w-lg mx-auto px-[24px] pt-[34px] pb-[140px] flex flex-col items-center">
          <div className="flex items-center gap-[14px] mb-12 w-full">
            <div className="w-[40px] h-[40px]" style={{ borderRadius: 9.6, backgroundColor: "hsl(var(--card))" }} />
            <div className="h-7 w-28" style={{ borderRadius: 9.6, backgroundColor: "hsl(var(--card))" }} />
          </div>
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full mb-3" style={{ backgroundColor: "hsl(var(--card))" }} />
            <div className="h-4 w-40" style={{ borderRadius: 9.6, backgroundColor: "hsl(var(--card))" }} />
          </div>
          <div className="w-full flex flex-col gap-3">
            <div className="w-full h-14" style={{ borderRadius: 9.6, backgroundColor: "hsl(var(--card))" }} />
            <div className="w-full h-14" style={{ borderRadius: 9.6, backgroundColor: "hsl(var(--card))" }} />
          </div>
        </main>
      </div>
    );
  }

  if (!user) return <SignInView signIn={signIn} signUp={signUp} redirectTo={redirectTo} />;

  const handleSignOut = async () => {
    // Fire fade-in. App.tsx overlay timing: in 0-400ms, hold 400-550ms, out 550-950ms.
    // Wait for screen to be fully black before signOut + navigate so the user
    // never sees the Account page reappear mid-flow.
    window.dispatchEvent(new Event("facefox-signing-out"));
    await new Promise(r => setTimeout(r, 420));
    try { await signOut(); } catch (err) { console.error("signOut failed:", err); }
    navigate("/", { replace: true });
  };

  const initial = (user.email?.[0] || "?").toUpperCase();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative z-[1] w-full max-w-lg mx-auto px-[24px] pt-[34px] pb-[140px] flex flex-col items-center">
        <div className="flex items-center gap-[14px] mb-12 w-full">
          <BackButton always />
          <PageTitle className="mb-0">settings</PageTitle>
        </div>

        {/* Avatar */}
        <div className="w-full flex justify-center mb-5">
          <div className="w-[90px] h-[90px] rounded-full flex items-center justify-center bg-neon-yellow">
            <span className="text-4xl font-[900] text-neon-yellow-foreground leading-none">{initial}</span>
          </div>
        </div>

        {/* Settings rows */}
        <div className="w-full flex flex-col gap-2.5 self-center">
          <button
            className="w-full rounded-[9.6px] border-[3px] border-[hsl(var(--border-mid))] bg-card flex items-center justify-between px-4 h-14 text-[13px] font-[900] lowercase text-white"
            onClick={() => toast("coming soon")}
          >
            <span className="leading-none">change password</span>
            <Lock size={18} strokeWidth={2.5} className="text-white shrink-0" />
          </button>

          <button
            className="w-full rounded-[9.6px] border-[3px] border-[hsl(var(--border-mid))] bg-card flex items-center justify-between px-4 h-14 text-[13px] font-[900] lowercase text-white"
            onClick={() => toast("coming soon")}
          >
            <span className="leading-none">subscription</span>
            <Gem size={18} strokeWidth={2.5} className="text-white shrink-0" />
          </button>

          <button
            className="w-full rounded-[9.6px] border-[3px] border-[hsl(var(--border-mid))] bg-card flex items-center justify-between px-4 h-14 text-[13px] font-[900] lowercase text-white"
            onClick={() => toast("coming soon")}
          >
            <span className="leading-none">support</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white shrink-0">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </button>

        </div>

        <button
          className="self-center mt-6 px-3.5 py-1.5 text-[10px] font-[900] lowercase"
          style={{ color: "#ffffff", backgroundColor: "#1a0505", border: "2px solid #ff4444", borderRadius: 9.6 }}
          onClick={handleSignOut}
        >
          sign out
        </button>

        <button
          type="button"
          onClick={() => navigate("/info")}
          className="self-center mt-6 text-[9px] font-extrabold lowercase underline text-white"
        >
          terms &amp; privacy
        </button>

        {user?.email === "louisjridland@gmail.com" && (
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="self-center mt-6 px-3.5 py-1.5 text-[10px] font-[900] lowercase flex items-center gap-1.5"
            style={{ color: "hsl(var(--neon-green))", backgroundColor: "#031a08", border: "2px solid hsl(var(--neon-green))", borderRadius: 9.6 }}
          >
            <Eye size={12} strokeWidth={3} />
            admin
          </button>
        )}
      </main>
    </div>
  );
};

const SignInView = ({ signIn, signUp, redirectTo }: { signIn: (e: string, p: string) => Promise<void>; signUp: (e: string, p: string) => Promise<void>; redirectTo?: string | null }) => {
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(false);

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

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("fill details");
      return;
    }
    setSubmitting(true);
    try {
      if (isSignUpMode) {
        try {
          await signUp(email.trim(), password);
          toast.success("check email");
        } catch (err: any) {
          if (err.message?.toLowerCase().includes("already registered")) {
            await signIn(email.trim(), password);
          } else throw err;
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
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result?.error) {
        sessionStorage.removeItem("facefox_post_auth_home");
        toast.error("log in error");
        setGoogleLoading(false);
      }
    } catch (err: any) {
      sessionStorage.removeItem("facefox_post_auth_home");
      toast.error("log in error");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative z-[1] mx-auto w-full max-w-lg px-[24px] pt-[34px] pb-[140px] flex flex-col items-center">
        <div className="flex items-center gap-[14px] mb-12 w-full">
          <BackButton always />
          <PageTitle className="mb-0">settings</PageTitle>
        </div>
        <div className="w-full p-5 space-y-3" style={{ borderRadius: 9.6, backgroundColor: "hsl(var(--card))", border: "2px solid hsl(var(--border-mid))" }}>
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || submitting}
            className="w-full h-14 flex items-center justify-center gap-2 disabled:opacity-50 transition-transform duration-150"
            style={{ background: "#ffffff", color: "#000000", borderRadius: 9.6, fontSize: 14, fontWeight: 900, textTransform: "lowercase", border: "none" }}
          >
            {googleLoading ? (
              <><Loader2 className="animate-spin" size={18} />connecting...</>
            ) : (
              <>
                <GoogleIcon />
                log in with google
              </>
            )}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-[2px] bg-border" />
            <span className="text-[10px] font-extrabold lowercase text-white">or use email</span>
            <div className="flex-1 h-[2px] bg-border" />
          </div>
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            className="w-full h-12 border-[3px] border-[hsl(var(--border-mid))] px-4 text-base font-extrabold lowercase text-foreground placeholder:text-white/60 outline-none focus:border-neon-yellow transition-colors"
            style={{ borderRadius: 9.6, backgroundColor: "#000000" }}
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
            className="w-full h-12 border-[3px] border-[hsl(var(--border-mid))] px-4 text-base font-extrabold lowercase text-foreground placeholder:text-white/60 outline-none focus:border-neon-yellow transition-colors"
            style={{ borderRadius: 9.6, backgroundColor: "#000000" }}
            disabled={submitting || googleLoading}
          />
          <button
            onClick={handleEmailAuth}
            disabled={submitting || googleLoading}
            className="w-full h-14 flex items-center justify-center gap-2 disabled:opacity-50 transition-transform duration-150"
            style={{ background: "#ffffff", color: "#000000", borderRadius: 9.6, fontSize: 14, fontWeight: 900, textTransform: "lowercase", border: "none" }}
          >
            {submitting ? (<><Loader2 className="animate-spin" size={18} />logging in...</>) : (<>{isSignUpMode ? "sign up" : "log in"}<ArrowRight size={14} /></>)}
          </button>
          <button
            type="button"
            onClick={() => setIsSignUpMode((v) => !v)}
            className="w-full text-center text-[11px] font-extrabold lowercase text-white transition-colors"
          >
            {isSignUpMode ? "already have an account? log in" : "no account? sign up"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Account;
