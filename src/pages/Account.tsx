import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Mail, Zap, Calendar, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

const Account = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { credits } = useCredits();
  const { subscribed, plan, cancel } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
        <div className="flex items-center gap-3 mb-10">
          <BackButton />
        </div>
        <PageTitle>my account</PageTitle>

        <div className="space-y-4">
          {/* Subscribe button OR plan info */}
          {subscribed ? (
            <div className="border-[4px] border-border rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Crown size={16} strokeWidth={2.5} className="text-foreground shrink-0" />
                <div className="flex-1">
                  <span className="block text-xs font-extrabold lowercase text-foreground">current plan</span>
                  <span className="block text-sm font-extrabold lowercase text-foreground">{plan}</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full h-12 text-sm"
                onClick={cancel}
              >
                cancel subscription
              </Button>
            </div>
          ) : (
            <Button
              className="w-full h-14 text-base bg-gradient-to-r from-amber-400 to-amber-500 text-foreground hover:from-amber-500 hover:to-amber-600 border-0 font-extrabold lowercase"
              onClick={() => navigate("/account/membership")}
            >
              subscribe
            </Button>
          )}

          <div className="border-[4px] border-border rounded-2xl p-4 flex items-center gap-3">
            <Mail size={16} strokeWidth={2.5} className="text-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="block text-xs font-extrabold lowercase text-foreground">email</span>
              <span className="block text-sm font-extrabold lowercase text-foreground truncate">
                {user?.email || "..."}
              </span>
            </div>
          </div>

          <div className="border-[4px] border-border rounded-2xl p-4 flex items-center gap-3">
            <Calendar size={16} strokeWidth={2.5} className="text-foreground shrink-0" />
            <div className="flex-1">
              <span className="block text-xs font-extrabold lowercase text-foreground">member since</span>
              <span className="block text-sm font-extrabold lowercase text-foreground">
                march 2026
              </span>
            </div>
          </div>

          <div className="border-[4px] border-border rounded-2xl p-4 flex items-center gap-3">
            <Zap size={16} strokeWidth={2.5} className="text-foreground shrink-0" />
            <div className="flex-1">
              <span className="block text-xs font-extrabold lowercase text-foreground">credits</span>
              <span className="block text-sm font-extrabold lowercase text-foreground">
                {credits}
              </span>
            </div>
          </div>

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
    </div>
  );
};

export default Account;
