import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";

const Auth = () => {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  const handleSignIn = () => {
    signIn("demo@vizura.app", "demo");
  };

  if (user) return null;

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-16 pb-12">
        <div className="flex items-center gap-3 mb-10">
          <BackButton />
        </div>
        <h1 className="text-4xl font-extrabold lowercase tracking-tight text-foreground mb-10">sign in</h1>

        <Button className="w-full h-16 text-sm" onClick={handleSignIn}>
          sign in <ArrowRight size={14} />
        </Button>
      </main>
    </div>
  );
};

export default Auth;
