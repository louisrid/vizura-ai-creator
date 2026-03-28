import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import Header from "@/components/Header";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import { supabase } from "@/integrations/supabase/client";
import CharacterCreator from "./pages/CharacterCreator";
import Home from "./pages/Home";
import ChooseFace from "./pages/ChooseFace";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import MyCharacters from "./pages/MyCharacters";
import Storage from "./pages/Storage";
import Account from "./pages/Account";
import TopUps from "./pages/TopUps";
import Membership from "./pages/Membership";
import { Help } from "./pages/ComingSoon";
import ResetPassword from "./pages/ResetPassword";
import History from "./pages/History";
import NotFound from "./pages/NotFound";
import PageTransition from "./components/PageTransition";

const ScrollToTop = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.key]);
  return null;
};

const AppOnboarding = ({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (loading) return;
    const isOnIntroRoute = location.pathname === "/" || location.pathname === "/index";

    if (!isOnIntroRoute) {
      setShowOnboarding(false);
      onOpenChange(false);
      return;
    }

    // Already dismissed this session
    if (sessionStorage.getItem("onboarding_dismissed")) {
      setShowOnboarding(false);
      onOpenChange(false);
      return;
    }

    if (!user) {
      // Logged-out: show onboarding (refresh clears sessionStorage)
      setShowOnboarding(true);
      onOpenChange(true);
      return;
    }

    // Logged-in: check DB
    const checkOnboarding = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("has_seen_onboarding")
        .eq("user_id", user.id)
        .single();

      const seen = data?.has_seen_onboarding ?? false;
      if (seen) {
        // Already completed — mark session too so we never show again
        sessionStorage.setItem("onboarding_dismissed", "1");
      }
      setShowOnboarding(!seen);
      onOpenChange(!seen);
    };
    checkOnboarding();
  }, [loading, user, location.pathname, onOpenChange]);

  const dismiss = useCallback(async () => {
    setShowOnboarding(false);
    onOpenChange(false);

    // If logged in, persist dismissal in DB
    if (user) {
      await supabase
        .from("profiles")
        .update({ has_seen_onboarding: true })
        .eq("user_id", user.id);
    }
  }, [user, onOpenChange]);

  return (
    <OnboardingOverlay
      open={showOnboarding}
      onDismiss={dismiss}
      onLetsGo={() => {
        dismiss();
        navigate("/create-character");
      }}
    />
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const isHome = location.pathname === "/" || location.pathname === "/index";

  return (
    <>
      <AppOnboarding onOpenChange={setOnboardingOpen} />
      {!onboardingOpen && !isHome && <Header />}
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/create-character" element={<CharacterCreator />} />
          <Route path="/choose-face" element={<ChooseFace />} />
          <Route path="/create" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/characters" element={<MyCharacters />} />
          <Route path="/storage" element={<Storage />} />
          <Route path="/top-ups" element={<TopUps />} />
          <Route path="/account" element={<Account />} />
          <Route path="/account/membership" element={<Membership />} />
          <Route path="/help" element={<Help />} />
          <Route path="/history" element={<History />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
    </>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <CreditsProvider>
          <SubscriptionProvider>
            <BrowserRouter>
              <ScrollToTop />
              <AnimatedRoutes />
            </BrowserRouter>
          </SubscriptionProvider>
        </CreditsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
