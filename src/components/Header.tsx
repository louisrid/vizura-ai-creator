import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Gem, Camera, LayoutGrid, Settings, LogOut, X, Home, UserPlus, Archive, User } from "lucide-react";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import TopGradientBar from "@/components/TopGradientBar";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signOut } = useAuth();
  const { gems } = useGems();
  const { subscribed } = useSubscription();
  const [open, setOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

  // Position dropdown relative to hamburger button
  const updateDropdownPos = useCallback(() => {
    if (!menuBtnRef.current) return;
    const rect = menuBtnRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
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
    if (requiresAuth && !user) {
      navigate(`/auth?redirect=${encodeURIComponent(path)}`);
      return;
    }
    if (path === "/") sessionStorage.removeItem("vizura_internal_nav");
    navigate(path);
  };

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    navigate("/");
  };

  const menuItems = [
    { label: "home", path: "/", icon: Home, auth: false },
    { label: "create character", path: "/", icon: UserPlus, state: { openCreator: true }, auth: false },
    { label: "create photo", path: "/create", icon: Camera, auth: true },
    { label: "my characters", path: "/characters", icon: LayoutGrid, auth: true },
    { label: "storage", path: "/storage", icon: Archive, auth: true },
    { label: "gems", path: "/top-ups", icon: Gem, auth: true },
    { label: "account", path: "/account", icon: Settings, auth: false },
  ];

  const isLoggedIn = !loading && !!user?.id;

  // Menu dropdown rendered via portal to escape stacking context
  const menuDropdown = open && dropdownPos ? createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed overflow-hidden"
          style={{
            top: dropdownPos.top,
            right: dropdownPos.right,
            width: 190,
            backgroundColor: "#000000",
            border: "2px solid #1a1a1a",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
            zIndex: 99999,
          }}
        >
          <div className="relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 transition-colors duration-150 hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.35)" }}
              aria-label="close menu"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
            <div className="py-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path && !item.state;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
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
                    className="w-full text-left flex items-center gap-2.5 transition-colors duration-150"
                    style={{
                      padding: "10px 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: "lowercase",
                      color: isActive ? "#facc15" : "rgba(255,255,255,0.9)",
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(250,204,21,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <item.icon size={18} strokeWidth={2.5} className="shrink-0" style={{ color: "#facc15" }} />
                    {item.label}
                  </button>
                );
              })}
              {user && (
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2.5 transition-colors duration-150"
                  style={{ color: "#ff4444", padding: "10px 14px", fontSize: 13, fontWeight: 700, textTransform: "lowercase" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(250,204,21,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <LogOut size={18} strokeWidth={2.5} className="shrink-0" style={{ color: "#ff4444" }} />
                  log out
                </button>
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
      <header
        className="sticky top-0"
        style={{
          zIndex: 9990,
          background: "linear-gradient(to bottom, #000000 0%, #000000 65%, rgba(0,0,0,0.97) 75%, rgba(0,0,0,0.85) 85%, rgba(0,0,0,0.5) 93%, transparent 100%)",
          paddingBottom: 56,
        }}
      >
        <TopGradientBar />
        <div className="max-w-lg md:max-w-6xl mx-auto flex items-center justify-between px-[14px] md:px-8 pt-6 pb-2">
          <div className="flex items-center gap-2.5">
            <button onClick={() => handleNav("/")} className="text-[22px] font-[900] lowercase text-white tracking-tight active:opacity-80 transition-opacity duration-150">
              vizura
            </button>
            {/* User status icon — right of logo */}
            {isLoggedIn && (
              <button
                onClick={() => navigate("/account")}
                className="flex items-center justify-center shrink-0 active:scale-95 transition-transform duration-150"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: subscribed ? "rgba(0,224,255,0.12)" : "rgba(255,255,255,0.08)",
                  border: `1.5px solid ${subscribed ? "rgba(0,224,255,0.3)" : "rgba(255,255,255,0.15)"}`,
                }}
                aria-label="my account"
              >
                <User size={14} strokeWidth={2.5} style={{ color: subscribed ? "#00e0ff" : "#ffffff" }} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/top-ups")}
              className="flex items-center gap-2 rounded-xl px-5 py-3 active:scale-95 transition-transform duration-150"
              style={{
                backgroundColor: "rgba(0,224,255,0.08)",
                border: "2px solid rgba(0,224,255,0.25)",
              }}
            >
              <Gem size={20} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
              <span className="text-[17px] font-[900] lowercase" style={{ color: "#00e0ff" }}>{gems}</span>
            </button>

            <button
              ref={menuBtnRef}
              onClick={() => setOpen(!open)}
              className="flex items-center justify-center active:scale-95 transition-transform duration-150"
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: "#1a1a1a",
                border: "2px solid #1a1a1a",
              }}
              aria-label="open menu"
            >
              <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                <rect y="0" width="22" height="2.8" rx="1.4" fill="white" />
                <rect y="6.6" width="22" height="2.8" rx="1.4" fill="white" />
                <rect y="13.2" width="22" height="2.8" rx="1.4" fill="white" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      {menuDropdown}
    </>
  );
};

export default Header;
