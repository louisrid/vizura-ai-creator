import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Gem, Camera, LayoutGrid, Settings, LogOut, X, Home, UserPlus, Archive } from "lucide-react";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import TopGradientBar from "@/components/TopGradientBar";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signOut } = useAuth();
  const { gems } = useGems();
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

  const userInitial = useMemo(() => {
    if (!user?.email) return "?";
    return user.email[0].toUpperCase();
  }, [user?.email]);

  const menuItems = [
    { label: "home", path: "/", icon: Home, auth: false },
    { label: "create character", path: "/", icon: UserPlus, state: { openCreator: true }, auth: false },
    { label: "create photo", path: "/create", icon: Camera, auth: true },
    { label: "my characters", path: "/characters", icon: LayoutGrid, auth: true },
    { label: "storage", path: "/storage", icon: Archive, auth: true },
    { label: "gems", path: "/top-ups", icon: Gem, auth: true },
    { label: "settings", path: "/account", icon: Settings, auth: false },
  ];

  return (
    <header
      className="sticky top-0 z-40 relative"
      style={{
        background: "linear-gradient(to bottom, #000000 0%, #000000 30%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.2) 85%, transparent 100%)",
        paddingBottom: 40,
      }}
    >
      <TopGradientBar />
      <div className="max-w-lg md:max-w-6xl mx-auto flex items-center justify-between px-[14px] md:px-8 pt-8 pb-4">
        <button onClick={() => handleNav("/")} className="text-[21px] font-[900] lowercase text-white tracking-tight active:opacity-80 transition-opacity duration-150">
          vizura
        </button>

        <div className="flex items-center gap-2.5" ref={menuRef}>
          <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
            style={{
              backgroundColor: "rgba(0,224,255,0.08)",
              border: "2px solid rgba(0,224,255,0.25)",
            }}
          >
            <Gem size={12} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
            <span className="text-[11px] font-[900] lowercase" style={{ color: "#00e0ff" }}>{gems}</span>
          </div>

          {!loading && !!user?.id && (
            <button
              onClick={() => navigate("/account")}
              className="flex items-center justify-center shrink-0 active:scale-95 transition-transform duration-150"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                backgroundColor: "#facc15",
              }}
              aria-label="my account"
            >
              <span className="text-[13px] font-[900] text-black">{userInitial}</span>
            </button>
          )}

          <button
            onClick={() => setOpen(!open)}
            className="flex items-center justify-center active:scale-95 transition-transform duration-150"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
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
                            padding: "14px 16px",
                            fontSize: 14,
                            fontWeight: 700,
                            textTransform: "lowercase",
                            color: isActive ? "#facc15" : "#fff",
                            backgroundColor: "transparent",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(250,204,21,0.06)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <item.icon size={18} strokeWidth={2.5} className="shrink-0" style={{ color: isActive ? "#facc15" : "#facc15" }} />
                          {item.label}
                        </button>
                      );
                    })}
                    {user && (
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center gap-2.5 transition-colors duration-150"
                        style={{ color: "#ff4444", padding: "14px 16px", fontSize: 14, fontWeight: 700, textTransform: "lowercase" }}
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
