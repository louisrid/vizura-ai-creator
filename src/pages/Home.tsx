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
      {/* Photo preview box + button — slightly off-center left, pushed down */}
      <div className="flex-1 flex flex-col items-start px-4 pt-8" style={{ paddingLeft: "15%" }}>
        <div
          className="flex items-center justify-center rounded-2xl border-[6px] border-foreground bg-card"
          style={{ aspectRatio: "4/5", width: "55%", maxHeight: "calc((100dvh - 73px) * 0.50)" }}
        >
          <Wand2 size={28} className="text-foreground/20" />
        </div>

        {/* Create+ button — same width as image */}
        <button
          onClick={handleCreate}
          className="mt-3 flex h-[60px] items-center justify-center gap-2.5 rounded-full bg-foreground text-[1.25rem] font-[900] lowercase tracking-tight text-background transition-transform active:scale-[0.97]"
          style={{ width: "55%", transition: "transform 0.05s" }}
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
