import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import SubscribeOverlay from "@/components/SubscribeOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Membership = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [buying, setBuying] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
  }, [user, authLoading, navigate, location.pathname]);

  if (!authLoading && !user) return null;

  const handleSubscribe = async () => {
    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { type: "membership" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast.error(e.message || "failed to start checkout");
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

        <div className="border-[5px] border-border rounded-2xl p-6">
          <span className="block text-2xl font-extrabold lowercase text-foreground mb-1">
            $7/first month
          </span>
          <span className="block text-sm font-extrabold lowercase text-foreground/60 mb-6">
            then $20/month
          </span>

          <button
            onClick={() => setOverlayOpen(true)}
            className="w-full h-14 rounded-2xl text-sm font-extrabold lowercase bg-gradient-to-r from-amber-400 to-amber-500 text-foreground hover:from-amber-500 hover:to-amber-600 transition-all"
          >
            subscribe
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/top-ups")}
            className="text-xs font-extrabold lowercase text-foreground/60 underline underline-offset-4 hover:text-foreground transition-colors"
          >
            or buy credits
          </button>
        </div>
      </main>

      <SubscribeOverlay
        open={overlayOpen}
        onDismiss={() => setOverlayOpen(false)}
        onSubscribe={handleSubscribe}
        buying={buying}
      />
    </div>
  );
};

export default Membership;
