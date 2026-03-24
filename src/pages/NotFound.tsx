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
        <p className="mb-6 text-body-lg text-muted-foreground font-semibold lowercase">route not resolved — the requested endpoint was not found or has been deprecated</p>
        <a href="/" className="text-foreground underline font-extrabold lowercase hover:text-foreground/80">
          return to primary interface
        </a>
      </div>
    </div>
  );
};

export default NotFound;
