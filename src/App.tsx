import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AppDataProvider, useAppData } from "@/contexts/AppDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarded } from "@/hooks/useOnboarded";
import HeaderTransition from "@/components/HeaderTransition";
import LoadingScreen from "@/components/LoadingScreen";
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
import { fetchAndCacheOnboardingState, needsOnboardingRedirect, readCachedOnboardingState } from "@/lib/onboardingState";
import { getBlockingLoaderCount, getBlockingLoadersEventName, hideStartupSplash } from "@/lib/startupSplash";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";

const SignOutOverlay = () => {
  const [active, setActive] = useState(() => sessionStorage.getItem("facefox_signing_out") === "1");
  useEffect(() => {
    const onStart = () => setActive(true);
    window.addEventListener("facefox-signing-out", onStart);
    if (active) {
      const t = setTimeout(() => {
        sessionStorage.removeItem("facefox_signing_out");
        setActive(false);
      }, 2500);
      return () => { clearTimeout(t); window.removeEventListener("facefox-signing-out", onStart); };
    }
    return () => window.removeEventListener("facefox-signing-out", onStart);
  }, [active]);
  if (!active) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        backgroundColor: "#000000",
        opacity: 0,
        animation: "facefox-fade-in 400ms ease forwards",
        pointerEvents: "all",
      }}
    />
  );
};

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

const isRenderableImageUrl = (url: string | null | undefined): url is string => {
  if (!url) return false;
  if (url.startsWith("data:image/svg")) return false;
  if (url.includes("imgen.x.ai/xai-imgen/xai-tmp-imgen")) return false;
  if (url.includes("xai-tmp-imgen")) return false;
  return true;
};

const PRELOAD_TIMEOUT_MS = 8000;
const preloadImage = (url: string) => new Promise<void>((resolve) => {
  const img = new Image();
  let settled = false;

  const finish = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    resolve();
  };

  const decodeAndFinish = () => {
    if (typeof img.decode === "function") {
      void img.decode().catch(() => undefined).finally(finish);
      return;
    }
    finish();
  };

  // Hard ceiling per image: one slow/dead URL must not freeze the splash.
  // Images keep loading in the background via the <img> tags after splash hides.
  const timer = window.setTimeout(finish, PRELOAD_TIMEOUT_MS);

  img.onload = decodeAndFinish;
  img.onerror = finish;
  img.src = url;

  if (img.complete) {
    finish();
  }
});

const FreshLoadRedirect = () => {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const { user, loading } = useAuth();
  const hasRedirectedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    // Reset the one-shot guard whenever the auth identity changes (sign-in or sign-out).
    // Previously this only ever fired once per page load, so a sign-out from a
    // non-exempt page never triggered the bounce-to-start and the splash stayed up.
    const currentUserId = user?.id ?? null;
    if (currentUserId !== lastUserIdRef.current) {
      hasRedirectedRef.current = false;
      lastUserIdRef.current = currentUserId;
    }

    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;

    const pendingPostAuthHome = sessionStorage.getItem(POST_AUTH_HOME_KEY) === "1";

    const resolveInitialRoute = async () => {
      if (user) {
        // NOTE: Do NOT auto-redirect away from /auth here. Auth.tsx runs its own
        // onboarding-completion check and either navigates to redirectTo or signs
        // the user out. Redirecting from here races and bypasses that block.
        const cachedState = readCachedOnboardingState(user.id);
        if (!cachedState || cachedState.characterCount === 0) {
          void fetchAndCacheOnboardingState(user.id);
        }
        return;
      }

      const isFreshPageLoad = location.key === "default";
      const shouldBootToStart =
        !pendingPostAuthHome &&
        (!isExemptRoute(location.pathname) || (location.pathname === "/auth" && isFreshPageLoad));
      if (shouldBootToStart) {
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
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Reset the per-path redirect lock when path changes
    hasRedirectedRef.current = false;
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    if (
      location.pathname === "/" ||
      isExemptRoute(location.pathname) ||
      isOnboardingFlowRoute(location.pathname) ||
      location.pathname.startsWith("/characters") ||
      location.pathname === "/account"
    ) {
      return;
    }

    // ONLY redirect if cached state EXPLICITLY says not onboarded.
    // If no cached state exists, do NOT redirect — assume onboarded until proven otherwise.
    const cachedState = readCachedOnboardingState(user.id);
    if (!cachedState) {
      // Background fetch to populate cache for future checks, but never redirect on this pass.
      void fetchAndCacheOnboardingState(user.id);
      return;
    }

    // Cached state present and says onboarded — return immediately, never fetch again here.
    if (!needsOnboardingRedirect(cachedState)) return;

    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;

    if (acquireRedirectLock()) {
      navigate("/", { replace: true });
    }
  }, [location.pathname, user?.id, navigate]);

  return null;
};

