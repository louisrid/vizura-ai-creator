import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import DotDecal from "@/components/DotDecal";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="relative z-[1] w-full max-w-lg mx-auto px-4 pt-10 pb-[280px]">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
          <PageTitle className="mb-0">not found</PageTitle>
        </div>
        <div className="border-2 border-[hsl(var(--border-mid))] rounded-[10px] p-6 text-center" style={{ backgroundColor: "#1a1a1a" }}>
          <p className="text-xs font-extrabold lowercase mb-3 text-foreground">page not found</p>
          <a href="/" className="text-[10px] font-extrabold lowercase text-foreground underline">
            back to home
          </a>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
