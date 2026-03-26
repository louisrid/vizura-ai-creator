import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const CartoonGirl = ({ size = 80 }: { size?: number }) => (
  <svg width={size} height={size * 1.2} viewBox="0 0 80 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Hair behind */}
    <ellipse cx="40" cy="38" rx="30" ry="34" fill="#C85A2A" />
    {/* Head */}
    <ellipse cx="40" cy="40" rx="24" ry="28" fill="#FFD93D" />
    {/* Hair bangs */}
    <path d="M16 30 Q20 10 40 8 Q60 10 64 30 Q58 18 40 16 Q22 18 16 30Z" fill="#C85A2A" />
    {/* Top / bow */}
    <ellipse cx="40" cy="10" rx="10" ry="6" fill="#FF69B4" />
    {/* Eyes */}
    <circle cx="32" cy="42" r="3" fill="#222" />
    <circle cx="48" cy="42" r="3" fill="#222" />
    {/* Mouth */}
    <path d="M35 52 Q40 56 45 52" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Body / top */}
    <path d="M28 66 Q24 68 22 80 L58 80 Q56 68 52 66 Q46 64 40 64 Q34 64 28 66Z" fill="#FF69B4" />
    {/* Neck */}
    <rect x="36" y="62" width="8" height="6" rx="2" fill="#FFD93D" />
  </svg>
);

const GRID_COLS = 3;
const GRID_ROWS = 3;

const MyCharacters = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const cells = Array.from({ length: GRID_COLS * GRID_ROWS });

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-28 pb-12">
        <h1 className="text-5xl font-[900] lowercase tracking-tighter text-foreground text-center mb-12">
          my characters
        </h1>

        <div className="grid grid-cols-3 gap-2">
          {cells.map((_, i) => {
            // Top-left: add new character button
            if (i === 0) {
              return (
                <button
                  key={i}
                  onClick={() => navigate("/")}
                  className="aspect-[3/4] rounded-2xl border-[4px] border-border bg-card flex items-center justify-center hover:border-foreground/60 transition-colors active:scale-[0.97]"
                >
                  <Plus size={32} strokeWidth={3} className="text-foreground" />
                </button>
              );
            }

            // Top-middle: test character (only when logged in)
            if (i === 1 && user) {
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className="aspect-[3/4] w-full rounded-2xl border-[4px] border-border bg-card flex flex-col items-center justify-center relative overflow-hidden">
                    <CartoonGirl size={64} />
                    {/* Small American flag bottom-left */}
                    <span className="absolute bottom-2 left-2 text-lg leading-none">🇺🇸</span>
                  </div>
                  <span className="mt-1.5 text-xs font-[900] lowercase tracking-tight text-foreground">
                    sarah, 24
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
