import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import VizuraLogo from "@/components/VizuraLogo";
import { Menu, Settings, Sparkles, Camera, LayoutGrid, FolderOpen, Gem, LogIn, Clock, Home } from "lucide-react";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { label: "home", icon: Home, path: "/" },
  { label: "create character", icon: Sparkles, path: "/create-character" },
  { label: "create photo", icon: Camera, path: "/create" },
  { label: "my characters", icon: LayoutGrid, path: "/characters" },
  { label: "storage", icon: FolderOpen, path: "/storage" },
  { label: "history", icon: Clock, path: "/history" },
  { label: "top-ups", icon: Gem, path: "/top-ups" },
  { label: "my account", icon: Settings, path: "/account" },
];

const pageNames: Record<string, string> = {
  "/": "home",
  "/create-character": "create character",
  "/characters": "my characters",
  "/storage": "storage",
  "/history": "history",
  "/top-ups": "top-ups",
  "/account": "my account",
  "/help": "help",
  "/auth": "sign in",
  "/reset-password": "reset password",
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNav = (path: string) => {
    setOpen(false);
    if (path === "/account" && !user) {
      navigate(`/auth?redirect=${encodeURIComponent(path)}`);
    } else {
      navigate(path);
    }
  };

  const currentPage = pageNames[location.pathname] || "";
  const currentMenuItem = menuItems.find((item) => item.path === location.pathname);
  const isAuthPage = location.pathname === "/auth";
  const CurrentIcon = currentMenuItem?.icon || (isAuthPage ? LogIn : undefined);

  return (
    <header className="bg-nav sticky top-0 z-40 border-b-[5px] border-nav-foreground/15">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-3">
          <VizuraLogo className="text-nav-foreground text-2xl" />
          <GemsBadge />
        </div>

        <div className="relative flex items-center gap-3" ref={menuRef}>
          {!loading && !!user?.id && location.pathname !== "/auth" && location.pathname !== "/reset-password" && (
            <button onClick={() => navigate("/account")} className="shrink-0" aria-label="my account">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-nav-foreground">
                <circle cx="12" cy="8" r="5" />
                <path d="M3.5 21.5a8.5 8.5 0 0 1 17 0c0 1.1-.9 2-2 2h-13a2 2 0 0 1-2-2Z" />
              </svg>
            </button>
          )}

          <span className="flex items-center gap-2.5 text-xs font-extrabold lowercase">
            {CurrentIcon && <CurrentIcon size={14} strokeWidth={2.5} className="text-neon-yellow" />}
            <span className="text-neon-yellow">{currentPage}</span>
          </span>

          <button
            onClick={() => setOpen(!open)}
            className="w-10 h-10 rounded-2xl bg-neon-yellow flex items-center justify-center text-neon-yellow-foreground transition-opacity hover:opacity-90"
            aria-label="open menu"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <rect y="0" width="18" height="3" rx="1.5" fill="currentColor" />
              <rect y="5.5" width="18" height="3" rx="1.5" fill="currentColor" />
              <rect y="11" width="18" height="3" rx="1.5" fill="currentColor" />
            </svg>
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 mr-0 w-48 overflow-hidden rounded-2xl border-[5px] border-nav-foreground/20 bg-nav shadow-medium"
              >
                <div className="py-1.5">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleNav(item.path)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-extrabold lowercase transition-colors ${
                        location.pathname === item.path
                          ? "text-neon-yellow"
                          : "text-nav-foreground hover:text-nav-foreground/80"
                      }`}
                    >
                      <item.icon
                        size={14}
                        strokeWidth={2.5}
                        className={location.pathname === item.path ? "text-neon-yellow" : undefined}
                      />
                      {item.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

const GemsBadge = () => {
  const { gems } = useGems();
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border-[3px] border-gem-green bg-gem-green/10 px-3 py-1.5">
      <Gem size={12} strokeWidth={2.5} className="text-gem-green" />
      <span className="text-[11px] font-extrabold lowercase text-nav-foreground">{gems}</span>
    </div>
  );
};

export default Header;
