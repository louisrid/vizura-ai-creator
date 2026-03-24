import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
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
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Already logged in — send back to generate
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isLogin) {
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="w-full max-w-md mx-auto pt-16 md:pt-24 pb-8 px-4 sm:px-6">
        <h1 className="text-[clamp(1.75rem,7vw,3.5rem)] font-extrabold lowercase tracking-tight leading-none mb-6">
          {isLogin ? "log in" : "create account"}
        </h1>

        {signupSuccess ? (
          <div className="border-[3px] border-foreground p-8 text-center">
            <h2 className="text-xl font-extrabold lowercase mb-3">check your email</h2>
            <p className="text-foreground/60 text-sm font-bold lowercase">
              we sent a link to <strong className="text-foreground">{email}</strong> — click to verify.
            </p>
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

            <Button size="xl" variant="hero" className="w-full text-[clamp(1rem,3vw,1.25rem)] disabled:opacity-100" disabled={loading}>
              {loading ? "loading…" : isLogin ? "log in" : "create"}
            </Button>
            <p className="text-center font-extrabold lowercase text-[clamp(0.8rem,2.5vw,1rem)] text-foreground/50 pt-2">
              {isLogin ? "no account? " : "have an account? "}
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(""); }}
                className="text-foreground underline"
              >
                {isLogin ? "create one" : "log in"}
              </button>
            </p>
          </form>
        )}
      </main>
    </div>
  );
};

export default Auth;
