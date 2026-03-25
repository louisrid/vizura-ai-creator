import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import VizuraLogo from "@/components/VizuraLogo";
import { UserRound, ChevronDown, LogOut, Image, Sparkles, CreditCard } from "lucide-react";

const Header = () => {
  const { user, signOut } = useAuth();
  const { credits } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();
  const isOnAuth = location.pathname === "/auth";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate("/");
  };

  const handleNav = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="bg-nav sticky top-0 z-40">
      <div className="container flex items-center justify-between py-4">
        <VizuraLogo className="text-nav-foreground text-2xl" />
        <nav className="flex items-center gap-3">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 bg-nav-foreground/10 hover:bg-nav-foreground/15 text-nav-foreground px-4 py-2.5 rounded-lg font-extrabold lowercase text-sm transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-accent-purple flex items-center justify-center">
                  <UserRound size={14} strokeWidth={2.5} className="text-white" />
                </div>
                <span className="hidden sm:inline">{user.email?.split("@")[0]}</span>
                <ChevronDown size={14} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-medium overflow-hidden"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border">
                      <p className="font-extrabold lowercase text-sm text-foreground truncate">{user.email}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Sparkles size={12} className="text-accent-purple" />
                        <span className="text-xs font-bold text-muted-foreground">{credits} credit{credits !== 1 ? "s" : ""} remaining</span>
                      </div>
                    </div>

                    {/* Nav links */}
                    <div className="py-1.5">
                      <DropdownItem icon={Sparkles} label="character creator" onClick={() => handleNav("/")} active={location.pathname === "/"} />
                      <DropdownItem icon={Sparkles} label="prompt create" onClick={() => handleNav("/create")} active={location.pathname === "/create"} />
                      <DropdownItem icon={Image} label="gallery" onClick={() => handleNav("/gallery")} active={location.pathname === "/gallery"} />
                      <DropdownItem icon={CreditCard} label="get credits" onClick={() => handleNav("/?upgrade=true")} />
                    </div>

                    {/* Logout */}
                    <div className="border-t border-border py-1.5">
                      <DropdownItem icon={LogOut} label="log out" onClick={handleSignOut} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : isOnAuth ? (
            <Button variant="hero-outline" size="sm" onClick={() => navigate("/")}>
              home
            </Button>
          ) : (
            <Button variant="hero-outline" size="sm" onClick={() => navigate("/auth")}>
              login
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

const DropdownItem = ({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold lowercase transition-colors hover:bg-accent ${
      active ? "text-accent-purple bg-accent-purple-light" : "text-foreground"
    }`}
  >
    <Icon size={16} strokeWidth={2.5} />
    {label}
  </button>
);

export default Header;
