import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-display-sm">404</h1>
        <p className="mb-6 text-body-lg text-muted-foreground font-semibold lowercase">this page doesn't exist — it may have been moved or removed</p>
        <a href="/" className="text-foreground underline font-extrabold lowercase hover:text-foreground/80">
          go back to the homepage
        </a>
      </div>
    </div>
  );
};

export default NotFound;
