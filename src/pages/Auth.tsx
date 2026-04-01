import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { toast } from "@/components/ui/sonner";

const Auth = () => {
  const { autoSignIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  const handleAutoSignIn = async () => {
    setSubmitting(true);
    try {
      await autoSignIn();
    } catch (err: any) {
      toast.error(err.message || "something went wrong");
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const redirectUri = redirectTo
        ? `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectTo)}`
        : window.location.origin;
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri,
      });
      if (result?.error) {
        toast.error("google sign in failed");
        setGoogleLoading(false);
      }
    } catch (err: any) {
      toast.error(err.message || "google sign in failed");
      setGoogleLoading(false);
    }
  };

  const handleBack = () => {
    // If coming from the guided creator (skip to login), go back to homepage which will reopen the creator
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
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-lg px-4 pt-14 pb-12">
        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-2xl bg-neon-yellow flex items-center justify-center text-neon-yellow-foreground hover:opacity-90 transition-colors active:scale-95"
            aria-label="go back"
          >
            <ArrowRight size={14} strokeWidth={2.5} className="rotate-180" />
          </button>
          <PageTitle className="mb-0">sign in</PageTitle>
        </div>

        <div className="rounded-2xl border-[5px] border-border bg-card p-5 space-y-4">
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
            <span className="text-[10px] font-extrabold lowercase text-foreground/40">or</span>
            <div className="flex-1 h-[2px] bg-border" />
          </div>

          <Button className="h-14 w-full text-sm" onClick={handleAutoSignIn} disabled={submitting || googleLoading}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                signing in...
              </>
            ) : (
              <>
                continue
                <ArrowRight size={14} />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Auth;
