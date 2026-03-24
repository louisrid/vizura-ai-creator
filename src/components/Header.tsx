import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="bg-nav">
      <div className="container flex items-center justify-between py-6">
        <Link to="/" className="text-nav-foreground text-2xl font-extrabold lowercase tracking-tight">
          vizura
        </Link>
        <nav className="flex items-center gap-4">
          <Link to="/generate">
            <Button variant="hero-outline" size="sm">
              generate
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