const AppRoutes = () => {
  const location = useLocation();
  const { loading: authLoading, user } = useAuth();
  const { characters, generations, charactersReady, generationsReady } = useAppData();
  const [blockingLoaders, setBlockingLoaders] = useState(() => getBlockingLoaderCount());
  
  const [criticalImagesReady, setCriticalImagesReady] = useState(false);
  const splashHiddenRef = useRef(false);
  useEffect(() => {
    const eventName = getBlockingLoadersEventName();
    const handleBlockingLoaders = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setBlockingLoaders(typeof customEvent.detail === "number" ? customEvent.detail : getBlockingLoaderCount());
    };

    window.addEventListener(eventName, handleBlockingLoaders as EventListener);
    return () => window.removeEventListener(eventName, handleBlockingLoaders as EventListener);
  }, []);

  const hasCachedUser = typeof window !== "undefined" && !!localStorage.getItem("facefox_cached_user");
  const { resolved: onboardingResolved } = useOnboarded();
  const isStaticOrAuthRoute =
    location.pathname === "/auth" ||
    location.pathname === "/reset-password" ||
    location.pathname === "/help" ||
    location.pathname === "/info" ||
    location.pathname.startsWith("/reset-password/") ||
    location.pathname.startsWith("/help/") ||
    location.pathname.startsWith("/info/");
  const hasUserContext = !!user || hasCachedUser;
  const path = location.pathname;
  const needsGenerations = path === "/" || path === "/storage" || path === "/history";
  const needsCharacters = !isStaticOrAuthRoute;
  const criticalImageUrls = useMemo(() => {
    if (!hasUserContext || isStaticOrAuthRoute) return [];

    const urls = new Set<string>();
    const pushUrl = (url: string | null | undefined) => {
      if (isRenderableImageUrl(url)) urls.add(url);
    };
    const routeState = (location.state as { openCreator?: boolean; preselectedCharacterId?: string } | null) ?? null;
    const openingCreator = !!routeState?.openCreator;
    const preferredCharacterId = routeState?.preselectedCharacterId || (typeof window !== "undefined" ? sessionStorage.getItem("facefox_last_selected_character_id") ?? "" : "");

    if (path === "/") {
      // When opening the creator overlay, Home content is covered — skip preloading its images.
      if (openingCreator) return [];

        generations
          .flatMap((generation) => (generation.image_urls ?? []).filter(isRenderableImageUrl).slice(0, 1))
          .slice(0, 4)
          .forEach(pushUrl);

      characters
        .filter((character) => character.face_image_url && character.face_angle_url && character.body_anchor_url)
          .slice(0, 4)
        .forEach((character) => pushUrl(character.face_image_url));

      return Array.from(urls);
    }

    if (path === "/characters") {
      characters
        .filter((character) => character.face_image_url && character.face_angle_url && character.body_anchor_url)
        .slice(0, 6)
        .forEach((character) => pushUrl(character.face_image_url));

      return Array.from(urls);
    }

    if (path.startsWith("/characters/")) {
      const characterId = path.split("/")[2] ?? "";
      const activeCharacter = characters.find((character) => character.id === characterId);
      pushUrl(activeCharacter?.face_image_url);
      pushUrl(activeCharacter?.face_angle_url);
      pushUrl(activeCharacter?.body_anchor_url);
      return Array.from(urls);
    }

    if (path === "/storage" || path === "/history") {
      generations
        .flatMap((generation) => (generation.image_urls ?? []).filter(isRenderableImageUrl))
        .slice(0, 6)
        .forEach(pushUrl);

      return Array.from(urls);
    }

    if (path === "/create" || path === "/index") {
      const preferredCharacter = characters.find((character) => character.id === preferredCharacterId)
        ?? characters.find((character) => !!character.face_image_url);
      pushUrl(preferredCharacter?.face_image_url);

      return Array.from(urls);
    }

    return [];
  }, [characters, generations, isStaticOrAuthRoute, location.pathname, location.state, hasUserContext]);

  const preloadedUrlsRef = useRef<Set<string>>(new Set());
  const [dataLoadGracePassed, setDataLoadGracePassed] = useState(false);
  useEffect(() => {
    setDataLoadGracePassed(false);
  }, [location.pathname, location.key]);

  // Preload critical images so the page looks ready when the splash hides.
  // Key design: never cancel in-flight preloads. Preloading is side-effect-free
  // (just warms browser cache), so letting old preloads finish is harmless and
  // avoids the race where cancellation leaves criticalImagesReady stuck false.
  useEffect(() => {
    if (!hasUserContext && !authLoading) {
      setCriticalImagesReady(true);
      return;
    }
    if (!hasUserContext) return;
    if (isStaticOrAuthRoute) {
      setCriticalImagesReady(true);
      return;
    }
    const dataReady = (!needsCharacters || charactersReady) && (!needsGenerations || generationsReady);
    if (!dataReady) return;
    if (criticalImageUrls.length === 0) {
      // Only flip ready if there truly are no images to show.
      // If ready flags are true but arrays are empty, data is still populating
      // from cache — URLs will appear on the next render. Don't flip ready.
      const dataExpected = (needsCharacters && charactersReady) || (needsGenerations && generationsReady);
      const hasData = characters.length > 0 || generations.length > 0;
      if (!dataExpected || hasData) {
        setCriticalImagesReady(true);
      }
      return;
    }
    // Mark URLs as "in progress" immediately so re-runs don't start duplicate preloads.
    const newUrls = criticalImageUrls.filter((url) => !preloadedUrlsRef.current.has(url));
    if (newUrls.length === 0) {
      setCriticalImagesReady(true);
      return;
    }
    // Add to ref NOW, before the async work. This prevents re-runs from
    // seeing these same URLs as "new" and starting duplicate batches.
    setCriticalImagesReady(false);
    newUrls.forEach((url) => preloadedUrlsRef.current.add(url));
    // Preload all images. When done, flip ready. No ref comparison needed
    // because each URL is only preloaded once (guarded by preloadedUrlsRef).
    void Promise.all(newUrls.map(preloadImage)).then(() => {
      setCriticalImagesReady(true);
    });
  }, [authLoading, hasUserContext, criticalImageUrls, isStaticOrAuthRoute, charactersReady, generationsReady, needsCharacters, needsGenerations, characters, generations]);

  useEffect(() => {
    const timer = setTimeout(() => setDataLoadGracePassed(true), 4500);
    return () => clearTimeout(timer);
  }, [location.pathname, location.key]);
  // Per-route data needs: only block on the data the current page actually renders.
  // Avoids long splashes on pages like /create or /index that don't need generations.
  const dataStillLoading =
    !dataLoadGracePassed &&
    hasUserContext &&
    !isStaticOrAuthRoute &&
    ((needsCharacters && !charactersReady) || (needsGenerations && !generationsReady));
  const onboardingStillLoading = !!user && !isStaticOrAuthRoute && !onboardingResolved;
  const stillResolving =
    authLoading ||
    (!authLoading && !!user && location.pathname === "/auth") ||
    dataStillLoading ||
    onboardingStillLoading ||
    blockingLoaders > 0;
  const suppressUnauthRoutes =
    hasCachedUser && authLoading && !user &&
    (location.pathname === "/" || location.pathname === "/auth");

  useEffect(() => {
    if (stillResolving) return;
    const timer = setTimeout(() => {
      splashHiddenRef.current = true;
      hideStartupSplash();
    }, 300);
    return () => clearTimeout(timer);
  }, [stillResolving, blockingLoaders, location.key]);

  return (
    <div style={{ overscrollBehavior: "none" }}>
      <SignOutOverlay />
      {(stillResolving || suppressUnauthRoutes) && <LoadingScreen />}
      {!suppressUnauthRoutes && (
        <>
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
      )}
    </div>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <CreditsProvider>
          <SubscriptionProvider>
            <AppDataProvider>
              <BrowserRouter>
                <Sonner />
                <PostAuthHomeRedirect />
                <FreshLoadRedirect />
                <ScrollToTop />
                <TopOverscrollGuard />
                <OnboardingRedirectGate />
                <AppRoutes />
              </BrowserRouter>
            </AppDataProvider>
          </SubscriptionProvider>
        </CreditsProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;