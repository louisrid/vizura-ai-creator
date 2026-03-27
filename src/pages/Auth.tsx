import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { toast } from "sonner";

const Auth = () => {
  const { signIn, signUp, resetPassword, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "forgot") {
        await resetPassword(email);
        toast.success("check your email for a reset link");
        setMode("signin");
      } else if (mode === "signup") {
        await signUp(email, password);
        toast.success("check your email to confirm your account");
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      toast.error(err.message || "something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || user) return null;

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
        <div className="flex items-center gap-3 mb-10">
          <BackButton />
        </div>
        <PageTitle>{mode === "forgot" ? "reset password" : mode === "signup" ? "sign up" : "sign in"}</PageTitle>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-14 w-full rounded-2xl border-[5px] border-border bg-card px-4 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 outline-none transition-colors focus:border-foreground"
          />

          {mode !== "forgot" && (
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-14 w-full rounded-2xl border-[5px] border-border bg-card px-4 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 outline-none transition-colors focus:border-foreground"
            />
          )}

          <Button className="w-full h-14 text-sm mt-2" type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                {mode === "forgot" ? "send reset link" : mode === "signup" ? "sign up" : "sign in"}
                <ArrowRight size={14} />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2">
          {mode === "signin" && (
            <>
              <button
                onClick={() => setMode("signup")}
                className="text-xs font-extrabold lowercase text-foreground/60 hover:text-foreground transition-colors"
              >
                don't have an account? sign up
              </button>
              <button
                onClick={() => setMode("forgot")}
                className="text-xs font-extrabold lowercase text-foreground/40 hover:text-foreground transition-colors"
              >
                forgot password?
              </button>
            </>
          )}
          {mode === "signup" && (
            <button
              onClick={() => setMode("signin")}
              className="text-xs font-extrabold lowercase text-foreground/60 hover:text-foreground transition-colors"
            >
              already have an account? sign in
            </button>
          )}
          {mode === "forgot" && (
            <button
              onClick={() => setMode("signin")}
              className="text-xs font-extrabold lowercase text-foreground/60 hover:text-foreground transition-colors"
            >
              back to sign in
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Auth;
