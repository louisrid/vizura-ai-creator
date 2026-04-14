import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Gem, Camera, LayoutGrid, Settings, LogOut, Home, UserPlus, Archive, User } from "lucide-react";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import TopGradientBar from "@/components/TopGradientBar";
import { checkNavGuard } from "@/lib/navGuard";
import { supabase } from "@/integrations/supabase/client";
import { fetchAndCacheOnboardingState, needsOnboardingRedirect, readCachedOnboardingState, type CachedOnboardingState } from "@/lib/onboardingState";

/** Hook: returns 0→1 opacity based on scroll position (0 at top, 1 after 60px) */
function useScrollGradientOpacity() {
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;
    const onScroll = () => {
      const y = root.scrollTop;
      setOpacity(Math.min(y / 60, 1));
    };
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, []);
  return opacity;
}

const Header = () => {
  const gradientOpacity = useScrollGradientOpacity();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signOut } = useAuth();
  const { gems } = useGems();
  const { subscribed } = useSubscription();
  const [open, setOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

  // Onboarding lock state for menu — hide controls whenever onboarding is incomplete
  const isOnboarding = (state: CachedOnboardingState | null | undefined) =>
    !!state && !state.onboardingComplete;

  const [showMenuLocks, setShowMenuLocks] = useState(() => isOnboarding(readCachedOnboardingState(user?.id)));

  useEffect(() => {
    if (!user) { setShowMenuLocks(false); return; }

    const cachedState = readCachedOnboardingState(user.id);
    if (cachedState) {
      setShowMenuLocks(isOnboarding(cachedState));
    }

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
      top: rect.bottom + (isWide ? 24 : 14),
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
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuBtnRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

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
    if (checkNavGuard()) { setOpen(false); return; }
    setOpen(false);
    await signOut();
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
  const isAuthPage = location.pathname === "/auth" || location.pathname === "/reset-password";
  const hideOnboardingFaceFlowActions = location.pathname === "/choose-face" && showMenuLocks;

  // Detect desktop
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
  const menuWidth = isDesktop ? 340 : 190;

  // Menu dropdown rendered via portal to escape stacking context
  const menuDropdown = dropdownPos ? createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed"
          style={{
            top: dropdownPos.top,
            right: dropdownPos.right,
            width: menuWidth,
            zIndex: 99999,
          }}
        >
          <div>
            <div
              className="overflow-hidden py-0"
              style={{
                backgroundColor: "#000000",
                border: "2px solid hsl(var(--border-mid))",
                borderRadius: 10,
                boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
              }}
            >
              {menuItems.map((item, idx) => {
                const isActive = location.pathname === item.path && !item.state;
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
                    {idx > 0 && <div style={{ height: 2, backgroundColor: "hsl(var(--border-mid))", margin: "0" }} />}
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (isLocked) return;
                          if (checkNavGuard()) { setOpen(false); return; }
                          setOpen(false);
                          if (item.auth && !user) {
                            navigate(`/auth?redirect=${encodeURIComponent(item.path)}`);
                            return;
                          }
                          if (item.state) {
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
                          backgroundColor: "transparent",
                          borderRadius,
                        }}
                        onMouseEnter={(e) => { if (!isLocked) e.currentTarget.style.backgroundColor = "hsl(var(--card))"; }}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
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
                  <div style={{ height: 2, backgroundColor: "hsl(var(--border-mid))", margin: "0" }} />
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

  return (
    <>
      {/* Spacer that reserves header height in document flow */}
      <div className="h-[80px] md:h-[90px]" aria-hidden="true" />
      <header
        className="fixed top-0 left-0 right-0"
        style={{ zIndex: 9990 }}
      >
        <TopGradientBar />
        {/* Full header gradient — smooth multi-stop fade */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 transition-opacity duration-200"
          style={{
            height: 120,
            opacity: gradientOpacity,
            background: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0.96) 40%, rgba(0,0,0,0.77) 60%, rgba(0,0,0,0.47) 75%, rgba(0,0,0,0.24) 88%, transparent 100%)",
          }}
        />
        {/* Controls on top of gradient */}
        <div className="relative">
          <div className="w-full mx-auto flex items-center justify-between px-[14px] md:px-8 lg:px-12 pt-7 md:pt-9 pb-3">
            <div className="flex items-center gap-2 md:gap-2.5">
              <button onClick={handleLogoClick} className="flex items-center active:opacity-80 transition-opacity duration-150">
                <span className="text-[26px] md:text-[34px] font-[900] lowercase text-white tracking-tight">facefox</span>
              </button>
              {isLoggedIn && (
                <button
                  onClick={() => navigate("/account")}
                  className="flex items-center justify-center shrink-0 active:scale-95 transition-transform duration-150 w-[32px] h-[32px] md:w-[40px] md:h-[40px]"
                  style={{
                    borderRadius: "50%",
                    backgroundColor: "#000000",
                    border: `2px solid ${subscribed ? "hsl(130, 85%, 49%)" : "hsl(var(--border-mid))"}`,
                  }}
                  aria-label="my account"
                >
                  <User size={16} strokeWidth={3} className="md:!w-[20px] md:!h-[20px]" style={{ color: "#ffffff" }} />
                </button>
              )}
            </div>

            {!isAuthPage && !hideOnboardingFaceFlowActions && (
              <div className="flex items-center gap-3 md:gap-5">
                <button
                  onClick={() => navigate("/top-ups")}
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

                <button
                  ref={menuBtnRef}
                  onClick={() => setOpen(!open)}
                  className="flex items-center justify-center active:scale-95 transition-transform duration-150 w-[42px] h-[42px] md:w-[52px] md:h-[52px]"
                  style={{
                    borderRadius: 10,
                    backgroundColor: "#000",
                    border: "2px solid hsl(var(--border-mid))",
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
            )}
          </div>
        </div>
      </header>
      {menuDropdown}
    </>
  );
};

export default Header;
