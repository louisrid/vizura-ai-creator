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

/* ── Pill select ── */
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
  <div className="flex flex-col gap-1.5">
    <button
      onClick={onToggle}
      className={`flex h-10 items-center justify-between rounded-full border-[4px] px-4 text-xs font-[900] lowercase transition-colors ${
        expanded
          ? "border-neon-yellow bg-foreground text-background"
          : "border-border bg-card text-foreground"
      }`}
    >
      <span>{value || "–"}</span>
      <ChevronDown
        size={12}
        strokeWidth={3}
        className={`transition-transform ${expanded ? "rotate-180" : ""}`}
      />
    </button>
    <AnimatePresence>
      {expanded && (
        <motion.div
          className="flex flex-wrap gap-1.5"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
        >
          {choices.map((c) => (
            <button
              key={c}
              onClick={() => onSelect(c)}
              className={`rounded-full border-[3px] px-3 py-1 text-[10px] font-[900] lowercase transition-all ${
                value === c
                  ? "border-neon-yellow bg-neon-yellow text-neon-yellow-foreground"
                  : "border-border text-foreground/60 hover:border-foreground/40"
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
      {/* Main content area */}
      <div className="flex-1 flex gap-3 px-6 pt-6">
        {/* Left: photo box + button */}
        <div className="flex flex-col" style={{ width: "55%" }}>
          <div
            className="flex items-center justify-center rounded-2xl border-[6px] border-foreground bg-card"
            style={{ aspectRatio: "4/5" }}
          >
            <Wand2 size={28} className="text-foreground/20" />
          </div>

          <button
            onClick={handleCreate}
            className="mt-3 flex h-[46px] w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-[900] lowercase tracking-tight text-background transition-transform active:scale-[0.97]"
            style={{ transition: "transform 0.05s" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <circle cx="12" cy="9" r="4.5" />
              <path d="M4 22a8 8 0 0 1 16 0c0 .6-.4 1-1 1H5a1 1 0 0 1-1-1Z" />
            </svg>
            create+
          </button>
        </div>

        {/* Right: 3 pill selectors stacked */}
        <div className="grid grid-cols-2 gap-2 pt-1" style={{ width: "42%" }}>
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
