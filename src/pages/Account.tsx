import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import PageTransition from "@/components/PageTransition";
import PageTitle from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";

const Account = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { credits } = useCredits();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <PageTransition>
        <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
          <div className="flex items-center gap-3 mb-10">
            <BackButton />
          </div>
          <PageTitle>account</PageTitle>

          <div className="space-y-4">
            {/* Email */}
            <div className="border-[5px] border-border rounded-2xl p-4 flex items-center gap-3">
              <Mail size={16} strokeWidth={2.5} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-extrabold lowercase text-muted-foreground">email</span>
                <span className="block text-sm font-extrabold lowercase text-foreground truncate">
                  {user?.email || "—"}
                </span>
              </div>
            </div>

            {/* Credits */}
            <div className="border-[5px] border-border rounded-2xl p-4 flex items-center gap-3">
              <Zap size={16} strokeWidth={2.5} className="text-muted-foreground shrink-0" />
              <div className="flex-1">
                <span className="block text-xs font-extrabold lowercase text-muted-foreground">credits</span>
                <span className="block text-sm font-extrabold lowercase text-foreground">
                  {credits}
                </span>
              </div>
            </div>

            {/* Sign out */}
            <Button
              variant="outline"
              className="w-full h-14 text-sm mt-6"
              onClick={handleSignOut}
            >
              <LogOut size={16} strokeWidth={2.5} />
              sign out
            </Button>
          </div>
        </main>
      </PageTransition>
    </div>
  );
};

export default Account;
