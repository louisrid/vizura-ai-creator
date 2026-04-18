import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { motion, AnimatePresence } from "framer-motion";
import { Gem, Camera, LayoutGrid, Settings, LogOut, Home, UserPlus, Archive, User } from "lucide-react";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { checkNavGuard, clearNavGuard } from "@/lib/navGuard";
import { fetchAndCacheOnboardingState, type CachedOnboardingState } from "@/lib/onboardingState";
import TopGradientBar from "@/components/TopGradientBar";

const Header = () => {
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { user, signOut } = useAuth();
  const { gems } = useGems();
  const { subscribed } = useSubscription();
  const [open, setOpen] = useState(false);
  const [touchHighlight, setTouchHighlight] = useState<number | null>(null);
  const [slideMenuMode, setSlideMenuMode] = useState(false);
  const touchActiveRef = useRef(false);

  useEffect(() => {
    const check = () => setSlideMenuMode(document.documentElement.dataset.slideMenuMode === "1");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-slide-menu-mode"] });
    return () => observer.disconnect();
  }, []);

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

  // Onboarding lock state for menu — hide controls whenever onboarding is incomplete
  const isOnboarding = (state: CachedOnboardingState | null | undefined) =>
    !!state && !state.onboardingComplete;

  const [showMenuLocks, setShowMenuLocks] = useState(false);

  useEffect(() => {
    if (!user) { setShowMenuLocks(false); return; }

    let cancelled = false;

    (async () => {
      const resolvedState = await fetchAndCacheOnboardingState(user.id);
      if (cancelled) return;
      setShowMenuLocks(isOnboarding(resolvedState));
    })();

    return () => { cancelled = true; };
  }, [user]);

  // Position dropdown relative to hamburger button
  const updateDropdownPos = useCallback(() => {
    if (!menuBtnRef.current) return;
    const rect = menuBtnRef.current.getBoundingClientRect();
    const isWide = window.innerWidth >= 768;
    const docWidth = document.documentElement.clientWidth;
    setDropdownPos({
      top: rect.bottom + (isWide ? 30 : 20),
      right: docWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    if (open) {
      updateDropdownPos();
      window.addEventListener("resize", updateDropdownPos);
      return () => window.removeEventListener("resize", updateDropdownPos);
    }
  }, [open, updateDropdownPos]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const target = e.target as Node;
      if (menuBtnRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  // Close on route change
  useEffect(() => { setOpen(false); clearNavGuard(); touchActiveRef.current = false; }, [pathname]);

  // Reset touch state whenever the dropdown closes for any reason
  useEffect(() => {
    if (!open) touchActiveRef.current = false;
  }, [open]);

  // Global touch handlers — bridge from menu button to portaled dropdown
  useEffect(() => {
    if (!open) return;

    const handleMove = (e: TouchEvent) => {
      if (!touchActiveRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const items = document.querySelectorAll('[data-menu-idx]');
      let foundIdx: number | null = null;
      items.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom &&
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right
        ) {
          foundIdx = Number(el.getAttribute('data-menu-idx'));
        }
      });
      setTouchHighlight(foundIdx);
    };

    const handleEnd = () => {
      if (!touchActiveRef.current) return;
      touchActiveRef.current = false;
      const idx = touchHighlight;
      if (idx !== null) {
        const item = menuItems[idx];
        if (item) {
          const isLocked = showMenuLocks && lockedLabels.has(item.label);
          if (!isLocked) {
            setOpen(false);
            setTouchHighlight(null);
            if (item.label === "create character") {
              if (pathname === "/") {
                window.dispatchEvent(new CustomEvent("facefox:open-creator"));
              } else {
                navigate("/", { state: { openCreator: true } });
              }
            } else if (item.label === "home" && slideMenuMode) {
              window.dispatchEvent(new CustomEvent("facefox:close-creator"));
            } else if (item.auth && !user) {
              navigate(`/auth?redirect=${encodeURIComponent(item.path)}`);
            } else {
              navigate(item.path);
            }
            return;
          }
        }
      }
      // Released outside any item — keep dropdown open (treat as a press, not a drag)
      setTouchHighlight(null);
    };

    document.addEventListener('touchmove', handleMove, { passive: true });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);
    return () => {
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, touchHighlight, showMenuLocks, user, pathname]);

  const handleNav = (path: string, requiresAuth = false) => {
    setOpen(false);
    if (checkNavGuard()) return;
    if (requiresAuth && !user) {
      navigate(`/auth?redirect=${encodeURIComponent(path)}`);
      return;
    }
    if (path === "/") sessionStorage.removeItem("facefox_internal_nav");
    navigate(path);
  };

  const handleLogoClick = () => {
    if (checkNavGuard()) return;
    handleNav("/");
  };

  const handleLogout = async () => {
    setOpen(false);
    try {
      await signOut();
    } catch {}
    navigate("/");
  };

  // Items that get locked when showMenuLocks is true
  const lockedLabels = new Set(["create character", "storage"]);

  const menuItems = [
    { label: "home", path: "/", icon: Home, auth: false },
    { label: "create character", path: "/", icon: UserPlus, state: { openCreator: true }, auth: false },
    { label: "create photo", path: "/create", icon: Camera, auth: true },
    { label: "my characters", path: "/characters", icon: LayoutGrid, auth: true },
    { label: "storage", path: "/storage", icon: Archive, auth: true },
    { label: "gems", path: "/top-ups", icon: Gem, auth: true },
    { label: "my account", path: "/account", icon: Settings, auth: false },
  ];

  const isLoggedIn = !!user?.id;
  const isAuthPage = pathname === "/auth" || pathname === "/reset-password";
  

  // Detect desktop
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
  const menuWidth = isDesktop ? 355 : 225;

  // Menu dropdown rendered via portal to escape stacking context
  const menuDropdown = dropdownPos ? createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0, ease: "easeInOut" }}
          className="fixed"
          style={{
            top: dropdownPos.top,
            right: dropdownPos.right,
            width: menuWidth,
            zIndex: 10002,
          }}
        >
          <div>
            <div
              className="overflow-hidden py-0"
              style={{
                backgroundColor: "#000000",
                border: "2px solid hsl(0 0% 12%)",
                borderRadius: 10,
                boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
              }}
            >
              {menuItems.map((item, idx) => {
                const isActive = slideMenuMode ? item.label === "create character" : pathname === item.path && !item.state;
                const isFirst = idx === 0;
                const isLast = !user && idx === menuItems.length - 1;
                const borderRadius = isFirst
                  ? "10px 10px 0 0"
                  : isLast
                    ? "0 0 10px 10px"
                    : "0";
                const isLocked = showMenuLocks && lockedLabels.has(item.label);
                return (
                  <div key={item.label}>
                    {idx > 0 && <div style={{ height: 2, backgroundColor: "hsl(0 0% 12%)", margin: "0" }} />}
                    <div className="relative">
                      <button
                        data-menu-idx={idx}
                        onClick={() => {
                          if (isLocked) return;
                          if (checkNavGuard()) { setOpen(false); return; }
                          setOpen(false);
                          if (item.auth && !user) {
                            navigate(`/auth?redirect=${encodeURIComponent(item.path)}`);
                            return;
                          }
                          if (item.label === "create character") {
                            if (pathname === "/") {
                              window.dispatchEvent(new CustomEvent("facefox:open-creator"));
                            } else {
                              navigate("/", { state: { openCreator: true } });
                            }
                          } else if (item.label === "home" && slideMenuMode) {
                            window.dispatchEvent(new CustomEvent("facefox:close-creator"));
                          } else if (item.state) {
                            navigate(item.path, { state: item.state });
                          } else {
                            handleNav(item.path);
                          }
                        }}
                        className="w-full text-left flex items-center gap-2 md:gap-3"
                        style={{
                          padding: isDesktop ? "15px 20px" : "11px 12px",
                          fontSize: isDesktop ? 16 : 13,
                          fontWeight: 700,
                          textTransform: "lowercase",
                          color: isActive ? "#ffe603" : "rgba(255,255,255,0.9)",
                          backgroundColor: touchHighlight === idx ? "hsl(var(--card))" : "transparent",
                          borderRadius,
                        }}
                        onMouseEnter={(e) => { if (!isLocked) e.currentTarget.style.backgroundColor = "hsl(var(--card))"; }}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = touchHighlight === idx ? "hsl(var(--card))" : "transparent")}
                      >
                        <item.icon size={isDesktop ? 19 : 16} strokeWidth={2.5} className="shrink-0" style={{ color: "#ffe603" }} />
                        {item.label}
                      </button>
                      {isLocked && (
                        <div
                          className="absolute pointer-events-auto"
                          style={{ inset: 0, backgroundColor: "rgba(0,0,0,0.80)", borderRadius: isFirst ? "8px 8px 0 0" : isLast ? "0 0 8px 8px" : 0, zIndex: 10 }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
              {user && (
                <>
                  <div style={{ height: 2, backgroundColor: "hsl(0 0% 12%)", margin: "0" }} />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2 md:gap-3"
                    style={{
                      color: "#ff4444",
                      padding: isDesktop ? "15px 20px" : "11px 12px",
                      fontSize: isDesktop ? 16 : 13,
                      fontWeight: 700,
                      textTransform: "lowercase",
                      borderRadius: "0 0 10px 10px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--card))")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <LogOut size={isDesktop ? 18 : 16} strokeWidth={2.5} className="shrink-0" style={{ color: "#ff4444" }} />
                    log out
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  ) : null;

  const slideMenuButton = slideMenuMode ? createPortal(
    <div className="fixed" style={{ zIndex: 10001, top: "calc(max(env(safe-area-inset-top, 0px), 0px) + 45px)", right: 26 }}>
      <button
        ref={menuBtnRef}
        onClick={(e) => { if (touchActiveRef.current) { touchActiveRef.current = false; return; } setOpen(!open); }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          touchActiveRef.current = true;
          setOpen(true);
        }}
        className="flex items-center justify-center w-[42px] h-[42px] md:w-[52px] md:h-[52px]"
        style={{ borderRadius: 10, backgroundColor: "#000", border: "2px solid #ffe603" }}
        aria-label="open menu"
      >
        <svg width="18" height="14" viewBox="0 0 22 16" fill="none" className="md:w-[22px] md:h-[17px]">
          <rect y="0" width="22" height="2.8" rx="1.4" fill="white" />
          <rect y="6.6" width="22" height="2.8" rx="1.4" fill="white" />
          <rect y="13.2" width="22" height="2.8" rx="1.4" fill="white" />
        </svg>
      </button>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <header
        className="relative"
        style={{ zIndex: 9990, backgroundColor: "#000000" }}
      >
        <TopGradientBar />
        {/* Controls */}
        <div className="relative">
          <div className="w-full mx-auto flex items-center justify-between pl-[22px] pr-[26px] md:px-8 lg:px-12 pt-[38px] md:pt-[50px] pb-3">
            <div className="flex items-center gap-2 md:gap-2.5">
              <button onClick={() => { handleLogoClick(); }} className="flex items-center active:opacity-80 transition-opacity duration-150">
                <span className="text-[26px] md:text-[34px] font-[900] lowercase text-white tracking-tight">facefox</span>
              </button>
              {isLoggedIn && (
                <button
                  onClick={() => { navigate("/account"); }}
                  className="flex items-center justify-center shrink-0 active:scale-95 transition-transform duration-150 w-[32px] h-[32px] md:w-[40px] md:h-[40px]"
                  style={{
                    borderRadius: "50%",
                    backgroundColor: "#000000",
                    border: `2px solid ${subscribed ? "hsl(var(--neon-green))" : "hsl(var(--border-mid))"}`,
                  }}
                  aria-label="my account"
                >
                  <User size={16} strokeWidth={3} className="md:!w-[20px] md:!h-[20px]" style={{ color: "#ffffff" }} />
                </button>
              )}
            </div>

            {isLoggedIn && !isAuthPage && (
              <div className="flex items-center gap-3 md:gap-5">
                <div className="relative">
                  <button
                    onClick={() => { if (checkNavGuard()) return; navigate("/top-ups"); }}
                    className="flex items-center gap-1 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2.5 active:scale-95 transition-transform duration-150"
                    style={{
                      backgroundColor: "#050a10",
                      border: "2px solid #00e0ff",
                      borderRadius: 10,
                    }}
                  >
                    <Gem size={13} strokeWidth={2.5} className="md:!w-[17px] md:!h-[17px]" style={{ color: "#00e0ff" }} />
                    <span className="text-[13px] md:text-[16px] font-[900] lowercase text-white">{gems}</span>
                  </button>
                </div>

                <div className="relative">
                  <button
                    ref={menuBtnRef}
                    onClick={(e) => { if (touchActiveRef.current) { touchActiveRef.current = false; return; } setOpen(!open); }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      touchActiveRef.current = true;
                      setOpen(true);
                    }}
                    className="flex items-center justify-center w-[42px] h-[42px] md:w-[52px] md:h-[52px]"
                    style={{
                      borderRadius: 10,
                      backgroundColor: "#000",
                      border: "2px solid #ffe603",
                    }}
                    aria-label="open menu"
                  >
                    <svg width="18" height="14" viewBox="0 0 22 16" fill="none" className="md:w-[22px] md:h-[17px]">
                      <rect y="0" width="22" height="2.8" rx="1.4" fill="white" />
                      <rect y="6.6" width="22" height="2.8" rx="1.4" fill="white" />
                      <rect y="13.2" width="22" height="2.8" rx="1.4" fill="white" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      {menuDropdown}
      {slideMenuButton}
    </>
  );
};

export default Header;
