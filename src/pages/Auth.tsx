import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        navigate("/generate");
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-md pt-14 md:pt-20 pb-8 px-5">
        <h1 className="text-2xl font-extrabold lowercase tracking-tight text-center mb-2">
          {isLogin ? "log in" : "sign up"}
        </h1>
        <p className="text-foreground/50 text-sm font-extrabold lowercase text-center mb-6">
          {isLogin ? "enter email & password" : "create account & get 1 free credit"}
        </p>

        {signupSuccess ? (
          <div className="border-2 border-foreground p-8 text-center">
            <h2 className="text-xl font-extrabold lowercase mb-3">check your email</h2>
            <p className="text-foreground/60 text-sm font-bold lowercase">
              we sent a link to <strong className="text-foreground">{email}</strong> — click to verify.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="border-2 border-destructive p-4 text-destructive font-semibold lowercase">
                {error}
              </div>
            )}

            <div>
              <label className="block font-extrabold lowercase text-sm mb-1">email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border-2 border-foreground bg-background text-foreground p-4 text-base font-extrabold lowercase placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block font-extrabold lowercase text-sm mb-1">password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border-2 border-foreground bg-background text-foreground p-4 text-base font-extrabold lowercase placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground"
                placeholder="••••••••"
              />
            </div>

            <Button size="xl" variant="hero" className="w-full text-lg" disabled={loading}>
              {loading ? "loading…" : isLogin ? "log in" : "create account"}
            </Button>

            <p className="text-center text-muted-foreground font-semibold">
              {isLogin ? "don't have an account? " : "already have an account? "}
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(""); }}
                className="text-foreground underline font-extrabold lowercase"
              >
                {isLogin ? "sign up" : "log in"}
              </button>
            </p>
          </form>
        )}
      </main>
    </div>
  );
};

export default Auth;
