import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import PageTransition from "@/components/PageTransition";
import PageTitle from "@/components/PageTitle";

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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <PageTransition>
        <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
          <div className="flex items-center gap-3 mb-10">
            <BackButton />
          </div>

          <PageTitle>{heading}</PageTitle>

          {signupSuccess || resetSent ? (
            <div className="border-4 border-border rounded-2xl p-6 text-center">
              <p className="text-xs font-extrabold lowercase mb-1">check your email</p>
              <p className="text-[10px] font-bold lowercase text-muted-foreground">
                we sent a link to <strong className="text-foreground">{email}</strong>
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
            <div className="border-4 border-border rounded-2xl p-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="border-4 border-destructive/30 bg-destructive/5 p-3 text-destructive font-extrabold lowercase rounded-2xl text-xs">
                    {error}
                  </div>
                )}

                <div>
                  <span className="block text-xs font-extrabold lowercase text-muted-foreground mb-2">email</span>
                  <div className="relative">
                    <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full border-4 border-border bg-background text-foreground pl-10 pr-4 py-3.5 text-xs font-extrabold lowercase placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 rounded-2xl transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {!isForgot && (
                  <div>
                    <span className="block text-xs font-extrabold lowercase text-muted-foreground mb-2">password</span>
                    <div className="relative">
                      <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full border-4 border-border bg-background text-foreground pl-10 pr-4 py-3.5 text-xs font-extrabold lowercase placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 rounded-2xl transition-colors"
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

                <Button className="w-full h-16 text-sm" disabled={loading}>
                  {loading ? "loading…" : isForgot ? "send reset link" : isLogin ? (
                    <>log in <ArrowRight size={14} /></>
                  ) : (
                    <>create account <ArrowRight size={14} /></>
                  )}
                </Button>

                <p className="text-center font-bold lowercase text-[10px] text-muted-foreground">
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
        </main>
      </PageTransition>
    </div>
  );
};

export default Auth;
