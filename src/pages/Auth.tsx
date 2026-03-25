import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";

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
    <div className="min-h-screen bg-background">
      <Header />

      <PageTransition>
      <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-10">
        <p className="text-sm font-extrabold lowercase text-center mb-1">{heading}</p>
        <p className="text-[10px] font-bold lowercase text-muted-foreground text-center mb-4">{subheading}</p>

        {signupSuccess || resetSent ? (
          <div className="border-2 border-border rounded-xl p-6 text-center">
            <p className="text-xs font-extrabold lowercase mb-1">check your email</p>
            <p className="text-[10px] font-bold lowercase text-muted-foreground">
              we sent a link to <strong className="text-foreground">{email}</strong> — {resetSent ? "click to reset your password." : "click to verify."}
            </p>
            {resetSent && (
              <button
                type="button"
                onClick={() => { setIsForgot(false); setResetSent(false); setError(""); }}
                className="mt-3 font-extrabold lowercase text-foreground underline text-[10px]"
              >
                back to log in
              </button>
            )}
          </div>
        ) : (
          <div className="border-2 border-border rounded-xl p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="border-2 border-destructive/30 bg-destructive/5 p-2.5 text-destructive font-extrabold lowercase rounded-xl text-[10px]">
                  {error}
                </div>
              )}

              <div>
                <span className="block text-[10px] font-extrabold lowercase text-muted-foreground mb-1.5">email</span>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border-2 border-border bg-background text-foreground pl-9 pr-3 py-2.5 text-xs font-extrabold lowercase placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 rounded-xl transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {!isForgot && (
                <div>
                  <span className="block text-[10px] font-extrabold lowercase text-muted-foreground mb-1.5">password</span>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full border-2 border-border bg-background text-foreground pl-9 pr-3 py-2.5 text-xs font-extrabold lowercase placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 rounded-xl transition-colors"
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
                    className="font-bold lowercase text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    forgot password?
                  </button>
                </div>
              )}

              <Button className="w-full h-12" disabled={loading}>
                {loading ? "loading…" : isForgot ? "send reset link" : isLogin ? (
                  <>log in <ArrowRight size={14} /></>
                ) : (
                  <>create account <ArrowRight size={14} /></>
                )}
              </Button>

              <p className="text-center font-bold lowercase text-[10px] text-muted-foreground pt-1">
                {isForgot ? (
                  <button type="button" onClick={() => { setIsForgot(false); setError(""); }} className="text-foreground underline">
                    back to log in
                  </button>
                ) : isLogin ? (
                  <>no account?{" "}<button type="button" onClick={() => { setIsLogin(false); setError(""); }} className="text-foreground underline">create one</button></>
                ) : (
                  <>have an account?{" "}<button type="button" onClick={() => { setIsLogin(true); setError(""); }} className="text-foreground underline">log in</button></>
                )}
              </p>
            </form>
          </div>
        )}

        <p className="text-center text-[10px] font-bold lowercase text-muted-foreground mt-4">
          ✦ free credit on signup · ✦ no spam
        </p>
      </main>
      </PageTransition>
    </div>
  );
};

export default Auth;
