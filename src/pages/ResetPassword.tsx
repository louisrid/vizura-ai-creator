import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
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
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) { setError("passwords don't match"); return; }
    if (password.length < 6) { setError("password must be at least 6 characters"); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      setSuccess(true);
      setTimeout(() => navigate("/", { replace: true }), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-10">
        <p className="text-sm font-extrabold lowercase text-center mb-1">new password</p>
        <p className="text-[10px] font-bold lowercase text-muted-foreground text-center mb-4">set a new password for your account</p>

        {success ? (
          <div className="border-2 border-border rounded-xl p-6 text-center">
            <p className="text-xs font-extrabold lowercase mb-1">password updated</p>
            <p className="text-[10px] font-bold lowercase text-muted-foreground">redirecting you now…</p>
          </div>
        ) : !isRecovery ? (
          <div className="border-2 border-border rounded-xl p-6 text-center">
            <p className="text-xs font-extrabold lowercase mb-1">invalid link</p>
            <p className="text-[10px] font-bold lowercase text-muted-foreground mb-3">this reset link is expired or invalid.</p>
            <button onClick={() => navigate("/auth")} className="font-extrabold lowercase text-foreground underline text-[10px]">
              back to log in
            </button>
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
                <span className="block text-[10px] font-extrabold lowercase text-muted-foreground mb-1.5">new password</span>
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

              <div>
                <span className="block text-[10px] font-extrabold lowercase text-muted-foreground mb-1.5">confirm password</span>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full border-2 border-border bg-background text-foreground pl-9 pr-3 py-2.5 text-xs font-extrabold lowercase placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 rounded-xl transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button className="w-full h-12" disabled={loading}>
                {loading ? "loading…" : "update password"}
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default ResetPassword;
