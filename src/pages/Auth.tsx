import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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
  const { user, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Already logged in — send back to generate
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isForgot) {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setResetSent(true);
      }
    } else if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        navigate("/");
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setSignupSuccess(true);
      }
    }
    setLoading(false);
  };

  const heading = isForgot ? "reset password" : isLogin ? "log in" : "create account";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Back circle button */}
      <div className="flex justify-center pt-6 md:pt-10">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-foreground/30 flex items-center justify-center hover:bg-foreground/45 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-background" strokeWidth={3} />
        </button>
      </div>

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md mx-auto pt-6 md:pt-10 pb-8 px-4 sm:px-6"
      >
        <h1 className="text-[clamp(1.75rem,7vw,3.5rem)] font-extrabold lowercase tracking-tight leading-none mb-6">
          {heading}
        </h1>

        {signupSuccess || resetSent ? (
          <div className="border-[3px] border-foreground p-8 text-center">
            <h2 className="text-xl font-extrabold lowercase mb-3">check your email</h2>
            <p className="text-foreground/60 text-sm font-bold lowercase">
              we sent a link to <strong className="text-foreground">{email}</strong> — {resetSent ? "click to reset your password." : "click to verify."}
            </p>
            {resetSent && (
              <button
                type="button"
                onClick={() => { setIsForgot(false); setResetSent(false); setError(""); }}
                className="mt-4 font-extrabold lowercase text-foreground underline text-sm"
              >
                back to log in
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="border-[3px] border-destructive p-4 text-destructive font-extrabold lowercase">
                {error}
              </div>
            )}

            <div>
              <label className="block font-extrabold lowercase text-[clamp(0.85rem,2.5vw,1rem)] mb-1">email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border-[3px] border-foreground bg-background text-foreground p-4 text-[clamp(0.95rem,3vw,1.25rem)] font-extrabold lowercase placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground"
                placeholder="you@example.com"
              />
            </div>

            {!isForgot && (
              <div>
                <label className="block font-extrabold lowercase text-[clamp(0.85rem,2.5vw,1rem)] mb-1">password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full border-[3px] border-foreground bg-background text-foreground p-4 text-[clamp(0.95rem,3vw,1.25rem)] font-extrabold lowercase placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground"
                  placeholder="••••••••"
                />
              </div>
            )}

            <Button size="xl" variant="hero" className="w-full text-[clamp(1rem,3vw,1.25rem)] disabled:opacity-100" disabled={loading}>
              {loading ? "loading…" : isForgot ? "send reset link" : isLogin ? "log in" : "create"}
            </Button>

            {isLogin && !isForgot && (
              <p className="text-center">
                <button
                  type="button"
                  onClick={() => { setIsForgot(true); setError(""); }}
                  className="font-extrabold lowercase text-[clamp(0.8rem,2.5vw,1rem)] text-foreground/50 underline"
                >
                  forgot password?
                </button>
              </p>
            )}

            <p className="text-center font-extrabold lowercase text-[clamp(0.8rem,2.5vw,1rem)] text-foreground/50 pt-1">
              {isForgot ? (
                <button
                  type="button"
                  onClick={() => { setIsForgot(false); setError(""); }}
                  className="text-foreground underline"
                >
                  back to log in
                </button>
              ) : isLogin ? (
                <>
                  no account?{" "}
                  <button type="button" onClick={() => { setIsLogin(false); setError(""); }} className="text-foreground underline">
                    create one
                  </button>
                </>
              ) : (
                <>
                  have an account?{" "}
                  <button type="button" onClick={() => { setIsLogin(true); setError(""); }} className="text-foreground underline">
                    log in
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </motion.main>
    </div>
  );
};

export default Auth;
