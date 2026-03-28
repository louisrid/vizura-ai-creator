import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import CharacterCreatorOverlay from "@/components/CharacterCreatorOverlay";

const quickOptions = [
  { key: "style", label: "style ✨", choices: ["natural", "model", "egirl"] },
  { key: "hair", label: "hair 💇", choices: ["blonde", "brunette", "black", "red", "pink", "white"] },
  { key: "eyes", label: "eyes 👁", choices: ["brown", "blue", "green", "hazel", "grey"] },
  { key: "body", label: "body 🧍", choices: ["slim", "regular", "curvy"] },
  { key: "age", label: "age 🎂", choices: ["18","20","22","25","28","30","35","40"] },
  { key: "ethnicity", label: "ethnicity 🌍", choices: ["any","american","british","brazilian","french","indian","italian","japanese","korean","spanish"] },
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
  <label className="relative flex flex-col gap-0.5">
    <span className="text-[8px] font-bold lowercase text-white">{label}</span>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-full appearance-none rounded-md border-[2px] border-white/40 bg-[hsl(0,0%,20%)] px-2 text-[9px] font-semibold lowercase text-white outline-none transition-colors focus:border-white"
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
      className="flex flex-col bg-background overflow-y-auto"
      style={{ height: "calc(100dvh - 73px)" }}
    >
      <div className="flex flex-col gap-3 px-5 pt-5 pb-6">
        {/* Image box + create button — centered, original 1:1 shape */}
        <div className="flex flex-col items-center w-full">
          <div
            className="flex items-center justify-center border-[4px] border-foreground bg-card"
            style={{ width: "65%", aspectRatio: "1/1", borderRadius: 14 }}
          >
            <Wand2 size={28} className="text-foreground/20" />
          </div>

          <button
            onClick={handleCreate}
            className="mt-2.5 flex h-[44px] items-center justify-center gap-1.5 bg-foreground text-xs font-[900] lowercase tracking-tight text-background transition-transform active:scale-[0.97]"
            style={{ width: "65%", borderRadius: 14, transition: "transform 0.05s" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <circle cx="12" cy="9" r="4.5" />
              <path d="M4 22a8 8 0 0 1 16 0c0 .6-.4 1-1 1H5a1 1 0 0 1-1-1Z" />
            </svg>
            create+
          </button>
        </div>

        {/* Stacked setting cards */}
        <div className="flex flex-col gap-2">
          {quickOptions.map((opt) => (
            <label
              key={opt.key}
              className="flex items-center justify-between rounded-xl border-[2px] border-white/30 bg-[hsl(0,0%,12%)] px-4 h-[42px]"
            >
              <span className="text-[11px] font-bold lowercase text-white">{opt.label}</span>
              <select
                value={selections[opt.key] || ""}
                onChange={(e) => setSelections((prev) => ({ ...prev, [opt.key]: e.target.value }))}
                className="appearance-none bg-transparent text-[11px] font-semibold lowercase text-white/60 outline-none text-right cursor-pointer"
                style={{ WebkitAppearance: "none" }}
              >
                <option value="" disabled className="bg-black text-white">select</option>
                {opt.choices.map((c) => (
                  <option key={c} value={c} className="bg-black text-white">{c}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <CharacterCreatorOverlay open={creatorOpen} onClose={() => setCreatorOpen(false)} />
    </div>
  );
};

export default Home;
