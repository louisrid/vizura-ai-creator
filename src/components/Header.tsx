import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import VizuraLogo from "@/components/VizuraLogo";
import { Menu, X, UserRound, Sparkles, LayoutGrid, FolderOpen, HelpCircle, Settings } from "lucide-react";

const menuItems = [
  { label: "account", icon: UserRound, path: "/account" },
  { label: "create", icon: Sparkles, path: "/" },
  { label: "my characters", icon: LayoutGrid, path: "/characters" },
  { label: "storage", icon: FolderOpen, path: "/storage" },
  { label: "help", icon: HelpCircle, path: "/help" },
  { label: "settings", icon: Settings, path: "/settings" },
];

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

  return (
    <header className="bg-nav sticky top-0 z-40">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
        <VizuraLogo className="text-nav-foreground text-xl" />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(!open)}
            className="w-9 h-9 rounded-xl bg-nav-foreground/10 hover:bg-nav-foreground/15 flex items-center justify-center text-nav-foreground transition-colors"
          >
            {open ? <X size={18} strokeWidth={2.5} /> : <Menu size={18} strokeWidth={2.5} />}
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-1.5 w-52 bg-nav border-2 border-nav-foreground/10 rounded-xl shadow-medium overflow-hidden"
              >
                <div className="py-1.5">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleNav(item.path)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-extrabold lowercase transition-colors ${
                        location.pathname === item.path
                          ? "text-accent-purple"
                          : "text-nav-foreground hover:text-nav-foreground/70"
                      }`}
                    >
                      <item.icon size={14} strokeWidth={2.5} />
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
