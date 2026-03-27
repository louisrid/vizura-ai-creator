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

  useEffect(() => {
    if (authLoading || user || submitting) return;
    const doAutoSign = async () => {
      setSubmitting(true);
      try {
        await autoSignIn();
      } catch (err: any) {
        toast.error(err.message || "something went wrong");
      } finally {
        setSubmitting(false);
      }
    };
    doAutoSign();
  }, [authLoading, user, submitting, autoSignIn]);

  if (authLoading || user || submitting) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="animate-spin text-foreground" size={28} />
    </div>
  );

  return null;
};

export default Auth;
