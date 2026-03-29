import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, Mail, Gem, Calendar, Crown, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useGems } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { useEffect } from "react";

const Account = () => {
  const { user, loading: authLoading, signOut, autoSignIn } = useAuth();
  const { gems, refetch: refetchGems } = useGems();
  const { subscribed, status, refetch: refetchSub } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get("redirect");

  // Redirect back after successful login
  useEffect(() => {
    if (user && redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, redirectTo, navigate]);

  // Refetch on checkout success
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") {
      refetchSub();
      refetchGems();
    }
  }, [location.search, refetchSub, refetchGems]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-foreground" size={28} />
      </div>
    );
  }

  if (!user) {
    return <SignInView autoSignIn={autoSignIn} />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
        <div className="flex items-center gap-3 mb-10">
          <BackButton />
        </div>
        <PageTitle>my account</PageTitle>

        <div className="space-y-4">
          {subscribed ? (
            <div className="border-[5px] border-border rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Crown size={16} strokeWidth={2.5} className="text-foreground shrink-0" />
                <div className="flex-1">
                  <span className="block text-xs font-extrabold lowercase text-foreground">current plan</span>
                  <span className="block text-sm font-extrabold lowercase text-foreground">vizura membership ({status})</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              className="w-full h-14 rounded-2xl bg-neon-green text-neon-green-foreground text-base font-extrabold lowercase hover:opacity-90 transition-all"
              onClick={() => navigate("/account/membership")}
            >
              subscribe
            </button>
          )}

          <div className="border-[5px] border-border rounded-2xl p-4 flex items-center gap-3">
            <Mail size={16} strokeWidth={2.5} className="text-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="block text-xs font-extrabold lowercase text-foreground">email</span>
              <span className="block text-sm font-extrabold lowercase text-foreground truncate">
                {user?.email || "..."}
              </span>
            </div>
          </div>

          <div className="border-[5px] border-border rounded-2xl p-4 flex items-center gap-3">
            <Calendar size={16} strokeWidth={2.5} className="text-foreground shrink-0" />
            <div className="flex-1">
              <span className="block text-xs font-extrabold lowercase text-foreground">member since</span>
              <span className="block text-sm font-extrabold lowercase text-foreground">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }).toLowerCase() : "..."}
              </span>
            </div>
          </div>

          <div className="border-[5px] border-border rounded-2xl p-4 flex items-center gap-3">
            <Gem size={16} strokeWidth={2.5} className="text-gem-green shrink-0" />
            <div className="flex-1">
              <span className="block text-xs font-extrabold lowercase text-foreground">gems</span>
              <span className="block text-sm font-extrabold lowercase text-foreground">
                {gems}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-14 text-sm mt-6"
            onClick={handleSignOut}
          >
            <LogOut size={16} strokeWidth={2.5} />
            sign out
          </Button>
        </div>
      </main>
    </div>
  );
};

const SignInView = ({ autoSignIn, redirectTo }: { autoSignIn: () => Promise<void>; redirectTo?: string | null }) => {
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
        ? `${window.location.origin}/account?redirect=${encodeURIComponent(redirectTo)}`
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

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-lg px-4 pt-12 pb-12">
        <div className="mb-10 flex items-center gap-3">
          <BackButton />
        </div>

        <PageTitle>my account</PageTitle>

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

export default Account;
