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
      {/* Photo preview box */}
      <div className="px-4 pt-4 pb-3">
        <div
          className="flex items-center justify-center rounded-2xl border-[6px] border-foreground bg-card"
          style={{ width: "48%", height: "calc((100dvh - 73px) * 0.37)" }}
        >
          <Wand2 size={28} className="text-foreground/20" />
        </div>
      </div>

      {/* Create+ pill button */}
      <div className="shrink-0 px-4 pb-5">
        <button
          onClick={handleCreate}
          className="flex h-[58px] w-full items-center justify-center gap-2 rounded-full bg-foreground text-[1.25rem] font-[900] lowercase tracking-tight text-background transition-transform active:scale-[0.97]"
          style={{ transition: "transform 0.05s" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
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
