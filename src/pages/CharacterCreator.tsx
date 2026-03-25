import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Zap, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import PaywallOverlay from "@/components/PaywallOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";

import charFront from "@/assets/character-front.png";
import charLeft from "@/assets/character-left.png";
import charRight from "@/assets/character-right.png";

const placeholders = [charFront, charLeft, charRight];

const hairColours = [
  { l: "black", v: "#1a1a1a" }, { l: "brown", v: "#8B4513" }, { l: "blonde", v: "#F4D03F" },
  { l: "red", v: "#C0392B" }, { l: "pink", v: "#E91E9C" }, { l: "white", v: "#E8E8E8" },
];
const eyeColours = [
  { l: "brown", v: "#6B3A2A" }, { l: "blue", v: "#2E86DE" }, { l: "green", v: "#27AE60" },
  { l: "hazel", v: "#B7950B" }, { l: "grey", v: "#95A5A6" },
];
const skinTones = [
  { l: "light", v: "#FDEBD0" }, { l: "medium", v: "#D4A574" }, { l: "tan", v: "#B07C4B" },
  { l: "brown", v: "#8D5524" }, { l: "dark", v: "#5C3A1E" },
];
const bodyTypes = ["slim", "regular", "curvy"];

const CharacterCreator = () => {
  const { user } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editPrompt = searchParams.get("edit");

  const [hair, setHair] = useState(1);
  const [eye, setEye] = useState(0);
  const [skin, setSkin] = useState(1);
  const [body, setBody] = useState(1);
  const [extra, setExtra] = useState(editPrompt || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const hasGen = generated.length > 0;
  const imgs = hasGen ? generated : placeholders;

  const buildPrompt = () => {
    let p = `photorealistic portrait, young woman, ${bodyTypes[body]} build, ${skinTones[skin].l} skin, ${hairColours[hair].l} hair, ${eyeColours[eye].l} eyes`;
    if (extra.trim()) p += `, ${extra.trim()}`;
    p += ", professional photography, natural lighting, shallow depth of field, hyperdetailed, instagram aesthetic";
    return p;
  };

  const generate = async () => {
    if (!user) { navigate("/auth"); return; }
    if (credits <= 0) { setShowPaywall(true); return; }
    setIsGenerating(true);
    setError("");
    try {
      const { data, error: e } = await supabase.functions.invoke("generate", { body: { prompt: buildPrompt() } });
      if (e) throw e;
      if (data?.error) throw new Error(data.error);
      setGenerated(data.images || []);
      setActiveIndex(0);
      await refetchCredits();
    } catch (e: any) {
      if (e.message?.includes("No credits") || e.message?.includes("402")) setShowPaywall(true);
      else setError(e.message || "failed");
    } finally { setIsGenerating(false); }
  };

  const prev = () => setActiveIndex((i) => (i === 0 ? imgs.length - 1 : i - 1));
  const next = () => setActiveIndex((i) => (i === imgs.length - 1 ? 0 : i + 1));

  const getImageStyle = (i: number) => {
    const diff = i - activeIndex;
    const normalized = ((diff % 3) + 3) % 3;
    if (normalized === 0) return "z-20 scale-100 opacity-100 translate-x-0";
    if (normalized === 1) return "z-10 scale-[0.82] opacity-60 translate-x-[55%]";
    return "z-10 scale-[0.82] opacity-60 -translate-x-[55%]";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <PageTransition>
        <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-10">

          {/* Image viewer — all 3 visible, center large */}
          <div className="relative w-full aspect-[4/5] mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              {imgs.map((src, i) => (
                <div
                  key={i}
                  className={`absolute w-[60%] aspect-[3/4] rounded-xl overflow-hidden transition-all duration-300 ease-out ${getImageStyle(i)} ${!hasGen ? "opacity-50" : ""}`}
                >
                  <img
                    src={src}
                    alt=""
                    className={`w-full h-full object-cover ${isGenerating && !hasGen ? "animate-pulse" : ""}`}
                    width={512}
                    height={680}
                  />
                </div>
              ))}
            </div>

            {/* Navigation arrows */}
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-xl bg-foreground/80 flex items-center justify-center text-background hover:bg-foreground transition-colors"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-xl bg-foreground/80 flex items-center justify-center text-background hover:bg-foreground transition-colors"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Credits badge */}
          {user && (
            <div className="flex items-center justify-end gap-1 text-[10px] font-extrabold text-muted-foreground lowercase mb-6">
              <Sparkles size={12} className="text-accent-purple" />
              {credits} credit{credits !== 1 ? "s" : ""}
            </div>
          )}

          {/* Controls */}
          <div className="space-y-6">
            <Palette label="hair colour" items={hairColours} active={hair} onSelect={setHair} />
            <Palette label="eye colour" items={eyeColours} active={eye} onSelect={setEye} />
            <Palette label="skin tone" items={skinTones} active={skin} onSelect={setSkin} />
            <ToggleRow label="body type" options={bodyTypes} active={body} onSelect={setBody} />

            {/* Extra detail */}
            <div>
              <span className="block text-xs font-extrabold lowercase text-muted-foreground mb-2">extra detail</span>
              <input
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="tattoos, freckles, glasses…"
                className="w-full border-2 border-border bg-background text-foreground px-4 py-3.5 text-sm font-extrabold lowercase placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 rounded-xl transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="border-2 border-destructive/30 bg-destructive/5 p-3 text-destructive font-extrabold lowercase text-xs rounded-xl mt-6">
              {error}
            </div>
          )}

          {/* Generate button */}
          <Button
            className="w-full h-14 mt-6 text-sm"
            onClick={generate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><Loader2 className="animate-spin" size={16} />generating…</>
            ) : (
              <><Zap size={16} strokeWidth={2.5} />generate</>
            )}
          </Button>
        </main>
      </PageTransition>
    </div>
  );
};

/* ── Sub-components ── */

const Palette = ({ label, items, active, onSelect }: { label: string; items: { l: string; v: string }[]; active: number; onSelect: (i: number) => void }) => (
  <div>
    <span className="block text-xs font-extrabold lowercase text-muted-foreground mb-2">{label}</span>
    <div className="flex gap-2">
      {items.map((c, i) => (
        <button
          key={c.l}
          onClick={() => onSelect(i)}
          title={c.l}
          className={`w-11 h-11 rounded-xl border-2 transition-all ${
            i === active ? "border-foreground scale-110 shadow-md" : "border-border hover:border-foreground/30"
          }`}
          style={{ backgroundColor: c.v }}
        />
      ))}
    </div>
  </div>
);

const ToggleRow = ({ label, options, active, onSelect }: { label: string; options: string[]; active: number; onSelect: (i: number) => void }) => (
  <div>
    <span className="block text-xs font-extrabold lowercase text-muted-foreground mb-2">{label}</span>
    <div className="flex gap-2">
      {options.map((o, i) => (
        <button
          key={o}
          onClick={() => onSelect(i)}
          className={`flex-1 py-3.5 rounded-xl font-extrabold lowercase text-sm border-2 transition-all ${
            i === active ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground/30"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  </div>
);

export default CharacterCreator;
