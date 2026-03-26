import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import VizuraLogo from "@/components/VizuraLogo";
import { Menu, UserRound, CircleUserRound, Sparkles, Camera, LayoutGrid, FolderOpen, Zap, LogIn } from "lucide-react";
import { useCredits } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { label: "create character", icon: Sparkles, path: "/" },
  { label: "create photo", icon: Camera, path: "/create" },
  { label: "my characters", icon: LayoutGrid, path: "/characters" },
  { label: "storage", icon: FolderOpen, path: "/storage" },
  { label: "top-ups", icon: Zap, path: "/top-ups" },
  { label: "my account", icon: UserRound, path: "/account" },
];

const pageNames: Record<string, string> = {
  "/": "create character",
  "/create": "create photo",
  "/characters": "my characters",
  "/storage": "storage",
  "/top-ups": "top-ups",
  "/account": "my account",
  "/help": "help",
  "/auth": "sign in",
  "/reset-password": "reset password",
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
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
      navigate("/auth");
    } else {
      navigate(path);
    }
  };

  const currentPage = pageNames[location.pathname] || "";
  const currentMenuItem = menuItems.find((item) => item.path === location.pathname);
  const isAuthPage = location.pathname === "/auth";
  const CurrentIcon = currentMenuItem?.icon || (isAuthPage ? LogIn : undefined);

  return (
    <header className="bg-nav sticky top-0 z-40 border-b-[3px] border-nav-foreground/15">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-3">
          <VizuraLogo className="text-nav-foreground text-2xl" />
          <CreditsBadge />
        </div>

        <div className="relative flex items-center gap-3" ref={menuRef}>
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id="icon-gradient-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(210 100% 65%)" />
                <stop offset="100%" stopColor="hsl(230 85% 55%)" />
              </linearGradient>
            </defs>
          </svg>
          {user && (
            <button onClick={() => navigate("/account")} className="shrink-0">
              <CircleUserRound size={14} strokeWidth={2.5} className="text-nav-foreground" />
            </button>
          )}
          <span className="flex items-center gap-2.5 text-xs font-extrabold lowercase">
            {CurrentIcon && <CurrentIcon size={14} strokeWidth={2.5} style={{ stroke: "url(#icon-gradient-purple)" }} />}
            <span className="gradient-purple-text">{currentPage}</span>
          </span>
          <button
            onClick={() => setOpen(!open)}
            className="w-10 h-10 rounded-2xl gradient-purple flex items-center justify-center text-white transition-opacity hover:opacity-90"
          >
            <Menu size={20} strokeWidth={2.5} />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 mr-0 w-48 bg-nav border-[5px] border-nav-foreground/20 rounded-2xl shadow-medium overflow-hidden"
              >
                <div className="py-1.5">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleNav(item.path)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-extrabold lowercase transition-colors ${
                        location.pathname === item.path
                          ? "gradient-purple-text"
                          : "text-nav-foreground hover:text-nav-foreground/80"
                      }`}
                    >
                      <item.icon
                        size={14}
                        strokeWidth={2.5}
                        style={location.pathname === item.path ? { stroke: "url(#icon-gradient-purple)" } : undefined}
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

const CreditsBadge = () => {
  const { credits } = useCredits();
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border-[3px] border-nav-foreground/30 px-3 py-1.5">
      <Zap size={12} strokeWidth={2.5} className="text-nav-foreground" />
      <span className="text-[11px] font-extrabold text-nav-foreground">{credits}</span>
    </div>
  );
};

export default Header;
