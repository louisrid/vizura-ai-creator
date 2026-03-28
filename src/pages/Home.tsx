import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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

  const handleCreate = () => {
    if (!user) {
      navigate("/auth?redirect=/");
      return;
    }
    navigate("/create-character");
  };

  return (
    <div
      className="flex flex-col bg-background overflow-y-auto"
      style={{ height: "calc(100dvh - 73px)" }}
    >
      <div className="flex flex-col gap-4 px-5 pt-8 pb-6">
        {/* Create character box + button — centered */}
        <div className="flex flex-col items-center w-full gap-3">
          <div
            className="flex items-center justify-center border-[6px] border-foreground bg-card"
            style={{ width: "70%", aspectRatio: "4/4", borderRadius: 14 }}
          >
            <Sparkles size={28} strokeWidth={2.5} className="text-foreground/20" />
          </div>

          <button
            onClick={handleCreate}
            className="flex h-[48px] items-center justify-center gap-1.5 bg-foreground text-sm font-[900] lowercase tracking-tight text-background transition-transform active:scale-[0.97]"
            style={{ width: "70%", borderRadius: 14, transition: "transform 0.05s" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <circle cx="12" cy="9" r="4.5" />
              <path d="M4 22a8 8 0 0 1 16 0c0 .6-.4 1-1 1H5a1 1 0 0 1-1-1Z" />
            </svg>
            create+
          </button>
        </div>

        {/* Stacked setting cards — same 70% width, centered */}
        <div className="flex flex-col gap-2.5 items-center w-full">
          {quickOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                const choices = opt.choices as readonly string[];
                const currentIdx = selections[opt.key] ? choices.indexOf(selections[opt.key]!) : -1;
                const nextIdx = (currentIdx + 1) % choices.length;
                setSelections((prev) => ({ ...prev, [opt.key]: choices[nextIdx] }));
              }}
              className="flex items-center justify-between rounded-2xl border-[6px] border-foreground bg-card px-4 h-[48px]"
              style={{ width: "70%" }}
            >
              <span className="text-[13px] font-extrabold lowercase text-foreground">{opt.label}</span>
              <span className="text-[13px] font-bold lowercase text-foreground/40">
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
