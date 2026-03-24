import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import VizuraLogo from "@/components/VizuraLogo";

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="bg-nav">
      <div className="container flex items-center justify-between py-6">
        <VizuraLogo className="text-nav-foreground text-2xl" />
        <nav className="flex items-center gap-3">
          {user ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-nav-foreground hover:text-nav-foreground/80 hover:bg-nav-foreground/10">
              log out
            </Button>
          ) : (
            <Button variant="hero-outline" size="sm" onClick={() => navigate("/auth")}>
              log in
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
