import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import HeaderTransition from "@/components/HeaderTransition";
import TopGradientBar from "@/components/TopGradientBar";
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
import { fetchAndCacheOnboardingState, needsOnboardingRedirect, readCachedOnboardingState } from "@/lib/onboardingState";
import { getBlockingLoaderCount, getBlockingLoadersEventName, hideStartupSplash } from "@/lib/startupSplash";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import {
  isTransitioning,
  onOverlayOpaque,
  onOverlayTransparent,
  getDurations,
} from "@/lib/pageTransition";

let redirectLock = false;
const acquireRedirectLock = (): boolean => {
  if (redirectLock) return false;
  redirectLock = true;
  setTimeout(() => { redirectLock = false; }, 1000);
  return true;
};

const EXEMPT_ROUTES = ["/auth", "/reset-password", "/help", "/info"];
const POST_AUTH_HOME_KEY = "facefox_post_auth_home";
const ONBOARDING_FLOW_ROUTES = ["/choose-face", "/generate-face"];

const isExemptRoute = (pathname: string) =>
  pathname === "/" || EXEMPT_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/") || pathname.startsWith(r + "?"));

const isOnboardingFlowRoute = (pathname: string) =>
  ONBOARDING_FLOW_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/") || pathname.startsWith(r + "?"));

// ── Redirect helpers (unchanged) ──

const FreshLoadRedirect = () => {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const { user, loading } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (hasRedirected.current || loading) return;
    hasRedirected.current = true;

    const pendingPostAuthHome = sessionStorage.getItem(POST_AUTH_HOME_KEY) === "1";

    const resolveInitialRoute = async () => {
      if (user) {
        if (location.pathname === "/auth") {
          if (acquireRedirectLock()) navigate("/", { replace: true });
        }
        const cachedState = readCachedOnboardingState(user.id);
        if (!cachedState || cachedState.characterCount === 0) {
          void fetchAndCacheOnboardingState(user.id);
        }
        return;
      }

      if (!pendingPostAuthHome && !isExemptRoute(location.pathname)) {
        sessionStorage.removeItem("facefox_auto_opened");
        sessionStorage.removeItem("facefox_creator_dismissed");
        if (acquireRedirectLock()) navigate("/", { replace: true });
        return;
      }
    };

    void resolveInitialRoute();
  }, [loading, location.pathname, navigate, user]);

  return null;
};

const PostAuthHomeRedirect = () => {
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    if (sessionStorage.getItem(POST_AUTH_HOME_KEY) !== "1") return;

    const resumeUrl = sessionStorage.getItem("facefox_resume_url");
    sessionStorage.removeItem(POST_AUTH_HOME_KEY);
    if (resumeUrl) {
      sessionStorage.removeItem("facefox_resume_url");
      if (acquireRedirectLock()) navigate(resumeUrl, { replace: true });
      return;
    }

    if (location.pathname === "/auth") return;

    sessionStorage.removeItem("facefox_auto_opened");
    sessionStorage.removeItem("facefox_creator_dismissed");
    sessionStorage.removeItem("facefox_guided_flow_state");
    sessionStorage.removeItem("facefox_resume_after_auth");
  }, [loading, user, navigate, location.key, location.pathname]);

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

const OnboardingRedirectGate = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const hasRedirected = useRef(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolveRedirect = async () => {
      if (!user || location.pathname === "/" || isExemptRoute(location.pathname) || isOnboardingFlowRoute(location.pathname)) {
        setShouldRedirect(false);
        return;
      }

      const cachedState = readCachedOnboardingState(user.id);
      if (cachedState && !needsOnboardingRedirect(cachedState)) {
        setShouldRedirect(false);
        return;
      }

      const resolvedState = await fetchAndCacheOnboardingState(user.id);
      if (cancelled) return;
      setShouldRedirect(needsOnboardingRedirect(resolvedState));
    };

    void resolveRedirect();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, user?.id]);

  useEffect(() => {
    if (!shouldRedirect || hasRedirected.current) return;
    hasRedirected.current = true;

    if (acquireRedirectLock()) {
      navigate("/", {
        replace: true,
        state: { openCreator: true, onboardingRedirect: true },
      });
    }
  }, [navigate, shouldRedirect]);

  if (!shouldRedirect) return null;

  return <div className="fixed inset-0 z-[9999] bg-nav" />;
};

