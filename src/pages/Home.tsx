import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import CharacterCreatorOverlay from "@/components/CharacterCreatorOverlay";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creatorOpen, setCreatorOpen] = useState(false);

  const handleCreate = () => {
    if (!user) {
      navigate("/auth?redirect=/");
      return;
    }
    setCreatorOpen(true);
  };

  return (
    <div
      className="flex flex-col bg-background"
      style={{ height: "calc(100dvh - 73px)" }}
    >
      {/* Photo preview box — 4:5 ratio, left-aligned */}
      <div className="flex-1 flex items-start px-4 pt-4 pb-3">
        <div
          className="flex items-center justify-center rounded-2xl border-[6px] border-foreground bg-card"
          style={{ aspectRatio: "4/5", height: "100%", maxHeight: "100%" }}
        >
          <Wand2 size={28} className="text-foreground/20" />
        </div>
      </div>

      {/* Create+ pill button — hugs text width */}
      <div className="shrink-0 flex justify-start px-4 pb-5">
        <button
          onClick={handleCreate}
          className="flex h-[56px] items-center justify-center gap-2 rounded-full bg-foreground px-10 text-[1.2rem] font-[900] lowercase tracking-tight text-background transition-transform active:scale-[0.97]"
          style={{ transition: "transform 0.05s" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
            <circle cx="12" cy="9" r="4.5" />
            <path d="M4 22a8 8 0 0 1 16 0c0 .6-.4 1-1 1H5a1 1 0 0 1-1-1Z" />
          </svg>
          create+
        </button>
      </div>

      <CharacterCreatorOverlay open={creatorOpen} onClose={() => setCreatorOpen(false)} />
    </div>
  );
};

export default Home;
