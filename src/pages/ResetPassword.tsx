import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";

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
      <main className="w-full max-w-lg mx-auto px-4 pt-14 pb-[250px]">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <PageTitle className="mb-0">reset password</PageTitle>
        </div>

        {success ? (
          <div className="border-[2px] border-border rounded-2xl p-6 text-center">
            <p className="text-xs font-extrabold lowercase mb-1 text-foreground">password updated</p>
            <p className="text-[10px] font-bold lowercase text-foreground/50">redirecting...</p>
          </div>
        ) : !isRecovery ? (
          <div className="border-[2px] border-border rounded-2xl p-6 text-center">
            <p className="text-xs font-extrabold lowercase mb-3 text-foreground">invalid link</p>
            <button onClick={() => navigate("/account")} className="font-extrabold lowercase text-foreground underline text-[10px]">
              back to log in
            </button>
          </div>
        ) : (
          <div className="border-[2px] border-border rounded-2xl p-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="border-[2px] border-destructive/30 bg-destructive/5 p-3 text-destructive font-extrabold lowercase rounded-2xl text-xs">
                  {error}
                </div>
              )}

              <div>
                <span className="block text-xs font-extrabold lowercase text-foreground mb-2">new password</span>
                <div className="relative">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full border-[2px] border-border bg-card text-foreground pl-10 pr-4 py-3.5 text-xs font-extrabold lowercase placeholder:text-foreground/30 focus:outline-none focus:border-foreground rounded-2xl transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-extrabold lowercase text-foreground mb-2">confirm password</span>
                <div className="relative">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full border-[2px] border-border bg-card text-foreground pl-10 pr-4 py-3.5 text-xs font-extrabold lowercase placeholder:text-foreground/30 focus:outline-none focus:border-foreground rounded-2xl transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-14 text-sm" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    updating...
                  </>
                ) : (
                  "update password"
                )}
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default ResetPassword;
