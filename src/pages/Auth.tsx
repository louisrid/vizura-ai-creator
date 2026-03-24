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
      <main className="container max-w-md pt-16 md:pt-24 pb-8">
        <h1 className="text-display-sm text-center mb-2">
          {isLogin ? "log in" : "sign up"}
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-8">
          {isLogin ? "enter your email & password to continue" : "create an account & get your first free credit"}
        </p>

        {signupSuccess ? (
          <div className="border-2 border-foreground p-8 text-center">
            <h2 className="text-heading mb-3">check your email</h2>
            <p className="text-muted-foreground text-sm">
              we sent a link to <strong>{email}</strong> — click it to verify & unlock your credit.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="border-2 border-destructive p-4 text-destructive font-semibold lowercase">
                {error}
              </div>
            )}

            <div>
              <label className="block font-extrabold lowercase mb-2">email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border-2 border-foreground bg-background text-foreground p-4 text-body-lg font-semibold lowercase placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block font-extrabold lowercase mb-2">password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border-2 border-foreground bg-background text-foreground p-4 text-body-lg font-semibold lowercase placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                placeholder="••••••••"
              />
            </div>

            <Button size="xl" variant="hero" className="w-full" disabled={loading}>
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
