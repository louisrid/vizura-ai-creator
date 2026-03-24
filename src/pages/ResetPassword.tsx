import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError("password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/", { replace: true }), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-md mx-auto pt-16 md:pt-24 pb-8 px-4 sm:px-6"
      >
        <h1 className="text-[clamp(1.75rem,7vw,3.5rem)] font-extrabold lowercase tracking-tight leading-none mb-6">
          new password
        </h1>

        {success ? (
          <div className="border-[3px] border-foreground p-8 text-center">
            <h2 className="text-xl font-extrabold lowercase mb-3">password updated</h2>
            <p className="text-foreground/60 text-sm font-bold lowercase">
              redirecting you now…
            </p>
          </div>
        ) : !isRecovery ? (
          <div className="border-[3px] border-foreground p-8 text-center">
            <h2 className="text-xl font-extrabold lowercase mb-3">invalid link</h2>
            <p className="text-foreground/60 text-sm font-bold lowercase mb-4">
              this reset link is expired or invalid.
            </p>
            <button
              onClick={() => navigate("/auth")}
              className="font-extrabold lowercase text-foreground underline text-sm"
            >
              back to log in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="border-[3px] border-destructive p-4 text-destructive font-extrabold lowercase">
                {error}
              </div>
            )}

            <div>
              <label className="block font-extrabold lowercase text-[clamp(0.85rem,2.5vw,1rem)] mb-1">new password</label>
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

            <div>
              <label className="block font-extrabold lowercase text-[clamp(0.85rem,2.5vw,1rem)] mb-1">confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border-[3px] border-foreground bg-background text-foreground p-4 text-[clamp(0.95rem,3vw,1.25rem)] font-extrabold lowercase placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground"
                placeholder="••••••••"
              />
            </div>

            <Button size="xl" variant="hero" className="w-full text-[clamp(1rem,3vw,1.25rem)] disabled:opacity-100" disabled={loading}>
              {loading ? "loading…" : "update password"}
            </Button>
          </form>
        )}
      </motion.main>
    </div>
  );
};

export default ResetPassword;
