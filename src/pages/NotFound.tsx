import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import PageTransition from "@/components/PageTransition";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="w-full max-w-lg mx-auto px-4 pt-10 pb-10">
          <div className="flex items-center gap-3 mb-8">
            <BackButton />
          </div>
          <div className="border-2 border-border rounded-xl p-6 text-center">
            <p className="text-xs font-extrabold lowercase mb-3">page not found</p>
            <a href="/" className="text-[10px] font-extrabold lowercase text-foreground underline">
              back to home
            </a>
          </div>
        </main>
      </PageTransition>
    </div>
  );
};

export default NotFound;
