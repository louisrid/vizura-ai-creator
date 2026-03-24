import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import VizuraLogo from "@/components/VizuraLogo";
import { UserRound } from "lucide-react";

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="bg-nav">
      <div className="container flex items-center justify-between py-5">
        <VizuraLogo className="text-nav-foreground text-2xl" />
        <nav className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-nav-foreground hover:text-nav-foreground/80 hover:bg-nav-foreground/10">
                log out
              </Button>
              <div className="flex items-center gap-2.5 bg-nav-foreground text-nav px-5 py-2.5 font-extrabold lowercase text-sm">
                <UserRound size={18} strokeWidth={2.5} />
                logged in
              </div>
            </div>
          ) : (
            <Button variant="hero-outline" size="sm" onClick={() => navigate("/auth")}>
              create
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
