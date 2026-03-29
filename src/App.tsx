import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import Header from "@/components/Header";
import IntroSequence from "@/components/IntroSequence";
import CharacterCreator from "./pages/CharacterCreator";
import CharacterDetail from "./pages/CharacterDetail";

import ChooseFace from "./pages/ChooseFace";
import Index from "./pages/Index";

import MyCharacters from "./pages/MyCharacters";
import Storage from "./pages/Storage";
import Account from "./pages/Account";
import TopUps from "./pages/TopUps";
import { Help } from "./pages/ComingSoon";
import ResetPassword from "./pages/ResetPassword";
import History from "./pages/History";
import NotFound from "./pages/NotFound";
import PageTransition from "./components/PageTransition";
import { incrementNavDepth, resetNavDepth } from "@/lib/navigation";

const INTRO_SEEN_KEY = "vizura_intro_seen";

const ScrollToTop = () => {
  const location = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      // First render after mount — reset depth (fresh session via redirect)
      resetNavDepth();
      isFirst.current = false;
    }
    incrementNavDepth();

    window.scrollTo({ top: 0, left: 0 });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const root = document.getElementById("root");
    if (root) root.scrollTop = 0;
  }, [location.pathname, location.key]);
  return null;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Intro is "seen" if sessionStorage flag is set (survives navigation, resets on tab close/refresh)
  const [introSeen, setIntroSeen] = useState(() => {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
  });
  const [redirectedHome, setRedirectedHome] = useState(false);

  // On first mount, redirect to "/" so the app always starts on the homepage
  useEffect(() => {
    if (location.pathname !== "/") {
      navigate("/", { replace: true });
    }
    setRedirectedHome(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIntroComplete = useCallback(() => {
    setIntroSeen(true);
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  }, []);

  // Show nothing only until the redirect effect has run (single tick)
  if (!redirectedHome) return null;

  return (
    <>
      <IntroSequence open={!introSeen} onComplete={handleIntroComplete} />
      <Header />
      <AnimatePresence mode="wait">
        <PageTransition key={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<CharacterCreator />} />
            <Route path="/generate-face" element={<ChooseFace />} />
            <Route path="/choose-face" element={<ChooseFace />} />
            <Route path="/create" element={<Index />} />
            <Route path="/index" element={<Index />} />
            <Route path="/auth" element={<Account />} />
            <Route path="/characters" element={<MyCharacters />} />
            <Route path="/characters/:id" element={<CharacterDetail />} />
            <Route path="/storage" element={<Storage />} />
            <Route path="/top-ups" element={<TopUps />} />
            <Route path="/account" element={<Account />} />
            <Route path="/help" element={<Help />} />
            <Route path="/history" element={<History />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </AnimatePresence>
    </>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CreditsProvider>
          <SubscriptionProvider>
            <BrowserRouter>
              <Sonner />
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
