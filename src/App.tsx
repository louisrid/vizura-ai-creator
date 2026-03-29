import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import Header from "@/components/Header";
import CharacterCreator from "./pages/CharacterCreator";

import ChooseFace from "./pages/ChooseFace";
import Index from "./pages/Index";

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
    const root = document.getElementById("root");
    if (root) root.scrollTop = 0;
  }, [location.pathname, location.key]);
  return null;
};

/* Clear intro flag synchronously before any component renders */
sessionStorage.removeItem("intro_seen");

const RedirectHomeOnLoad = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if (window.location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  }, []);
  return null;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <>
      <Header />
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<CharacterCreator />} />
          <Route path="/generate-face" element={<ChooseFace />} />
          <Route path="/choose-face" element={<ChooseFace />} />
          <Route path="/create" element={<Index />} />
          <Route path="/index" element={<Index />} />
          <Route path="/auth" element={<Account />} />
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
              <RedirectHomeOnLoad />
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
