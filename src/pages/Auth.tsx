import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { toast } from "sonner";

const Auth = () => {
  const { autoSignIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  const handleAutoSignIn = async () => {
    setSubmitting(true);

    try {
      await autoSignIn();
    } catch (err: any) {
      toast.error(err.message || "something went wrong");
      setSubmitting(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-foreground" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-lg px-4 pt-12 pb-12">
        <div className="mb-10 flex items-center gap-3">
          <BackButton />
        </div>

        <PageTitle>sign in</PageTitle>

        <div className="rounded-2xl border-[4px] border-border bg-card p-5">
          <p className="mb-4 text-sm font-extrabold lowercase text-foreground/70">
            tap continue to sign in
          </p>

          <Button className="mt-0 h-14 w-full text-sm" onClick={handleAutoSignIn} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                signing in...
              </>
            ) : (
              <>
                continue
                <ArrowRight size={14} />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Auth;
