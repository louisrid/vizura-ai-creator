import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/Header";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-10">
        <div className="border-2 border-border rounded-xl p-6 text-center mt-12">
          <p className="text-sm font-extrabold lowercase mb-1">404</p>
          <p className="text-[10px] font-bold lowercase text-muted-foreground mb-3">page not found</p>
          <a href="/" className="text-xs font-extrabold lowercase text-foreground underline">
            back to home
          </a>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
