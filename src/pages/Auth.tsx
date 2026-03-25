import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [btnBounceKey, setBtnBounceKey] = useState(0);
  const { user, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isForgot) {
      const { error } = await resetPassword(email);
      if (error) setError(error.message);
      else setResetSent(true);
    } else if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
      else navigate("/");
    } else {
      const { error } = await signUp(email, password);
      if (error) setError(error.message);
      else setSignupSuccess(true);
    }
    setLoading(false);
  };

  const heading = isForgot ? "reset password" : isLogin ? "welcome back" : "get started";
  const subheading = isForgot
    ? "enter your email and we'll send a reset link"
    : isLogin
    ? "log in to continue creating"
    : "create an account to start generating";

  return (
    <div className="min-h-screen gradient-subtle">
      <Header />

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md mx-auto pt-10 md:pt-16 pb-8 px-4 sm:px-6"
      >
        {/* Branding icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center shadow-medium">
            <Sparkles size={24} className="text-background" />
          </div>
        </div>

        <h1 className="text-[clamp(1.75rem,7vw,2.5rem)] font-extrabold lowercase tracking-tight leading-none text-center mb-2">
          {heading}
        </h1>
        <p className="text-center text-muted-foreground text-sm font-semibold lowercase mb-8">
          {subheading}
        </p>

        {signupSuccess || resetSent ? (
          <div className="bg-card rounded-2xl border border-border shadow-soft p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-accent-purple-light flex items-center justify-center mx-auto mb-4">
              <Mail size={20} className="text-accent-purple" />
            </div>
            <h2 className="text-lg font-extrabold lowercase mb-2">check your email</h2>
            <p className="text-muted-foreground text-sm font-semibold lowercase">
              we sent a link to <strong className="text-foreground">{email}</strong> — {resetSent ? "click to reset your password." : "click to verify."}
            </p>
            {resetSent && (
              <button
                type="button"
                onClick={() => { setIsForgot(false); setResetSent(false); setError(""); }}
                className="mt-4 font-extrabold lowercase text-accent-purple underline text-sm"
              >
                back to log in
              </button>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-soft p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="border border-destructive/30 bg-destructive/5 p-4 text-destructive font-bold lowercase rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-extrabold lowercase text-sm mb-1.5">email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border border-border bg-background text-foreground pl-11 pr-4 py-3.5 text-sm font-bold lowercase placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent-purple/30 focus:border-accent-purple/50 rounded-xl transition-shadow"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {!isForgot && (
                <div>
                  <label className="block font-extrabold lowercase text-sm mb-1.5">password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full border border-border bg-background text-foreground pl-11 pr-4 py-3.5 text-sm font-bold lowercase placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent-purple/30 focus:border-accent-purple/50 rounded-xl transition-shadow"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              {isLogin && !isForgot && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setIsForgot(true); setError(""); }}
                    className="font-bold lowercase text-xs text-muted-foreground hover:text-accent-purple transition-colors"
                  >
                    forgot password?
                  </button>
                </div>
              )}

              <motion.div
                key={btnBounceKey}
                animate={btnBounceKey > 0 ? { x: [0, -4, 3, -1.5, 0.5, 0] } : undefined}
                transition={{ duration: 0.5, ease: [0.22, 0, 0.36, 1] }}
              >
                <Button
                  size="lg"
                  variant="hero"
                  className="w-full text-base disabled:opacity-60"
                  disabled={loading}
                  onClick={() => setBtnBounceKey((k) => k + 1)}
                >
                  {loading ? "loading…" : isForgot ? "send reset link" : isLogin ? (
                    <>log in <ArrowRight size={16} /></>
                  ) : (
                    <>create account <ArrowRight size={16} /></>
                  )}
                </Button>
              </motion.div>

              <p className="text-center font-bold lowercase text-xs text-muted-foreground pt-2">
                {isForgot ? (
                  <button
                    type="button"
                    onClick={() => { setIsForgot(false); setError(""); }}
                    className="text-foreground underline hover:text-accent-purple transition-colors"
                  >
                    back to log in
                  </button>
                ) : isLogin ? (
                  <>
                    no account?{" "}
                    <button type="button" onClick={() => { setIsLogin(false); setError(""); }} className="text-foreground underline hover:text-accent-purple transition-colors">
                      create one
                    </button>
                  </>
                ) : (
                  <>
                    have an account?{" "}
                    <button type="button" onClick={() => { setIsLogin(true); setError(""); }} className="text-foreground underline hover:text-accent-purple transition-colors">
                      log in
                    </button>
                  </>
                )}
              </p>
            </form>
          </div>
        )}

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground font-semibold lowercase">
          <span>✦ free credit on signup</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span>✦ no spam, ever</span>
        </div>
      </motion.main>
    </div>
  );
};

export default Auth;
