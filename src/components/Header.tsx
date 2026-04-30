import { useState, useRef, useEffect, useCallback, forwardRef, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { motion, AnimatePresence } from "framer-motion";
import { Gem, Camera, LayoutGrid, Settings, Home, UserPlus, Archive, User } from "lucide-react";
import foxEmojiImg from "@/assets/fox-emoji.png";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useOnboarded } from "@/hooks/useOnboarded";
import { checkNavGuard, clearNavGuard } from "@/lib/navGuard";
import TopGradientBar from "@/components/TopGradientBar";

type MenuButtonProps = {
  menuDisabled: boolean;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  wasOpenAtStartRef: MutableRefObject<boolean>;
  onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerEnd: (e: React.PointerEvent<HTMLButtonElement>) => void;
};

const MenuButton = forwardRef<HTMLButtonElement, MenuButtonProps>(({ menuDisabled, open, setOpen, wasOpenAtStartRef, onPointerMove, onPointerEnd }, ref) => (
  <button
    ref={ref}
    onPointerDown={(e) => {
      if (menuDisabled) return;
      // Capture the pointer so move/up fire on this button even when the finger moves onto a menu item.
      // Only primary button/touch (e.button === 0 for mouse; always 0 for touch).
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      wasOpenAtStartRef.current = open;
      if (!open) {
        document.body.style.overflow = "hidden";
        setOpen(true);
      }
    }}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerEnd}
    onPointerCancel={onPointerEnd}
    disabled={menuDisabled}
    className="flex items-center justify-center w-[34px] h-[34px] md:w-[46px] md:h-[46px]"
    style={{
      borderRadius: 2,
      backgroundColor: menuDisabled ? "hsl(0 0% 8%)" : "#000000",
      border: `2px solid ${menuDisabled ? "hsl(0 0% 18%)" : "#727272"}`,
      opacity: menuDisabled ? 0.45 : 1,
      pointerEvents: menuDisabled ? "none" : "auto",
      touchAction: "none",
    }}
    aria-label="open menu"
    aria-disabled={menuDisabled}
  >
    <svg width="16" height="13" viewBox="0 0 22 16" fill="none" className="md:w-[20px] md:h-[15px]">
      <rect y="0" width="22" height="2.8" rx="1.4" fill="white" />
      <rect y="6.6" width="22" height="2.8" rx="1.4" fill="white" />
      <rect y="13.2" width="22" height="2.8" rx="1.4" fill="white" />
    </svg>
  </button>
));
MenuButton.displayName = "MenuButton";

