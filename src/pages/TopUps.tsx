import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useCredits } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const plans = [
  { label: "starter", credits: 1000, price: 9 },
  { label: "popular", credits: 3500, price: 20, highlighted: true },
  { label: "pro", credits: 15000, price: 60 },
];

const TopUps = () => {
  const { credits } = useCredits();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const handleBuy = () => {
    toast({ title: "coming soon", description: "top-ups will be available soon" });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
        <div className="flex items-center gap-3 mb-10">
          <BackButton />
        </div>
        <PageTitle>top-ups</PageTitle>

        <div className="flex items-center gap-2 mb-10">
          <Zap size={20} strokeWidth={2.5} className="text-foreground" />
          <span className="text-2xl font-extrabold lowercase text-foreground">{credits} credits</span>
        </div>

        <div className="space-y-4">
          {plans.map((plan) => {
            const perCredit = (plan.price / plan.credits).toFixed(3);
            return (
              <div
                key={plan.label}
                className={`rounded-2xl p-5 ${
                  plan.highlighted
                    ? "border-gradient-blue bg-foreground"
                    : "border-[5px] border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-extrabold lowercase ${
                      plan.highlighted ? "text-background" : "text-foreground"
                    }`}
                  >
                    {plan.label}
                  </span>
                  {plan.highlighted && (
                    <span className="text-[10px] font-extrabold lowercase text-background bg-background/20 px-2 py-0.5 rounded-full">
                      best value
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mb-1">
                  <span
                    className={`text-xl font-extrabold lowercase ${
                      plan.highlighted ? "text-background" : "text-foreground"
                    }`}
                  >
                    {plan.credits.toLocaleString()} credits
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-4">
                  <span
                    className={`text-2xl font-extrabold lowercase ${
                      plan.highlighted ? "text-background" : "text-foreground"
                    }`}
                  >
                    ${plan.price}
                  </span>
                  <span
                    className={`text-[11px] font-extrabold lowercase ${
                      plan.highlighted ? "text-background/60" : "text-foreground/50"
                    }`}
                  >
                    ${perCredit}/credit
                  </span>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-12 text-sm"
                  onClick={handleBuy}
                >
                  buy credits
                </Button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default TopUps;
