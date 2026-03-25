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
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
        <VizuraLogo className="text-nav-foreground text-xl" />
        <nav className="flex items-center gap-2">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 bg-nav-foreground/10 hover:bg-nav-foreground/15 text-nav-foreground px-3 py-2 rounded-xl font-extrabold lowercase text-xs transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-accent-purple flex items-center justify-center">
                  <UserRound size={12} strokeWidth={2.5} className="text-white" />
                </div>
                <span className="hidden sm:inline">{user.email?.split("@")[0]}</span>
                <ChevronDown size={12} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-1.5 w-56 bg-card border-2 border-border rounded-xl shadow-medium overflow-hidden"
                  >
                    <div className="px-3 py-2.5 border-b-2 border-border">
                      <p className="font-extrabold lowercase text-xs text-foreground truncate">{user.email}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Sparkles size={10} className="text-accent-purple" />
                        <span className="text-[10px] font-bold text-muted-foreground">{credits} credit{credits !== 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    <div className="py-1">
                      <DropdownItem icon={Sparkles} label="character creator" onClick={() => handleNav("/")} active={location.pathname === "/"} />
                      <DropdownItem icon={Sparkles} label="prompt create" onClick={() => handleNav("/create")} active={location.pathname === "/create"} />
                      <DropdownItem icon={Image} label="gallery" onClick={() => handleNav("/gallery")} active={location.pathname === "/gallery"} />
                      <DropdownItem icon={CreditCard} label="get credits" onClick={() => handleNav("/?upgrade=true")} />
                    </div>

                    <div className="border-t-2 border-border py-1">
                      <DropdownItem icon={LogOut} label="log out" onClick={handleSignOut} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : isOnAuth ? (
            <Button variant="hero-outline" size="sm" className="h-9 px-3 text-xs rounded-xl" onClick={() => navigate("/")}>
              home
            </Button>
          ) : (
            <Button variant="hero-outline" size="sm" className="h-9 px-3 text-xs rounded-xl" onClick={() => navigate("/auth")}>
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
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold lowercase transition-colors hover:bg-accent ${
      active ? "text-accent-purple bg-accent-purple-light" : "text-foreground"
    }`}
  >
    <Icon size={14} strokeWidth={2.5} />
    {label}
  </button>
);

export default Header;
