import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import Header from "@/components/Header";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import CharacterCreator from "./pages/CharacterCreator";
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
    const dismissed = sessionStorage.getItem("onboarding_dismissed");
    const shouldShow = isOnIntroRoute && !dismissed;
    setShowOnboarding(shouldShow);
    onOpenChange(shouldShow);
  }, [loading, location.pathname, onOpenChange]);

  const dismiss = () => {
    sessionStorage.setItem("onboarding_dismissed", "1");
    setShowOnboarding(false);
    onOpenChange(false);
  };

  return (
    <OnboardingOverlay
      open={showOnboarding}
      onDismiss={dismiss}
      onLetsGo={() => {
        dismiss();
        navigate("/");
      }}
    />
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  return (
    <>
      <AppOnboarding onOpenChange={setOnboardingOpen} />
      {!onboardingOpen && <Header />}
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<CharacterCreator />} />
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
