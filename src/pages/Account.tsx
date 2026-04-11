import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { LogOut, ArrowRight, Loader2, Eye, ChevronRight } from "lucide-react";

import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useGems } from "@/contexts/CreditsContext";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/components/ui/sonner";
import DotDecal from "@/components/DotDecal";

const Account = () => {
  const { user, loading: authLoading, signOut, signIn, signUp } = useAuth();
  const { subscribed, refetch: refetchSub } = useSubscription();
  const { refetch: refetchGems } = useGems();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get("redirect");

  useEffect(() => {
    if (user && redirectTo) navigate(redirectTo, { replace: true });
  }, [user, redirectTo, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") { refetchSub(); }
  }, [location.search, refetchSub]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-foreground" size={28} />
      </div>
    );
  }

  if (!user) return <SignInView signIn={signIn} signUp={signUp} redirectTo={redirectTo} />;

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const initial = (user.email?.[0] || "?").toUpperCase();

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="relative z-[1] w-full max-w-lg mx-auto px-4 pt-10 pb-[280px] flex flex-col items-center">
        <div className="flex items-center gap-3 mb-10 w-full">
          <BackButton />
          <PageTitle className="mb-0">my account</PageTitle>
        </div>

        {/* Profile avatar + email */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: "#2a2a2a" }}
          >
            <span className="text-3xl font-[900] text-white leading-none">{initial}</span>
          </div>
          <span className="text-sm font-[800] lowercase text-white truncate max-w-[280px]">
            {user.email || "..."}
          </span>
        </div>

        {/* Settings card */}
        <div className="w-full rounded-[16px] overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
          <button
            className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#222]"
            onClick={() => toast("coming soon")}
          >
            <span className="text-sm font-[800] lowercase text-white">subscription</span>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-[800] lowercase"
                style={{ color: subscribed ? "#12e62b" : "rgba(255,255,255,0.35)" }}
              >
                {subscribed ? "active" : "inactive"}
              </span>
              <ChevronRight size={16} strokeWidth={2.5} className="text-white/30" />
            </div>
          </button>

          <div className="h-[1px] mx-5" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />

          <button
            className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#222]"
            onClick={() => toast("coming soon")}
          >
            <span className="text-sm font-[800] lowercase text-white">change password</span>
            <ChevronRight size={16} strokeWidth={2.5} className="text-white/30" />
          </button>

          <div className="h-[1px] mx-5" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />

          <button
            className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#222]"
            onClick={() => toast("coming soon")}
          >
            <span className="text-sm font-[800] lowercase text-white">change email</span>
            <ChevronRight size={16} strokeWidth={2.5} className="text-white/30" />
          </button>
        </div>

        {/* Admin button */}
        {user?.email === "louisjridland@gmail.com" && (
          <div className="w-full pt-4">
            <button
              className="w-full h-12 text-sm font-[900] lowercase transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ borderRadius: 12, backgroundColor: "#1a1a1a", color: "rgba(255,255,255,0.9)" }}
              onClick={() => navigate("/admin")}
            >
              admin
              <Eye size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Sign out */}
        <button
          className="mt-8 text-sm font-[900] lowercase transition-all hover:opacity-70"
          style={{ color: "#ff4444" }}
          onClick={handleSignOut}
        >
          sign out
        </button>

        <div className="pt-6">
          <Link
            to="/info"
            className="text-[11px] font-extrabold lowercase underline transition-colors hover:text-foreground/60"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            terms &amp; privacy
          </Link>
        </div>
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

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("please enter email and password");
      return;
    }
    setSubmitting(true);
    try {
      if (isSignUpMode) {
        try {
          await signUp(email.trim(), password);
          toast.success("check your email to confirm");
        } catch (err: any) {
          if (err.message?.toLowerCase().includes("already registered")) {
            await signIn(email.trim(), password);
          } else throw err;
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      toast.error(err.message || "something went wrong");
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    sessionStorage.setItem("vizura_post_auth_home", "1");
    sessionStorage.removeItem("vizura_resume_after_auth");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result?.error) {
        sessionStorage.removeItem("vizura_post_auth_home");
        toast.error("google sign in failed");
        setGoogleLoading(false);
      }
    } catch (err: any) {
      sessionStorage.removeItem("vizura_post_auth_home");
      toast.error(err.message || "google sign in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="relative z-[1] mx-auto w-full max-w-lg px-4 pt-10 pb-[280px] flex flex-col items-center">
        <div className="mb-4 flex items-center gap-3 w-full">
          <BackButton />
          <PageTitle className="mb-0">my account</PageTitle>
        </div>
        <div className="w-full border-2 border-[#1a1a1a] p-5 space-y-3" style={{ borderRadius: 12, backgroundColor: "#1a1a1a" }}>
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || submitting}
            className="w-full h-14 bg-neon-yellow text-neon-yellow-foreground text-sm font-extrabold lowercase hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ borderRadius: 12 }}
          >
            {googleLoading ? (
              <><Loader2 className="animate-spin" size={18} />connecting...</>
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
            <span className="text-[10px] font-extrabold lowercase text-foreground/40">or use email</span>
            <div className="flex-1 h-[2px] bg-border" />
          </div>
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            className="w-full h-12 border-2 border-[#2a2a2a] px-4 text-2xl font-extrabold lowercase text-foreground placeholder:text-foreground/30 outline-none focus:border-neon-yellow transition-colors"
            style={{ borderRadius: 12, backgroundColor: "#2a2a2a" }}
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
            className="w-full h-12 border-2 border-[#2a2a2a] px-4 text-2xl font-extrabold lowercase text-foreground placeholder:text-foreground/30 outline-none focus:border-neon-yellow transition-colors"
            style={{ borderRadius: 12, backgroundColor: "#2a2a2a" }}
            disabled={submitting || googleLoading}
          />
          <button className="h-14 w-full bg-neon-yellow text-neon-yellow-foreground text-sm font-extrabold lowercase hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2" style={{ borderRadius: 12 }} onClick={handleEmailAuth} disabled={submitting || googleLoading}>
            {submitting ? (<><Loader2 className="animate-spin" size={18} />signing in...</>) : (<>{isSignUpMode ? "sign up" : "sign in"}<ArrowRight size={14} /></>)}
          </button>
          <button
            type="button"
            onClick={() => setIsSignUpMode((v) => !v)}
            className="w-full text-center text-[11px] font-extrabold lowercase text-foreground/40 hover:text-foreground/60 transition-colors"
          >
            {isSignUpMode ? "already have an account? sign in" : "no account? sign up"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Account;