// ── Page Transition Overlay ──
// A simple black div that fades in/out to cover page swaps.
// z-index: below yellow gradient bar, above everything else.

const PageTransitionOverlay = () => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const safetyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleFadeIn = (e: Event) => {
      const el = overlayRef.current;
      if (!el) return;
      const dur = getDurations().fadeIn;

      el.style.transition = `opacity ${dur}ms ease-in-out`;
      el.style.opacity = "1";

      // Clear any existing safety timer
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

      const onEnd = () => {
        el.removeEventListener("transitionend", onEnd);
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        onOverlayOpaque();
      };
      el.addEventListener("transitionend", onEnd);

      // Safety timeout in case transitionend doesn't fire
      safetyTimerRef.current = window.setTimeout(() => {
        el.removeEventListener("transitionend", onEnd);
        onOverlayOpaque();
      }, dur + 50);
    };

    const handleFadeOut = (e: Event) => {
      const el = overlayRef.current;
      if (!el) return;
      const dur = getDurations().fadeOut;

      el.style.transition = `opacity ${dur}ms ease-in-out`;
      el.style.opacity = "0";

      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

      const onEnd = () => {
        el.removeEventListener("transitionend", onEnd);
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        onOverlayTransparent();
      };
      el.addEventListener("transitionend", onEnd);

      safetyTimerRef.current = window.setTimeout(() => {
        el.removeEventListener("transitionend", onEnd);
        onOverlayTransparent();
      }, dur + 50);
    };

    window.addEventListener("page-transition:fade-in", handleFadeIn);
    window.addEventListener("page-transition:fade-out", handleFadeOut);
    return () => {
      window.removeEventListener("page-transition:fade-in", handleFadeIn);
      window.removeEventListener("page-transition:fade-out", handleFadeOut);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="pointer-events-none fixed inset-0 bg-black"
      style={{ opacity: 0, zIndex: 9980 }}
    />
  );
};

// ── App Routes ──

const AppRoutes = () => {
  const location = useLocation();
  const { loading: authLoading, user } = useAuth();
  const [blockingLoaders, setBlockingLoaders] = useState(() => getBlockingLoaderCount());
  useSwipeNavigation();

  useEffect(() => {
    const eventName = getBlockingLoadersEventName();
    const handleBlockingLoaders = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setBlockingLoaders(typeof customEvent.detail === "number" ? customEvent.detail : getBlockingLoaderCount());
    };

    window.addEventListener(eventName, handleBlockingLoaders as EventListener);
    return () => window.removeEventListener(eventName, handleBlockingLoaders as EventListener);
  }, []);

  const stillResolving =
    authLoading ||
    (!authLoading && !user && !isExemptRoute(location.pathname)) ||
    (!authLoading && !!user && location.pathname === "/auth");

  useEffect(() => {
    if (stillResolving || blockingLoaders > 0) return;
    const frame = requestAnimationFrame(() => hideStartupSplash());
    return () => cancelAnimationFrame(frame);
  }, [stillResolving, blockingLoaders, location.key]);

  return (
    <>
      {/* Yellow gradient bar — highest z-index, always visible */}
      <TopGradientBar />

      {/* Page transition overlay — below yellow bar, above everything else */}
      <PageTransitionOverlay />

      {/* Header + page content — no animation wrapper, overlay handles transitions */}
      <HeaderTransition />
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
    </>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <CreditsProvider>
          <SubscriptionProvider>
            <BrowserRouter>
              <Sonner />
              <PostAuthHomeRedirect />
              <FreshLoadRedirect />
              <ScrollToTop />
              <TopOverscrollGuard />
              <OnboardingRedirectGate />
              <AppRoutes />
            </BrowserRouter>
          </SubscriptionProvider>
        </CreditsProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
