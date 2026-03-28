import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

      <div className="flex flex-col gap-4 px-5 pt-8 pb-10">
        {/* Create character box + button */}
        <div className="flex flex-col items-center w-full gap-4">
          <motion.div
            className="flex items-center justify-center border-[6px] border-foreground bg-card"
            style={{ width: "85%", aspectRatio: "1/1", borderRadius: 18 }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 25 }}
          >
            <motion.span
              className="text-5xl"
              animate={{ scale: [1, 1.12, 1], rotate: [0, 6, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              ✨
            </motion.span>
          </motion.div>

          <motion.button
            onClick={handleCreate}
            className="flex h-[58px] items-center justify-center gap-2 bg-foreground text-base font-[900] lowercase tracking-tight text-background"
            style={{ width: "85%", borderRadius: 18 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3, type: "spring", stiffness: 250, damping: 25 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <circle cx="12" cy="9" r="4.5" />
              <path d="M4 22a8 8 0 0 1 16 0c0 .6-.4 1-1 1H5a1 1 0 0 1-1-1Z" />
            </svg>
            create+
          </motion.button>
        </div>

        {/* Setting cards */}
        <div className="flex flex-col gap-3 items-center w-full">
          {quickOptions.map((opt, i) => (
            <motion.button
              key={opt.key}
              onClick={() => {
                const choices = opt.choices as readonly string[];
                const currentIdx = selections[opt.key] ? choices.indexOf(selections[opt.key]!) : -1;
                const nextIdx = (currentIdx + 1) % choices.length;
                setSelections((prev) => ({ ...prev, [opt.key]: choices[nextIdx] }));
              }}
              className="flex items-center justify-between rounded-2xl border-[6px] border-foreground bg-card px-5 h-[56px]"
              style={{ width: "85%" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.3, type: "spring", stiffness: 250, damping: 25 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-[15px] font-extrabold lowercase text-foreground">{opt.label}</span>
              <span className="text-[15px] font-bold lowercase text-foreground/40">
                {selections[opt.key] || "–"}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
