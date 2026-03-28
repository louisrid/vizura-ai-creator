import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Sparkles, Camera, LayoutGrid, FolderOpen, Zap, Clock, Home as HomeIcon, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";

const menuItems = [
  { label: "create character", icon: Sparkles, path: "/create-character" },
  { label: "create photo", icon: Camera, path: "/create" },
  { label: "my characters", icon: LayoutGrid, path: "/characters" },
  { label: "storage", icon: FolderOpen, path: "/storage" },
  { label: "history", icon: Clock, path: "/history" },
  { label: "top-ups", icon: Zap, path: "/top-ups" },
  { label: "account", icon: Settings, path: "/account" },
];

const Home = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { credits } = useCredits();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNav = (path: string) => {
    setMenuOpen(false);
    if (!user && path === "/account") {
      navigate("/auth?redirect=/account");
    } else {
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-lg flex-col px-5 pt-10 pb-16">
        {/* Top bar: logo + credits + user + menu */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-[900] lowercase tracking-tight text-foreground">
            vizura
          </h1>

          <div className="flex items-center gap-3">
            {/* Credits badge */}
            {user && (
              <div className="flex items-center gap-1.5 rounded-full border-[4px] border-neon-yellow px-3 py-1">
                <Zap size={12} strokeWidth={2.5} className="text-neon-yellow" />
                <span className="text-[11px] font-extrabold lowercase text-foreground">
                  {credits}
                </span>
              </div>
            )}

            {/* User icon */}
            {!loading && !!user && (
              <button
                onClick={() => navigate("/account")}
                className="flex h-10 w-10 items-center justify-center rounded-full border-[4px] border-border"
                aria-label="my account"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-foreground">
                  <circle cx="12" cy="8" r="5" />
                  <path d="M3.5 21.5a8.5 8.5 0 0 1 17 0c0 1.1-.9 2-2 2h-13a2 2 0 0 1-2-2Z" />
                </svg>
              </button>
            )}

            {/* Sign in link for logged-out */}
            {!loading && !user && (
              <button
                onClick={() => navigate("/auth")}
                className="text-xs font-extrabold lowercase text-foreground/50 underline underline-offset-4"
              >
                sign in
              </button>
            )}

            {/* Menu button */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90"
                aria-label="open menu"
              >
                <svg width="16" height="12" viewBox="0 0 18 14" fill="none">
                  <rect y="0" width="18" height="2.5" rx="1.25" fill="currentColor" />
                  <rect y="5.5" width="18" height="2.5" rx="1.25" fill="currentColor" />
                  <rect y="11" width="18" height="2.5" rx="1.25" fill="currentColor" />
                </svg>
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-2xl border-[4px] border-border bg-card shadow-medium z-50"
                  >
                    <div className="py-1.5">
                      {menuItems.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => handleNav(item.path)}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-extrabold lowercase text-foreground transition-colors hover:text-foreground/60"
                        >
                          <item.icon size={14} strokeWidth={2.5} className="text-foreground/40" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Big create+ CTA pill */}
        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <button
            onClick={() => {
              if (!user) {
                navigate("/auth?redirect=/create-character");
              } else {
                navigate("/create-character");
              }
            }}
            className="flex h-[4.5rem] w-full items-center justify-center rounded-full bg-foreground text-[1.35rem] font-[900] lowercase tracking-tight text-background transition-transform active:scale-[0.97]"
            style={{ transition: "transform 0.05s" }}
          >
            create+
          </button>
        </motion.div>

        {/* Quick links grid */}
        <motion.section
          className="mt-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "my characters", icon: LayoutGrid, path: "/characters" },
              { label: "create photo", icon: Camera, path: "/create" },
              { label: "storage", icon: FolderOpen, path: "/storage" },
              { label: "history", icon: Clock, path: "/history" },
              { label: "top-ups", icon: Zap, path: "/top-ups" },
              { label: "account", icon: Settings, path: "/account" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => handleNav(item.path)}
                className="flex h-14 items-center gap-3 rounded-2xl border-[4px] border-border bg-card px-4 text-xs font-extrabold lowercase text-foreground transition-colors hover:border-foreground/40 active:scale-[0.97]"
                style={{ transition: "transform 0.05s, border-color 0.15s" }}
              >
                <item.icon size={15} strokeWidth={2.5} className="shrink-0 text-foreground/40" />
                {item.label}
              </button>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default Home;
