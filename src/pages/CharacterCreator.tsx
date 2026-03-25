import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Zap, RotateCcw, Wand2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PaywallOverlay from "@/components/PaywallOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";

import charFront from "@/assets/character-front.png";
import charLeft from "@/assets/character-left.png";
import charRight from "@/assets/character-right.png";

const placeholders = [charFront, charLeft, charRight];
const angleLabels = ["front", "left", "right"];

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
const outfitStyles = ["casual", "formal", "sporty", "fantasy"];
const ageRanges = ["teen", "young adult", "adult"];

const CharacterCreator = () => {
  const { user } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();

  const [hair, setHair] = useState(1);
  const [eye, setEye] = useState(0);
  const [skin, setSkin] = useState(1);
  const [body, setBody] = useState(1);
  const [outfit, setOutfit] = useState(0);
  const [age, setAge] = useState(1);
  const [extra, setExtra] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [swipeIndex, setSwipeIndex] = useState(0);

  const hasGen = generated.length > 0;
  const imgs = hasGen ? generated : placeholders;

  const buildPrompt = (refine?: boolean) => {
    let p = `photorealistic portrait, ${ageRanges[age]}, ${bodyTypes[body]} build, ${skinTones[skin].l} skin, ${hairColours[hair].l} hair, ${eyeColours[eye].l} eyes, ${outfitStyles[outfit]} outfit`;
    if (extra.trim()) p += `, ${extra.trim()}`;
    p += ", professional photography, natural lighting, shallow depth of field, hyperdetailed";
    if (refine) p += ", subtle variation, keep same overall appearance";
    return p;
  };

  const generate = async (refine = false) => {
    if (!user) { navigate("/auth"); return; }
    if (credits <= 0) { setShowPaywall(true); return; }
    setIsGenerating(true);
    setError("");
    try {
      const { data, error: e } = await supabase.functions.invoke("generate", { body: { prompt: buildPrompt(refine) } });
      if (e) throw e;
      if (data?.error) throw new Error(data.error);
      setGenerated(data.images || []);
      await refetchCredits();
    } catch (e: any) {
      if (e.message?.includes("No credits") || e.message?.includes("402")) setShowPaywall(true);
      else setError(e.message || "failed");
    } finally { setIsGenerating(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-10">
        {/* 1. Instruction */}
        <p className="text-xs font-bold lowercase text-muted-foreground text-center mb-3">
          pick a style, tweak the details, hit generate
        </p>

        {/* 2. Results — 3 images side by side (desktop) / swipeable (mobile) */}
        <div className="mb-3">
          {/* Desktop: 3 across */}
          <div className="hidden sm:grid grid-cols-3 gap-2">
            {imgs.map((src, i) => (
              <ResultImage key={i} src={src} label={angleLabels[i]} isPlaceholder={!hasGen} />
            ))}
          </div>
          {/* Mobile: swipeable */}
          <div className="sm:hidden">
            <div
              className="overflow-x-auto snap-x snap-mandatory flex gap-2 scrollbar-hide"
              onScroll={(e) => {
                const el = e.currentTarget;
                const idx = Math.round(el.scrollLeft / el.clientWidth);
                setSwipeIndex(idx);
              }}
            >
              {imgs.map((src, i) => (
                <div key={i} className="snap-center shrink-0 w-[75%]">
                  <ResultImage src={src} label={angleLabels[i]} isPlaceholder={!hasGen} />
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-1.5 mt-2">
              {angleLabels.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === swipeIndex ? "w-5 bg-foreground" : "w-1.5 bg-foreground/20"}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Post-gen actions + credits */}
        <div className="flex items-center gap-2 mb-4">
          {hasGen ? (
            <>
              <Button variant="outline" size="sm" className="flex-1 rounded-xl border-2 h-10 text-xs" onClick={() => generate(false)} disabled={isGenerating}>
                <RotateCcw size={14} strokeWidth={2.5} /> continue
              </Button>
              <Button variant="outline" size="sm" className="flex-1 rounded-xl border-2 h-10 text-xs" onClick={() => generate(true)} disabled={isGenerating}>
                <Wand2 size={14} strokeWidth={2.5} /> refine this
              </Button>
            </>
          ) : (
            <div className="flex-1" />
          )}
          {user && (
            <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground lowercase shrink-0">
              <Sparkles size={12} className="text-accent-purple" />
              {credits}
            </div>
          )}
        </div>

        {/* 3. Controls — compact */}
        <div className="space-y-3">
          {/* Hair + Eye on same row */}
          <div className="grid grid-cols-2 gap-3">
            <MiniPalette label="hair" items={hairColours} active={hair} onSelect={setHair} />
            <MiniPalette label="eyes" items={eyeColours} active={eye} onSelect={setEye} />
          </div>

          {/* Skin tone */}
          <MiniPalette label="skin tone" items={skinTones} active={skin} onSelect={setSkin} />

          {/* Body type */}
          <ToggleRow label="body" options={bodyTypes} active={body} onSelect={setBody} />

          {/* Outfit */}
          <ToggleRow label="outfit" options={outfitStyles} active={outfit} onSelect={setOutfit} />

          {/* Age */}
          <ToggleRow label="age" options={ageRanges} active={age} onSelect={setAge} />
        </div>

        {/* 4. Extra detail */}
        <input
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="tattoos, freckles, glasses…"
          className="w-full border-2 border-border bg-background text-foreground px-3 py-2.5 text-xs font-bold lowercase placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 rounded-xl mt-3 transition-colors"
        />

        {error && (
          <div className="border border-destructive/30 bg-destructive/5 p-2.5 text-destructive font-bold lowercase text-xs rounded-xl mt-3">
            {error}
          </div>
        )}

        {/* 5. Generate button */}
        <Button
          variant="hero"
          className="w-full h-14 text-base rounded-2xl mt-4"
          onClick={() => generate(false)}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <><Loader2 className="animate-spin" size={20} strokeWidth={2.5} />generating…</>
          ) : (
            <><Zap size={20} strokeWidth={2.5} />generate</>
          )}
        </Button>

        {/* 6. Collapsible guide */}
        <div className="mt-4 border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setGuideOpen(!guideOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-extrabold lowercase text-muted-foreground hover:text-foreground transition-colors"
          >
            full guide for first-timers
            {guideOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <AnimatePresence>
            {guideOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 text-xs font-semibold lowercase text-muted-foreground space-y-2.5">
                  <GuideItem title="hair & eyes" text="tap a colour swatch to set hair or eye colour. the character preview updates after you generate." />
                  <GuideItem title="skin tone" text="choose a skin tone from the palette. works the same as hair/eye selection." />
                  <GuideItem title="body type" text="slim, regular, or curvy — affects the overall build of the generated character." />
                  <GuideItem title="outfit" text="casual = everyday clothes. formal = suits/dresses. sporty = athletic wear. fantasy = armour, capes, etc." />
                  <GuideItem title="age" text="teen = ~16-19. young adult = ~20-30. adult = ~30-45." />
                  <GuideItem title="extra detail" text="add anything else — tattoos, freckles, glasses, scars, specific hairstyles, backgrounds." />
                  <GuideItem title="continue vs refine" text="continue = completely new look with same settings. refine = tiny tweaks to the current result." />
                  <GuideItem title="tips" text="start simple, then add detail. 'red hair, green eyes, freckles' works great. you don't need full sentences." />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const ResultImage = ({ src, label, isPlaceholder }: { src: string; label: string; isPlaceholder: boolean }) => (
  <div className={`relative rounded-xl overflow-hidden border border-border shadow-soft ${isPlaceholder ? "opacity-60" : ""}`}>
    <img src={src} alt={label} className="w-full aspect-[3/4] object-cover" />
    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/40 to-transparent px-2.5 pb-2 pt-6">
      <span className="text-white font-extrabold lowercase text-[11px]">{label}</span>
    </div>
  </div>
);

const MiniPalette = ({ label, items, active, onSelect }: { label: string; items: { l: string; v: string }[]; active: number; onSelect: (i: number) => void }) => (
  <div>
    <span className="block text-[10px] font-extrabold lowercase text-muted-foreground mb-1.5">{label}</span>
    <div className="flex gap-1.5">
      {items.map((c, i) => (
        <button
          key={c.l}
          onClick={() => onSelect(i)}
          title={c.l}
          className={`w-8 h-8 rounded-lg border-2 transition-all ${
            i === active ? "border-foreground scale-110 shadow-soft" : "border-border hover:border-foreground/30"
          }`}
          style={{ backgroundColor: c.v }}
        />
      ))}
    </div>
  </div>
);

const ToggleRow = ({ label, options, active, onSelect }: { label: string; options: string[]; active: number; onSelect: (i: number) => void }) => (
  <div>
    <span className="block text-[10px] font-extrabold lowercase text-muted-foreground mb-1.5">{label}</span>
    <div className="flex gap-1.5">
      {options.map((o, i) => (
        <button
          key={o}
          onClick={() => onSelect(i)}
          className={`flex-1 py-2 rounded-xl font-extrabold lowercase text-xs border-2 transition-all ${
            i === active ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground/30"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  </div>
);

const GuideItem = ({ title, text }: { title: string; text: string }) => (
  <div>
    <span className="font-extrabold text-foreground">{title}:</span> {text}
  </div>
);

export default CharacterCreator;
