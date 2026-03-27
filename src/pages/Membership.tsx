import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const plans = [
  {
    name: "starter",
    price: 7,
    credits: 150,
    features: ["150 credits", "3 character creates", "~20 photos", "cancel anytime"],
  },
  {
    name: "pro",
    price: 20,
    credits: 600,
    features: ["600 credits", "3-4 character creates", "80+ photos", "best value"],
    highlighted: true,
  },
];

const Membership = () => {
  const { user, loading: authLoading } = useAuth();
  const { refetch } = useCredits();
  const { subscribe } = useSubscription();
  const navigate = useNavigate();
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const handleSubscribe = async (plan: typeof plans[number]) => {
    setBuying(plan.name);
    try {
      // Mock: add credits via edge function
      const { error } = await supabase.functions.invoke("add-credits", {
        body: { amount: plan.credits },
      });
      if (error) throw error;
      subscribe(plan.name, plan.credits);
      await refetch();
      toast.success(`subscribed to ${plan.name}!`);
      navigate("/account");
    } catch (e: any) {
      toast.error(e.message || "failed to subscribe");
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
        <div className="flex items-center gap-3 mb-10">
          <BackButton />
        </div>
        <PageTitle>membership</PageTitle>

        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="border-[4px] border-border rounded-2xl p-5"
            >
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-2xl font-extrabold lowercase text-foreground">
                  ${plan.price}/month
                </span>
                <span className="text-xs font-extrabold lowercase text-foreground">
                  {plan.name}
                </span>
              </div>

              <div className="space-y-1.5 mb-5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <Check size={14} strokeWidth={3} className="text-foreground shrink-0" />
                    <span className="text-xs font-extrabold lowercase text-foreground">{f}</span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full h-12 text-sm bg-gradient-to-r from-amber-400 to-amber-500 text-foreground hover:from-amber-500 hover:to-amber-600 border-0"
                onClick={() => handleSubscribe(plan)}
                disabled={buying !== null}
              >
                {buying === plan.name ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  "subscribe"
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/top-ups")}
            className="text-xs font-extrabold lowercase text-foreground/60 underline underline-offset-4"
          >
            or buy credits
          </button>
        </div>
      </main>
    </div>
  );
};

export default Membership;