const Header = () => {
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { user } = useAuth();
  const { gems } = useGems();
  const { subscribed } = useSubscription();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [slideMenuMode, setSlideMenuMode] = useState(false);
  const wasOpenAtStartRef = useRef(false);

  useEffect(() => {
    const check = () => setSlideMenuMode(document.documentElement.dataset.slideMenuMode === "1");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-slide-menu-mode"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!slideMenuMode) {
      setOpen(false);
    }
  }, [slideMenuMode]);

  useEffect(() => {
    const handler = () => {
      setOpen(false);
      setHighlight(null);
    };
    window.addEventListener("facefox:close-creator", handler);
    return () => window.removeEventListener("facefox:close-creator", handler);
  }, []);

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

  // Onboarding lock state for menu — uses shared hook that reads cache synchronously on mount
  const { onboardingComplete } = useOnboarded();
  const showMenuLocks = !!user && !onboardingComplete;

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
      document.body.style.overflow = "hidden";
      updateDropdownPos();
      window.addEventListener("resize", updateDropdownPos);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("resize", updateDropdownPos);
      };
    } else {
      document.body.style.overflow = "";
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
  useEffect(() => { setOpen(false); clearNavGuard(); setHighlight(null); document.body.style.overflow = ""; }, [pathname]);

  // Shared navigation function — one source of truth for both pointer-up (slide gesture) and item onClick (tap).
  const handleItemSelect = (idx: number) => {
    const item = menuItems[idx];
    if (!item) return;
    setOpen(false);
    setHighlight(null);
    document.body.style.overflow = "";
    if (checkNavGuard()) return;
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
      return;
    }
    if (item.label === "home" && slideMenuMode) {
      window.dispatchEvent(new CustomEvent("facefox:close-creator"));
      return;
    }
    if (item.state) {
      navigate(item.path, { state: item.state });
      return;
    }
    navigate(item.path);
  };

  // Pointer move handler — hit-tests against menu items and updates highlight. Fires on the button
  // throughout the gesture thanks to pointer capture set in onPointerDown.
  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!open) return;
    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    const itemEl = elUnder ? (elUnder as Element).closest('[data-menu-idx]') as HTMLElement | null : null;
    setHighlight(itemEl ? Number(itemEl.getAttribute('data-menu-idx')) : null);
  };

  // Pointer up/cancel handler — decides what the gesture meant based on where the pointer was released.
  const handlePointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    if (btn.hasPointerCapture(e.pointerId)) btn.releasePointerCapture(e.pointerId);
    // pointercancel (e.g. browser scroll override) — treat as no-op, leave menu open
    if (e.type === "pointercancel") {
      setHighlight(null);
      return;
    }
    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    const itemEl = elUnder ? (elUnder as Element).closest('[data-menu-idx]') as HTMLElement | null : null;
    if (itemEl) {
      const idx = Number(itemEl.getAttribute('data-menu-idx'));
      handleItemSelect(idx);
      return;
    }
    const releasedOnButton = !!elUnder && btn.contains(elUnder as Node);
    if (releasedOnButton) {
      // Tap on button — toggle based on what state menu was in BEFORE this gesture.
      // wasOpenAtStartRef is the open-state snapshot taken in onPointerDown.
      if (wasOpenAtStartRef.current) {
        // Menu was open, user tapped button to close it
        setOpen(false);
        setHighlight(null);
        document.body.style.overflow = "";
      }
      // else: menu was closed, onPointerDown already opened it — leave open
      return;
    }
    // Released outside button and outside any item — close menu
    setOpen(false);
    setHighlight(null);
    document.body.style.overflow = "";
  };

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

  const menuDisabled = showMenuLocks;

  const menuItems = [
    { label: "home", path: "/", icon: Home, auth: false },
    { label: "buy gems", path: "/top-ups", icon: Gem, auth: true },
    { label: "create character", path: "/", icon: UserPlus, state: { openCreator: true }, auth: false },
    { label: "create photo", path: "/create", icon: Camera, auth: true },
    { label: "my characters", path: "/characters", icon: LayoutGrid, auth: true },
    { label: "my storage", path: "/storage", icon: Archive, auth: true },
    { label: "settings", path: "/account", icon: Settings, auth: false },
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
                border: "2px solid hsl(0 0% 15%)",
                borderRadius: 2,
                boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
              }}
            >
              {menuItems.map((item, idx) => {
                const isActive = slideMenuMode ? item.label === "create character" : pathname === item.path && !item.state;
                const isFirst = idx === 0;
                const isLast = !user && idx === menuItems.length - 1;
                const borderRadius = isFirst
                  ? "2px 2px 0 0"
                  : isLast
                    ? "0 0 2px 2px"
                    : "0";
                return (
                  <div key={item.label}>
                    {idx > 0 && <div style={{ height: 2, backgroundColor: "hsl(0 0% 15%)", margin: "0" }} />}
                    <div className="relative">
                      <button
                        data-menu-idx={idx}
                        onClick={() => handleItemSelect(idx)}
                        className="w-full text-left flex items-center gap-2 md:gap-3"
                        style={{
                          padding: isDesktop ? "15px 20px" : "11px 12px",
                          fontSize: isDesktop ? 16 : 13,
                          fontWeight: 700,
                          textTransform: "lowercase",
                          color: isActive ? "#727272" : "rgba(255,255,255,0.9)",
                          backgroundColor: highlight === idx ? "hsl(var(--border-mid))" : "transparent",
                          borderRadius,
                          touchAction: "none",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "hsl(var(--border-mid))"; }}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = highlight === idx ? "hsl(var(--border-mid))" : "transparent")}
                      >
                        <item.icon size={isDesktop ? 19 : 16} strokeWidth={2.5} className="shrink-0" style={{ color: "#727272" }} />
                        {item.label}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  ) : null;

  const showFixedMenuButton = isLoggedIn && !isAuthPage && (slideMenuMode || !menuDisabled);
  const fixedMenuButton = showFixedMenuButton ? createPortal(
    <div className="fixed" style={{ zIndex: 10001, top: "calc(max(env(safe-area-inset-top, 0px), 0px) + 45px)", right: 26 }}>
      <MenuButton ref={menuBtnRef} menuDisabled={menuDisabled} open={open} setOpen={setOpen} wasOpenAtStartRef={wasOpenAtStartRef} onPointerMove={handlePointerMove} onPointerEnd={handlePointerEnd} />
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
          <div className="w-full mx-auto flex items-center justify-between pl-[22px] pr-[18px] md:px-8 lg:px-12 pt-[38px] md:pt-[50px] pb-3">
            <div className="flex items-center gap-2 md:gap-2.5">
              <button onClick={() => { handleLogoClick(); }} className="inline-flex items-center gap-1.5 md:gap-2 transition-opacity duration-150 leading-none">
                <img src={foxEmojiImg} alt="" className="h-[32px] md:h-[40px] w-auto select-none block shrink-0 align-middle" draggable={false} style={{ verticalAlign: "middle" }} />
                <span className="text-[25px] md:text-[32px] font-[900] text-white tracking-tight inline-flex items-center" style={{ lineHeight: 1 }}>facebox</span>
              </button>
              {/* {isLoggedIn && (
                <button
                  onClick={() => { navigate("/account"); }}
                  className="flex items-center justify-center shrink-0 transition-transform duration-150 w-[32px] h-[32px] md:w-[40px] md:h-[40px]"
                  style={{
                    borderRadius: "50%",
                    backgroundColor: "#000000",
                    border: `2px solid ${subscribed ? "hsl(var(--neon-green))" : "hsl(var(--border-mid))"}`,
                  }}
                  aria-label="my account"
                >
                  <User size={16} strokeWidth={3} className="md:!w-[20px] md:!h-[20px]" style={{ color: "#ffffff" }} />
                </button>
              )} */}
            </div>

            {isLoggedIn && !isAuthPage && !slideMenuMode && (
              <div className="flex items-center gap-3 md:gap-5">
                <div className="relative">
                  <div
                    className="flex items-center gap-1 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2.5 select-none"
                    style={{
                      backgroundColor: "#050a10",
                      border: "2px solid #00e0ff",
                      borderRadius: 2,
                    }}
                    aria-label="gem balance"
                  >
                    <Gem size={13} strokeWidth={2.5} className="md:!w-[17px] md:!h-[17px]" style={{ color: "#00e0ff" }} />
                    <span className="text-[13px] md:text-[16px] font-[900] lowercase text-white">{gems}</span>
                  </div>
                </div>

                {/* Spacer to reserve room for the fixed menu button so the gem counter doesn't sit underneath it */}
                <div aria-hidden className="w-[32px] h-[32px] md:w-[46px] md:h-[46px]" />
              </div>
            )}
          </div>
        </div>
      </header>
      {menuDropdown}
      {fixedMenuButton}
    </>
  );
};

export default Header;
