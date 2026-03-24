import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

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
        <Link to="/" className="text-nav-foreground text-2xl font-extrabold lowercase tracking-tight">
          vizura
        </Link>
        <nav className="flex items-center gap-3">
          {user ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-nav-foreground hover:text-nav-foreground/80 hover:bg-nav-foreground/10">
              log out
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="hero-outline" size="sm">log in</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
