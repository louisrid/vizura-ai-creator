import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import CharacterCreatorOverlay from "@/components/CharacterCreatorOverlay";

const quickOptions = [
  { key: "style", label: "style", choices: ["natural", "model", "egirl"] },
  { key: "hair", label: "hair", choices: ["blonde", "brunette", "black", "red", "pink", "white"] },
  { key: "eyes", label: "eyes", choices: ["brown", "blue", "green", "hazel", "grey"] },
  { key: "body", label: "body", choices: ["slim", "regular", "curvy"] },
  { key: "age", label: "age", choices: ["18","20","22","25","28","30","35","40"] },
  { key: "ethnicity", label: "ethnicity", choices: ["any","american","british","brazilian","french","indian","italian","japanese","korean","spanish"] },
] as const;

type OptKey = "style" | "hair" | "eyes" | "body" | "age" | "ethnicity";

/* ── Pill select — wide sausage shape ── */
const PillSelect = ({
  value,
  choices,
  expanded,
  onToggle,
  onSelect,
}: {
  value: string | null;
  choices: readonly string[];
  expanded: boolean;
  onToggle: () => void;
  onSelect: (v: string) => void;
}) => (
  <div className="flex flex-col gap-1">
    <button
      onClick={onToggle}
      className={`flex h-7 w-full items-center justify-between rounded-full px-3 text-[9px] font-[900] lowercase transition-colors ${
        expanded
          ? "bg-[hsl(0,0%,28%)] text-white"
          : "bg-[hsl(0,0%,18%)] text-white/60"
      }`}
    >
      <span>{value || "–"}</span>
      <ChevronDown
        size={9}
        strokeWidth={3}
        className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
      />
    </button>
    <AnimatePresence>
      {expanded && (
        <motion.div
          className="flex flex-wrap gap-1"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.12 }}
        >
          {choices.map((c) => (
            <button
              key={c}
              onClick={() => onSelect(c)}
              className={`rounded-full px-2.5 py-0.5 text-[8px] font-[900] lowercase transition-all ${
                value === c
                  ? "bg-neon-yellow text-neon-yellow-foreground"
                  : "bg-white/10 text-white/50 hover:bg-white/20"
              }`}
            >
              {c}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [selections, setSelections] = useState<Record<OptKey, string | null>>({
    style: null,
    hair: null,
    eyes: null,
    body: null,
    age: null,
    ethnicity: null,
  });
  const [expandedKey, setExpandedKey] = useState<OptKey | null>(null);

  const handleCreate = () => {
    if (!user) {
      navigate("/auth?redirect=/");
      return;
    }
    setCreatorOpen(true);
  };

  const handleSelect = (key: OptKey, val: string) => {
    setSelections((prev) => ({ ...prev, [key]: val }));
    setExpandedKey(null);
  };

  return (
    <div
      className="flex flex-col bg-background"
      style={{ height: "calc(100dvh - 73px)" }}
    >
      <div className="flex-1 flex gap-4 px-5 pt-5">
        {/* Left: photo box + button */}
        <div className="flex flex-col" style={{ width: "48%" }}>
          <div
            className="flex items-center justify-center border-[6px] border-foreground bg-card"
            style={{ aspectRatio: "1/1", borderRadius: 14 }}
          >
            <Wand2 size={24} className="text-foreground/20" />
          </div>

          <button
            onClick={handleCreate}
            className="mt-2.5 flex h-[40px] w-full items-center justify-center gap-1.5 bg-foreground text-xs font-[900] lowercase tracking-tight text-background transition-transform active:scale-[0.97]"
            style={{ borderRadius: 14, transition: "transform 0.05s" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <circle cx="12" cy="9" r="4.5" />
              <path d="M4 22a8 8 0 0 1 16 0c0 .6-.4 1-1 1H5a1 1 0 0 1-1-1Z" />
            </svg>
            create+
          </button>
        </div>

        {/* Right: 6 sausage pill selectors in black rounded box */}
        <div
          className="flex flex-col gap-1.5 self-start bg-black p-3"
          style={{ width: "48%", borderRadius: 14 }}
        >
          {quickOptions.map((opt) => (
            <PillSelect
              key={opt.key}
              value={selections[opt.key]}
              choices={opt.choices}
              expanded={expandedKey === opt.key}
              onToggle={() => setExpandedKey((prev) => (prev === opt.key ? null : opt.key))}
              onSelect={(v) => handleSelect(opt.key, v)}
            />
          ))}
        </div>
      </div>

      <CharacterCreatorOverlay open={creatorOpen} onClose={() => setCreatorOpen(false)} />
    </div>
  );
};

export default Home;
