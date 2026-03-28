import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import IntroSequence from "@/components/IntroSequence";
import CharacterCreatorOverlay from "@/components/CharacterCreatorOverlay";

const quickOptions = [
  { key: "style", label: "style ✨", choices: ["natural", "model", "egirl"] },
  { key: "hair", label: "hair 💇", choices: ["blonde", "brunette", "black", "red", "pink", "white"] },
  { key: "body", label: "body 🧍", choices: ["slim", "regular", "curvy"] },
] as const;

type OptKey = "style" | "hair" | "body";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selections, setSelections] = useState<Record<OptKey, string | null>>({
    style: null, hair: null, body: null,
  });
  const [showCreator, setShowCreator] = useState(false);

  // Auto-play intro on first page load (once per session)
  const shouldAutoPlay = !sessionStorage.getItem("intro_seen");
  const [showIntro, setShowIntro] = useState(shouldAutoPlay);

  const handleCreate = () => {
    if (!user) {
      setShowIntro(true);
      return;
    }
    if (!sessionStorage.getItem("intro_seen")) {
      setShowIntro(true);
    } else {
      setShowCreator(true);
    }
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
    sessionStorage.setItem("intro_seen", "1");
    if (!user) {
      navigate("/auth?redirect=/");
      return;
    }
    setShowCreator(true);
  };

  return (
    <div
      className="flex flex-col bg-background overflow-y-auto"
      style={{ height: "calc(100dvh - 73px)" }}
    >
      <IntroSequence open={showIntro} onComplete={handleIntroComplete} />
      <CharacterCreatorOverlay open={showCreator} onClose={() => setShowCreator(false)} />

      <div className="flex flex-col gap-5 px-5 pt-24 pb-10">
        {/* Create character box + button — centered */}
        <div className="flex flex-col items-center w-full gap-4">
          <div
            className="flex items-center justify-center border-[6px] border-foreground bg-card"
            style={{ width: "85%", aspectRatio: "1/1", borderRadius: 18 }}
          >
            <Sparkles size={36} strokeWidth={2.5} className="text-foreground/20" />
          </div>

          <button
            onClick={handleCreate}
            className="flex h-[58px] items-center justify-center gap-2 bg-foreground text-base font-[900] lowercase tracking-tight text-background transition-transform active:scale-[0.97]"
            style={{ width: "85%", borderRadius: 18, transition: "transform 0.05s" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <circle cx="12" cy="9" r="4.5" />
              <path d="M4 22a8 8 0 0 1 16 0c0 .6-.4 1-1 1H5a1 1 0 0 1-1-1Z" />
            </svg>
            create+
          </button>
        </div>

        {/* Stacked setting cards */}
        <div className="flex flex-col gap-3 items-center w-full">
          {quickOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                const choices = opt.choices as readonly string[];
                const currentIdx = selections[opt.key] ? choices.indexOf(selections[opt.key]!) : -1;
                const nextIdx = (currentIdx + 1) % choices.length;
                setSelections((prev) => ({ ...prev, [opt.key]: choices[nextIdx] }));
              }}
              className="flex items-center justify-between rounded-2xl border-[6px] border-foreground bg-card px-5 h-[56px]"
              style={{ width: "85%" }}
            >
              <span className="text-[15px] font-extrabold lowercase text-foreground">{opt.label}</span>
              <span className="text-[15px] font-bold lowercase text-foreground/40">
                {selections[opt.key] || "–"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
