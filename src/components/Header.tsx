import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import VizuraLogo from "@/components/VizuraLogo";
import { Menu, UserRound, Sparkles, Camera, LayoutGrid, FolderOpen, HelpCircle, Zap } from "lucide-react";
import { useCredits } from "@/contexts/CreditsContext";

const menuItems = [
  { label: "create character", icon: Sparkles, path: "/" },
  { label: "create photo", icon: Camera, path: "/create" },
  { label: "my characters", icon: LayoutGrid, path: "/characters" },
  { label: "storage", icon: FolderOpen, path: "/storage" },
  { label: "account", icon: UserRound, path: "/account" },
  { label: "help", icon: HelpCircle, path: "/help" },
];

const pageNames: Record<string, string> = {
  "/": "create character",
  "/create": "create photo",
  "/characters": "my characters",
  "/storage": "storage",
  "/account": "account",
  "/help": "help",
  "/settings": "settings",
  "/auth": "sign in",
  "/reset-password": "reset password",
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    navigate(path);
  };

  const currentPage = pageNames[location.pathname] || "";
  const currentMenuItem = menuItems.find((item) => item.path === location.pathname);
  const CurrentIcon = currentMenuItem?.icon;

  return (
    <header className="bg-nav sticky top-0 z-40">
      <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-5">
        <VizuraLogo className="text-nav-foreground text-2xl" />

        <div className="flex items-center gap-3" ref={menuRef}>
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id="icon-gradient-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(265 85% 75%)" />
                <stop offset="100%" stopColor="hsl(280 75% 58%)" />
              </linearGradient>
            </defs>
          </svg>
          <span className="flex items-center gap-2.5 text-xs font-extrabold lowercase">
            {CurrentIcon && <CurrentIcon size={14} strokeWidth={2.5} style={{ stroke: "url(#icon-gradient-purple)" }} />}
            <span className="gradient-purple-text">{currentPage}</span>
          </span>
          <button
            onClick={() => setOpen(!open)}
            className="w-10 h-10 rounded-2xl bg-nav-foreground/10 hover:bg-nav-foreground/15 flex items-center justify-center text-nav-foreground transition-colors"
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
                className="absolute right-0 top-full mt-1.5 w-52 bg-nav border-[5px] border-nav-foreground/10 rounded-2xl shadow-medium overflow-hidden"
              >
                <div className="py-1.5">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleNav(item.path)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-extrabold lowercase transition-colors ${
                        location.pathname === item.path
                          ? "gradient-purple-text"
                          : "text-nav-foreground hover:text-nav-foreground/70"
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

export default Header;
