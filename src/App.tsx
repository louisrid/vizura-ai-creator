import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
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
import Info from "./pages/Info";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { incrementNavDepth, resetNavDepth } from "@/lib/navigation";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

const EXEMPT_ROUTES = ["/account", "/auth", "/reset-password", "/characters", "/choose-face", "/admin"];
const POST_AUTH_HOME_KEY = "vizura_post_auth_home";

const isExemptRoute = (pathname: string) =>
  EXEMPT_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "?"));

const FreshLoadRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (hasRedirected.current || loading) return;
    hasRedirected.current = true;

    const pendingPostAuthHome = sessionStorage.getItem(POST_AUTH_HOME_KEY) === "1";

    if (!user && !pendingPostAuthHome && location.pathname !== "/" && !isExemptRoute(location.pathname)) {
      sessionStorage.removeItem("vizura_auto_opened");
      sessionStorage.removeItem("vizura_creator_dismissed");
      navigate("/", { replace: true });
    }

    if (!user && location.pathname === "/" && !pendingPostAuthHome) {
      sessionStorage.removeItem("vizura_auto_opened");
      sessionStorage.removeItem("vizura_creator_dismissed");
    }
  }, [loading, location.pathname, navigate, user]);

  return null;
};

const PostAuthHomeRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    if (sessionStorage.getItem(POST_AUTH_HOME_KEY) !== "1") return;

    sessionStorage.removeItem(POST_AUTH_HOME_KEY);

    const resumeUrl = sessionStorage.getItem("vizura_resume_url");
    if (resumeUrl) {
      sessionStorage.removeItem("vizura_resume_url");
      navigate(resumeUrl, { replace: true });
      return;
    }

    sessionStorage.removeItem("vizura_auto_opened");
    sessionStorage.removeItem("vizura_creator_dismissed");
    sessionStorage.removeItem("vizura_guided_flow_state");
    sessionStorage.removeItem("vizura_resume_after_auth");

    navigate("/", { replace: true, state: {} });
  }, [loading, user, navigate, location.key]);

  return null;
};

const ScrollToTop = () => {
  const location = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      resetNavDepth();
      isFirst.current = false;
    }
    incrementNavDepth();
    const root = document.getElementById("root");
    if (root) root.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.key]);

  return null;
};

const TopOverscrollGuard = () => {
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;

    let startY = 0;

    const getScrollContainer = (target: EventTarget | null) => {
      let element = target instanceof HTMLElement ? target : target instanceof Element ? target as HTMLElement : null;

      while (element && element !== root) {
        const style = window.getComputedStyle(element);
        const canScrollY = /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight;

        if (canScrollY) return element;
        element = element.parentElement;
      }

      return root;
    };

    const onTouchStart = (event: TouchEvent) => {
      startY = event.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY ?? startY;
      const isPullingDown = currentY > startY;
      if (!isPullingDown) return;

      const scrollContainer = getScrollContainer(event.target);
      if (scrollContainer.scrollTop <= 0) {
        event.preventDefault();
      }
    };

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return null;
};

const AppRoutes = () => {
  const location = useLocation();
  const [blackoutActive, setBlackoutActive] = useState(false);
  useSwipeNavigation();

  useEffect(() => {
    const start = () => setBlackoutActive(true);
    const end = () => setBlackoutActive(false);

    window.addEventListener("vizura:blackout:start", start);
    window.addEventListener("vizura:blackout:end", end);

    return () => {
      window.removeEventListener("vizura:blackout:start", start);
      window.removeEventListener("vizura:blackout:end", end);
    };
  }, []);

  return (
    <>
      <motion.div
        className="pointer-events-none fixed inset-0 z-[9998] bg-black"
        initial={false}
        animate={{ opacity: blackoutActive ? 1 : 0 }}
        transition={blackoutActive ? { duration: 0 } : { duration: 0.6, ease: "easeInOut" }}
      />
      <Header />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: blackoutActive ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: blackoutActive ? 1 : 0 }}
          transition={blackoutActive ? { duration: 0 } : { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/generate-face" element={<ChooseFace />} />
            <Route path="/choose-face" element={<ChooseFace />} />
            <Route path="/create" element={<Index />} />
            <Route path="/index" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/characters" element={<MyCharacters />} />
            <Route path="/characters/:id" element={<CharacterDetail />} />
            <Route path="/storage" element={<Storage />} />
            <Route path="/top-ups" element={<TopUps />} />
            <Route path="/account" element={<Account />} />
            <Route path="/help" element={<Help />} />
            <Route path="/history" element={<History />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/info" element={<Info />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
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
              <PostAuthHomeRedirect />
              <FreshLoadRedirect />
              <ScrollToTop />
              <TopOverscrollGuard />
              <AppRoutes />
            </BrowserRouter>
          </SubscriptionProvider>
        </CreditsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
