import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import VizuraLogo from "@/components/VizuraLogo";
import { Gem, Sparkles, Camera, LayoutGrid, FolderOpen, Settings, User, type LucideIcon } from "lucide-react";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

const menuItems: { label: string; path: string; icon: LucideIcon }[] = [
  { label: "create character", path: "/", icon: Sparkles },
  { label: "create photo", path: "/create", icon: Camera },
  { label: "my characters", path: "/characters", icon: LayoutGrid },
  { label: "storage", path: "/storage", icon: FolderOpen },
  { label: "top-ups", path: "/top-ups", icon: Gem },
  { label: "my account", path: "/account", icon: Settings },
];

const pageNames: Record<string, string> = {
  "/": "create character",
  "/generate-face": "generate face",
  "/choose-face": "generate face",
  "/create": "create photo",
  "/index": "create photo",
  "/characters": "my characters",
  "/storage": "storage",
  "/history": "history",
  "/top-ups": "top-ups",
  "/account": "my account",
  "/help": "help",
  "/auth": "my account",
  "/reset-password": "reset password",
};

const resolvePageName = (pathname: string): string => {
  if (pageNames[pathname]) return pageNames[pathname];
  // Handle dynamic routes like /characters/:id
  if (pathname.startsWith("/characters/")) return "profile";
  return "";
};

const resolveActivePath = (pathname: string): string => {
  // Map sub-routes to their parent menu item path
  if (pathname.startsWith("/characters")) return "/characters";
  return pathname;
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const { subscribed } = useSubscription();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleNav = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  // When on /account with a redirect param, treat the redirect target as the active page
  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = location.pathname === "/account" ? searchParams.get("redirect") : null;
  const effectivePath = redirectTarget || location.pathname;

  const currentPage = resolvePageName(effectivePath) || resolvePageName(location.pathname);
  const activePath = resolveActivePath(effectivePath);
  const currentMenuItem = menuItems.find((item) => item.path === activePath) || menuItems.find((item) => item.path === resolveActivePath(location.pathname));
  const CurrentIcon = currentMenuItem?.icon;

  return (
    <header className="bg-nav sticky top-0 z-40 border-b-[5px] border-white">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-3">
          <VizuraLogo className="text-nav-foreground text-2xl" />
          <GemsBadge />
          {!loading && !!user?.id && location.pathname !== "/auth" && location.pathname !== "/reset-password" && (
            <button
              onClick={() => navigate("/account")}
              className="shrink-0"
              aria-label="my account"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{
                  color: subscribed ? "hsl(var(--member-green))" : "hsl(var(--nav-foreground))",
                }}
              >
                <circle cx="12" cy="8" r="5" />
                <path d="M3.5 21.5a8.5 8.5 0 0 1 17 0c0 1.1-.9 2-2 2h-13a2 2 0 0 1-2-2Z" />
              </svg>
            </button>
          )}
        </div>

        <div className="relative flex items-center gap-3" ref={menuRef}>
          <span className="text-xs font-extrabold lowercase text-nav-foreground flex items-center gap-1.5">
            {CurrentIcon && <CurrentIcon size={14} strokeWidth={2.5} className="text-neon-yellow shrink-0" />}
            {currentPage}
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
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 mr-0 w-48 overflow-hidden rounded-2xl border-[5px] border-nav-foreground/20 bg-nav shadow-medium"
              >
                <div className="py-1.5">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleNav(item.path)}
                      className={`w-full text-left px-4 py-2.5 text-xs font-extrabold lowercase transition-colors flex items-center gap-2 ${
                        activePath === item.path
                          ? "text-neon-yellow"
                          : "text-nav-foreground hover:text-nav-foreground/80"
                      }`}
                    >
                      <item.icon size={14} strokeWidth={2.5} className="shrink-0" />
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
