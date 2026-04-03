import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, Mail, Gem, Calendar, Crown, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import SubscribeOverlay from "@/components/SubscribeOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useGems } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/components/ui/sonner";
import DotDecal from "@/components/DotDecal";

const Account = () => {
  const { user, loading: authLoading, signOut, signIn, signUp } = useAuth();
  const { gems, refetch: refetchGems } = useGems();
  const { subscribed, status, refetch: refetchSub, optimisticSubscribe } = useSubscription();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const [justSubscribed, setJustSubscribed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get("redirect");

  useEffect(() => {
    if (user && redirectTo) navigate(redirectTo, { replace: true });
  }, [user, redirectTo, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") { refetchSub(); refetchGems(); }
  }, [location.search, refetchSub, refetchGems]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-foreground" size={28} />
      </div>
    );
  }

  if (!user) return <SignInView signIn={signIn} signUp={signUp} redirectTo={redirectTo} />;

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const handleSubscribe = async () => {
    setBuying(true);
    optimisticSubscribe();
    setBuying(false);
    setOverlayOpen(false);
    setJustSubscribed(true);
    if (location.search) navigate("/account", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <CelebrationOverlay active={justSubscribed} onDone={() => setJustSubscribed(false)} />
      <main className="w-full max-w-lg md:max-w-2xl mx-auto px-4 md:px-8 pt-14 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <BackButton />
          <PageTitle className="mb-0">my account</PageTitle>
        </div>

        <div className="space-y-3">
          {subscribed ? (
            <div className="w-full h-12 rounded-2xl bg-neon-green text-neon-green-foreground text-sm font-extrabold lowercase flex items-center justify-center opacity-50 pointer-events-none">
              subscribed
            </div>
          ) : (
            <button
              className="w-full h-12 rounded-2xl bg-neon-yellow text-neon-yellow-foreground text-sm font-extrabold lowercase hover:opacity-90 transition-all"
              onClick={() => setOverlayOpen(true)}
            >
              subscribe
            </button>
          )}

          <div className="md:grid md:grid-cols-2 md:gap-3 space-y-3 md:space-y-0">
            <div className="border-[5px] border-border rounded-2xl p-3 flex items-center gap-3">
              <Mail size={16} strokeWidth={2.5} className="text-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-extrabold lowercase text-foreground">email</span>
                <span className="block text-sm font-extrabold lowercase text-foreground truncate">
                  {user?.email || "..."}
                </span>
              </div>
            </div>

            <div className="border-[5px] border-border rounded-2xl p-3 flex items-center gap-3">
              <Calendar size={16} strokeWidth={2.5} className="text-foreground shrink-0" />
              <div className="flex-1">
                <span className="block text-xs font-extrabold lowercase text-foreground">member since</span>
                <span className="block text-sm font-extrabold lowercase text-foreground">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }).toLowerCase() : "..."}
                </span>
              </div>
            </div>

            <div className="border-[5px] border-border rounded-2xl p-3 flex items-center gap-3">
              <Gem size={16} strokeWidth={2.5} className="text-gem-green shrink-0" />
              <div className="flex-1">
                <span className="block text-xs font-extrabold lowercase text-foreground">gems</span>
                <span className="block text-sm font-extrabold lowercase text-foreground">{gems}</span>
              </div>
            </div>

            {subscribed && (
              <div className="border-[5px] border-border rounded-2xl p-3 flex items-center gap-3">
                <Crown size={16} strokeWidth={2.5} className="text-neon-yellow shrink-0" />
                <div className="flex-1">
                  <span className="block text-xs font-extrabold lowercase text-foreground">renewal</span>
                  <span className="block text-sm font-extrabold lowercase text-foreground">50 gems on renewal</span>
                </div>
              </div>
            )}
          </div>

          <Button variant="outline" className="w-full h-12 text-sm mt-4" onClick={handleSignOut}>
            <LogOut size={16} strokeWidth={2.5} />
            sign out
          </Button>
        </div>
      </main>

      <SubscribeOverlay
        open={overlayOpen}
        onDismiss={() => setOverlayOpen(false)}
        onSubscribe={handleSubscribe}
        buying={buying}
      />
    </div>
  );
};

const CelebrationOverlay = ({ active, onDone }: { active: boolean; onDone: () => void }) => {
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (!active) { setShowing(false); return; }
    setShowing(true);
    const root = document.getElementById("root");
    const prev = { body: document.body.style.overflow, html: document.documentElement.style.overflow, root: root?.style.overflow ?? "" };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (root) root.style.overflow = "hidden";
    const t = setTimeout(() => setShowing(false), 1400);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev.body;
      document.documentElement.style.overflow = prev.html;
      if (root) root.style.overflow = prev.root;
    };
  }, [active]);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {showing && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: "hsl(var(--member-green))" }}
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
        >
          <motion.h1
            className="text-[3rem] font-extrabold lowercase tracking-tight text-black"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, delay: 0.05, ease: [0.34, 1.56, 0.64, 1] }}
          >
            subscribed!
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
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
    try {
      const redirectUri = redirectTo
        ? `${window.location.origin}/account?redirect=${encodeURIComponent(redirectTo)}`
        : window.location.origin;
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectUri });
      if (result?.error) { toast.error("google sign in failed"); setGoogleLoading(false); }
    } catch (err: any) { toast.error(err.message || "google sign in failed"); setGoogleLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-lg md:max-w-2xl px-4 md:px-8 pt-14 pb-8">
        <div className="mb-5 flex items-center gap-3">
          <BackButton />
          <PageTitle className="mb-0">my account</PageTitle>
        </div>
        <div className="rounded-2xl border-[5px] border-border bg-card p-5 space-y-3 max-w-md">
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || submitting}
            className="w-full h-14 rounded-2xl bg-neon-yellow text-neon-yellow-foreground text-sm font-extrabold lowercase hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
            className="w-full h-12 rounded-2xl border-[3px] border-border bg-secondary px-4 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 outline-none focus:border-neon-yellow transition-colors"
            disabled={submitting || googleLoading}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleEmailAuth(); }}
            className="w-full h-12 rounded-2xl border-[3px] border-border bg-secondary px-4 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 outline-none focus:border-neon-yellow transition-colors"
            disabled={submitting || googleLoading}
          />
          <Button className="h-14 w-full text-sm" onClick={handleEmailAuth} disabled={submitting || googleLoading}>
            {submitting ? (<><Loader2 className="animate-spin" size={18} />signing in...</>) : (<>{isSignUpMode ? "sign up" : "sign in"}<ArrowRight size={14} /></>)}
          </Button>
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
