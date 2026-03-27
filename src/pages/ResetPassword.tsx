import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
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
      <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
        <div className="flex items-center gap-3 mb-10">
          <BackButton />
        </div>
        <PageTitle>reset password</PageTitle>

        {success ? (
          <div className="border-[4px] border-border rounded-2xl p-6 text-center">
            <p className="text-xs font-extrabold lowercase mb-1">password updated</p>
            <p className="text-[10px] font-bold lowercase text-foreground">redirecting...</p>
          </div>
        ) : !isRecovery ? (
          <div className="border-[4px] border-border rounded-2xl p-6 text-center">
            <p className="text-xs font-extrabold lowercase mb-3">invalid link</p>
            <button onClick={() => navigate("/auth")} className="font-extrabold lowercase text-foreground underline text-[10px]">
              back to log in
            </button>
          </div>
        ) : (
          <div className="border-[4px] border-border rounded-2xl p-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="border-[4px] border-destructive/30 bg-destructive/5 p-3 text-destructive font-extrabold lowercase rounded-2xl text-xs">
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
                    className="w-full border-[4px] border-border bg-background text-foreground pl-10 pr-4 py-3.5 text-xs font-extrabold lowercase placeholder:text-foreground/30 focus:outline-none focus:border-foreground rounded-2xl transition-colors"
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
                    className="w-full border-[4px] border-border bg-background text-foreground pl-10 pr-4 py-3.5 text-xs font-extrabold lowercase placeholder:text-foreground/30 focus:outline-none focus:border-foreground rounded-2xl transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button className="w-full h-16 text-sm" disabled={loading}>
                {loading ? "loading..." : "update password"}
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default ResetPassword;
