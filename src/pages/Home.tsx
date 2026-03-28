import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import CharacterCreatorOverlay from "@/components/CharacterCreatorOverlay";

const quickOptions = [
  { key: "style", label: "✨ style", choices: ["natural", "model", "egirl"] },
  { key: "hair", label: "💇 hair", choices: ["blonde", "brunette", "black", "red", "pink", "white"] },
  { key: "eyes", label: "👁 eyes", choices: ["brown", "blue", "green", "hazel", "grey"] },
  { key: "body", label: "🧍 body", choices: ["slim", "regular", "curvy"] },
  { key: "age", label: "🎂 age", choices: ["18","20","22","25","28","30","35","40"] },
  { key: "ethnicity", label: "🌍 ethnicity", choices: ["any","american","british","brazilian","french","indian","italian","japanese","korean","spanish"] },
] as const;

type OptKey = "style" | "hair" | "eyes" | "body" | "age" | "ethnicity";

/* ── Native select pill ── */
const NativePill = ({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string | null;
  choices: readonly string[];
  onChange: (v: string) => void;
}) => (
  <label className="relative flex flex-col gap-1">
    <span className="text-[9px] font-[900] lowercase text-white/70">{label}</span>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-full appearance-none rounded-lg border-[2px] border-white/40 bg-[hsl(0,0%,20%)] px-2.5 text-[10px] font-[900] lowercase text-white outline-none transition-colors focus:border-white"
      style={{ WebkitAppearance: "none" }}
    >
      <option value="" disabled className="bg-black text-white">–</option>
      {choices.map((c) => (
        <option key={c} value={c} className="bg-black text-white">{c}</option>
      ))}
    </select>
  </label>
);

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [selections, setSelections] = useState<Record<OptKey, string | null>>({
    style: null, hair: null, eyes: null, body: null, age: null, ethnicity: null,
  });

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

        {/* Right: 3x2 grid of native selects in black box */}
        <div
          className="grid grid-cols-2 gap-x-2 gap-y-2.5 self-start bg-black p-3"
          style={{ width: "48%", borderRadius: 14 }}
        >
          {quickOptions.map((opt) => (
            <NativePill
              key={opt.key}
              label={opt.label}
              value={selections[opt.key]}
              choices={opt.choices}
              onChange={(v) => setSelections((prev) => ({ ...prev, [opt.key]: v }))}
            />
          ))}
        </div>
      </div>

      <CharacterCreatorOverlay open={creatorOpen} onClose={() => setCreatorOpen(false)} />
    </div>
  );
};

export default Home;
