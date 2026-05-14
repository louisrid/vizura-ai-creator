import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative z-[1] w-full max-w-lg mx-auto px-[24px] pt-[34px] pb-[140px]">
        <div className="flex items-center gap-[14px] mb-14">
          <BackButton />
          <PageTitle className="mb-0">not found</PageTitle>
        </div>
        <div className="border-[1.5px] border-[hsl(var(--border-mid))] rounded-[8px] p-6 text-center" style={{ backgroundColor: "hsl(var(--card))" }}>
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
