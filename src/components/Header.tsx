import { useState, useRef, useEffect, useMemo } from "react";
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  // User icon color: green if subscribed, white otherwise
  const userIconColor = subscribed ? "#22c55e" : "#ffffff";

  return (
    <header
      className="sticky top-0 z-40 relative"
      style={{
        background: "linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.2) 75%, transparent 100%)",
        paddingBottom: 28,
      }}
    >
      <TopGradientBar />
      <div className="max-w-lg md:max-w-6xl mx-auto flex items-center justify-between px-[14px] md:px-8 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <button onClick={() => handleNav("/")} className="text-[19px] font-[900] lowercase text-white tracking-tight active:opacity-80 transition-opacity duration-150">
            vizura
          </button>
          {/* User status icon — right of logo */}
          {!loading && !!user?.id && (
            <button
              onClick={() => navigate("/account")}
              className="flex items-center justify-center shrink-0 active:scale-95 transition-transform duration-150"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: subscribed ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.08)",
                border: `1.5px solid ${subscribed ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.15)"}`,
              }}
              aria-label="my account"
            >
              <User size={14} strokeWidth={2.5} style={{ color: userIconColor }} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5" ref={menuRef}>
          <div className="flex items-center gap-1.5 rounded-xl px-3.5 py-2"
            style={{
              backgroundColor: "rgba(0,224,255,0.08)",
              border: "2px solid rgba(0,224,255,0.25)",
            }}
          >
            <Gem size={14} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
            <span className="text-[13px] font-[900] lowercase" style={{ color: "#00e0ff" }}>{gems}</span>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="flex items-center justify-center active:scale-95 transition-transform duration-150"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              backgroundColor: "#1a1a1a",
              border: "2px solid #222",
            }}
            aria-label="open menu"
          >
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
              <rect y="0" width="14" height="2" rx="1" fill="white" />
              <rect y="4" width="14" height="2" rx="1" fill="white" />
              <rect y="8" width="14" height="2" rx="1" fill="white" />
            </svg>
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-[14px] top-full -mt-2 overflow-hidden"
                style={{
                  width: 220,
                  backgroundColor: "#000000",
                  border: "2px solid #222",
                  borderRadius: 16,
                  zIndex: 50,
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
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
