import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import PageTitle from "@/components/PageTitle";
import { toast } from "@/components/ui/sonner";
import DotDecal from "@/components/DotDecal";

const Auth = () => {
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const redirectTo = "/";
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (user) {
      sessionStorage.removeItem("vizura_resume_after_auth");
      sessionStorage.removeItem("vizura_auto_opened");
      sessionStorage.removeItem("vizura_creator_dismissed");
      sessionStorage.removeItem("vizura_guided_flow_state");
      sessionStorage.removeItem("vizura_post_auth_home");
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo]);

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const hasOAuthReturn = hash.includes("access_token") || search.includes("code=");
    if (hasOAuthReturn) {
      sessionStorage.setItem("vizura_post_auth_home", "1");
      setSubmitting(true);
    }
  }, []);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("please enter email and password");
      return;
    }
    setSubmitting(true);
    try {
      if (isSignUp) {
        try {
          await signUp(email.trim(), password);
          toast.success("check your email to confirm your account");
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
        extraParams: {
          prompt: "select_account",
        },
      });
      if (result?.error) {
        sessionStorage.removeItem("vizura_post_auth_home");
        toast.error("google sign in failed");
        setGoogleLoading(false);
        return;
      }
      if (!result?.redirected) {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      sessionStorage.removeItem("vizura_post_auth_home");
      toast.error(err.message || "google sign in failed");
      setGoogleLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-foreground" size={28} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="relative z-[1] mx-auto w-full max-w-lg px-4 pt-1 pb-[250px]">
        <div className="mb-7 flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-2xl bg-neon-yellow flex items-center justify-center text-neon-yellow-foreground hover:opacity-90 transition-colors active:scale-95"
            aria-label="go back"
          >
            <ArrowLeft size={18} strokeWidth={3} />
          </button>
          <PageTitle className="mb-0">sign in</PageTitle>
        </div>

        <div className="rounded-2xl border-2 border-[#1a1a1a] p-5 space-y-3" style={{ backgroundColor: "#111111" }}>
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || submitting}
            className="w-full h-14 rounded-2xl bg-neon-yellow text-neon-yellow-foreground text-sm font-extrabold lowercase hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
            className="w-full h-12 rounded-2xl border-2 border-[#1a1a1a] px-4 text-lg font-extrabold lowercase text-foreground placeholder:text-foreground/30 outline-none focus:border-neon-yellow transition-colors"
            style={{ backgroundColor: "#111111" }}
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
            className="w-full h-12 rounded-2xl border-2 border-[#1a1a1a] px-4 text-lg font-extrabold lowercase text-foreground placeholder:text-foreground/30 outline-none focus:border-neon-yellow transition-colors"
            style={{ backgroundColor: "#111111" }}
            disabled={submitting || googleLoading}
          />

          <Button className="h-14 w-full text-sm" onClick={handleEmailAuth} disabled={submitting || googleLoading}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                signing in...
              </>
            ) : (
              <>
                {isSignUp ? "sign up" : "sign in"}
                <ArrowRight size={14} />
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => setIsSignUp((v) => !v)}
            className="w-full text-center text-[11px] font-extrabold lowercase text-foreground/40 hover:text-foreground/60 transition-colors"
          >
            {isSignUp ? "already have an account? sign in" : "no account? sign up"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Auth;
