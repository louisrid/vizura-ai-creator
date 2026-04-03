import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Gem, Camera, LayoutGrid, Settings, LogOut, X } from "lucide-react";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
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

  const handleNav = (path: string) => {
    setOpen(false);
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

  return (
    <header className="sticky top-0 z-40 relative" style={{ backgroundColor: '#000000' }}>
      <TopGradientBar />
      <div className="max-w-lg md:max-w-6xl mx-auto flex items-center justify-between px-[14px] md:px-8 py-4">
        {/* Left: Logo */}
        <button onClick={() => handleNav("/")} className="text-[21px] font-[900] lowercase text-white tracking-tight">
          vizura
        </button>

        {/* Right: gems badge, avatar, hamburger */}
        <div className="flex items-center gap-2.5" ref={menuRef}>
          {/* Cyan gem badge */}
          <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
            style={{
              backgroundColor: "rgba(0,224,255,0.08)",
              border: "2px solid rgba(0,224,255,0.25)",
            }}
          >
            <Gem size={12} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
            <span className="text-[11px] font-[900] lowercase" style={{ color: "#00e0ff" }}>{gems}</span>
          </div>

          {/* Yellow avatar circle */}
          {!loading && !!user?.id && (
            <button
              onClick={() => navigate("/account")}
              className="flex items-center justify-center shrink-0"
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

          {/* Hamburger square */}
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center justify-center"
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

          {/* Dropdown menu */}
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-[14px] top-full mt-2 w-52 overflow-hidden"
                style={{
                  backgroundColor: "#151515",
                  border: "2px solid #222",
                  borderRadius: 16,
                  zIndex: 50,
                }}
              >
                <div className="relative">
                  <button
                    onClick={() => setOpen(false)}
                    className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
                    aria-label="close menu"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                  <div className="pt-2 pb-2">
                    {[
                      { label: "my characters", path: "/characters", icon: LayoutGrid },
                      { label: "create photo", path: "/create", icon: Camera },
                      { label: "gems", path: "/top-ups", icon: Gem },
                      { label: "settings", path: "/account", icon: Settings },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => handleNav(item.path)}
                        className="w-full text-left px-4 py-[14px] text-[14px] font-[800] lowercase transition-colors flex items-center gap-2.5 text-white hover:text-white"
                        style={{
                          borderBottom: "1px solid #222",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(250,204,21,0.06)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <item.icon size={14} strokeWidth={2.5} className="shrink-0" />
                        {item.label}
                      </button>
                    ))}
                    {user && (
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-[14px] text-[14px] font-[800] lowercase flex items-center gap-2.5"
                        style={{ color: "#ff4444" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(250,204,21,0.06)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <LogOut size={14} strokeWidth={2.5} className="shrink-0" />
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
      {/* Bottom border */}
      <div style={{ height: 1, backgroundColor: "#222" }} />
    </header>
  );
};

export default Header;
