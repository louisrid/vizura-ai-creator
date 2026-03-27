import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Membership = () => {
  const { user, loading: authLoading } = useAuth();
  const { refetch } = useCredits();
  const { subscribe } = useSubscription();
  const navigate = useNavigate();
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const handleSubscribe = async () => {
    setBuying(true);
    try {
      const { error } = await supabase.functions.invoke("add-credits", {
        body: { amount: 150 },
      });
      if (error) throw error;
      subscribe("member", 150);
      await refetch();
      toast.success("subscribed!");
      navigate("/account");
    } catch (e: any) {
      toast.error(e.message || "failed to subscribe");
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
        <div className="flex items-center gap-3 mb-10">
          <BackButton />
        </div>
        <PageTitle>membership</PageTitle>

        <div className="border-[4px] border-border rounded-2xl p-6">
          <span className="block text-2xl font-extrabold lowercase text-foreground mb-1">
            $7/first month
          </span>
          <span className="block text-sm font-extrabold lowercase text-foreground/60 mb-6">
            then $20/month
          </span>

          <Button
            className="w-full h-12 text-sm bg-gradient-to-r from-amber-400 to-amber-500 text-foreground hover:from-amber-500 hover:to-amber-600 border-0"
            onClick={handleSubscribe}
            disabled={buying}
          >
            {buying ? <Loader2 className="animate-spin" size={18} /> : "subscribe"}
          </Button>
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
