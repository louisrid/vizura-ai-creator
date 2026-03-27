import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";

const CartoonGirl = ({ size = 80 }: { size?: number }) => (
  <svg width={size} height={size * 1.2} viewBox="0 0 80 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Hair behind — bigger, fuller */}
    <ellipse cx="40" cy="32" rx="34" ry="36" fill="#C85A2A" />
    {/* Head — bigger ratio */}
    <ellipse cx="40" cy="36" rx="26" ry="30" fill="#FFD93D" />
    {/* Hair bangs — fuller */}
    <path d="M12 28 Q18 4 40 2 Q62 4 68 28 Q60 12 40 10 Q20 12 12 28Z" fill="#C85A2A" />
    {/* Side hair strands */}
    <path d="M10 32 Q8 50 14 62" stroke="#C85A2A" strokeWidth="8" strokeLinecap="round" fill="none" />
    <path d="M70 32 Q72 50 66 62" stroke="#C85A2A" strokeWidth="8" strokeLinecap="round" fill="none" />
    {/* No face — blank */}
    {/* Body / top — smaller relative to head */}
    <path d="M30 72 Q26 74 24 86 L56 86 Q54 74 50 72 Q46 70 40 70 Q34 70 30 72Z" fill="#FF69B4" />
    {/* Neck */}
    <rect x="36" y="66" width="8" height="6" rx="2" fill="#FFD93D" />
  </svg>
);

const GRID_COLS = 3;
const GRID_ROWS = 3;

const MyCharacters = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
  }, [user, authLoading, navigate, location.pathname]);

  if (!authLoading && !user) return null;

  const cells = Array.from({ length: GRID_COLS * GRID_ROWS });

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
        <div className="flex items-center gap-3 mb-10">
          <BackButton />
        </div>
        <PageTitle>my characters</PageTitle>

        <div className="grid grid-cols-3 gap-2">
          {cells.map((_, i) => {
            // Top-left: add new character button
            if (i === 0) {
              return (
                <button
                  key={i}
                  onClick={() => navigate("/")}
                  className="aspect-[3/4] rounded-2xl border-[5px] border-border bg-card flex items-center justify-center hover:border-foreground/60 transition-colors active:scale-[0.97]"
                >
                  <Plus size={32} strokeWidth={3} className="text-foreground" />
                </button>
              );
            }

            // Top-middle: test character (only when logged in)
            if (i === 1 && user) {
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className="aspect-[3/4] w-full rounded-2xl border-[5px] border-border bg-card flex items-center justify-center relative overflow-hidden">
                    <span className="absolute text-5xl leading-none" style={{ bottom: '16px', left: '14px' }}>🇺🇸</span>
                    <div className="relative z-10">
                      <CartoonGirl size={100} />
                    </div>
                  </div>
                  <span className="mt-1.5 text-xs font-[900] tracking-tight text-foreground">
                    Sarah, 24
                  </span>
                </div>
              );
            }

            // Empty cells
            return (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl bg-background"
              />
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default MyCharacters;
