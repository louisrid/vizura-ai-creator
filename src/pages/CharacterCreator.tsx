import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Zap, RotateCcw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PaywallOverlay from "@/components/PaywallOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";

import charFront from "@/assets/character-front.png";
import charLeft from "@/assets/character-left.png";
import charRight from "@/assets/character-right.png";

const placeholderImages = [charFront, charLeft, charRight];
const angleLabels = ["front", "left", "right"];

const hairColours = [
  { label: "black", value: "#1a1a1a" },
  { label: "brown", value: "#8B4513" },
  { label: "blonde", value: "#F4D03F" },
  { label: "red", value: "#C0392B" },
  { label: "pink", value: "#E91E9C" },
  { label: "white", value: "#E8E8E8" },
];

const bodyTypes = [
  { label: "slim", value: "slim" },
  { label: "regular", value: "regular" },
  { label: "curvy", value: "curvy" },
];

const eyeColours = [
  { label: "brown", value: "#6B3A2A" },
  { label: "blue", value: "#2E86DE" },
  { label: "green", value: "#27AE60" },
  { label: "hazel", value: "#B7950B" },
  { label: "grey", value: "#95A5A6" },
];

const CharacterCreator = () => {
  const { user } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();

  const [angleIndex, setAngleIndex] = useState(0);
  const [hairColour, setHairColour] = useState(1);
  const [bodyType, setBodyType] = useState(1);
  const [eyeColour, setEyeColour] = useState(0);
  const [extraDetail, setExtraDetail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");

  const hasGenerated = generatedImages.length > 0;
  const displayImages = hasGenerated ? generatedImages : placeholderImages;

  const prevAngle = () => setAngleIndex((i) => (i - 1 + 3) % 3);
  const nextAngle = () => setAngleIndex((i) => (i + 1) % 3);

  const buildPrompt = (refine?: boolean) => {
    const hair = hairColours[hairColour].label;
    const body = bodyTypes[bodyType].value;
    const eyes = eyeColours[eyeColour].label;
    let p = `a photorealistic portrait of a ${body} build person with ${hair} hair and ${eyes} eyes`;
    if (extraDetail.trim()) p += `, ${extraDetail.trim()}`;
    p += ", professional photography, natural lighting, shallow depth of field, hyperdetailed";
    if (refine) p += ", subtle variation, keep same overall look";
    return p;
  };

  const handleGenerate = async (refine = false) => {
    if (!user) { navigate("/auth"); return; }
    if (credits <= 0) { setShowPaywall(true); return; }

    setIsGenerating(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: { prompt: buildPrompt(refine) },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setGeneratedImages(data.images || []);
      setAngleIndex(0);
      await refetchCredits();
    } catch (e: any) {
      if (e.message?.includes("No credits") || e.message?.includes("402")) {
        setShowPaywall(true);
      } else {
        setError(e.message || "generation failed");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <main className="w-full max-w-lg mx-auto px-5 pt-6 pb-12">
        {/* Character preview */}
        <div className="relative mb-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft">
            <div className="relative flex items-center justify-center py-6 px-4 min-h-[320px]">
              {/* Left chevron */}
              <button
                onClick={prevAngle}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-xl bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={24} strokeWidth={3} className="text-foreground" />
              </button>

              {/* Image */}
              <AnimatePresence mode="wait">
                <motion.img
                  key={angleIndex}
                  src={displayImages[angleIndex]}
                  alt={`character ${angleLabels[angleIndex]}`}
                  width={280}
                  height={350}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="max-h-[280px] w-auto object-contain"
                />
              </AnimatePresence>

              {/* Right chevron */}
              <button
                onClick={nextAngle}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-xl bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center transition-colors"
              >
                <ChevronRight size={24} strokeWidth={3} className="text-foreground" />
              </button>
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-2 pb-4">
              {angleLabels.map((label, i) => (
                <button
                  key={label}
                  onClick={() => setAngleIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === angleIndex ? "w-6 bg-foreground" : "w-2 bg-foreground/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-5">
          {/* Hair colour */}
          <ControlGroup label="hair colour">
            <div className="flex gap-2.5">
              {hairColours.map((c, i) => (
                <button
                  key={c.label}
                  onClick={() => setHairColour(i)}
                  className={`w-11 h-11 rounded-xl border-2 transition-all ${
                    i === hairColour
                      ? "border-foreground scale-110 shadow-soft"
                      : "border-border hover:border-foreground/30"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </ControlGroup>

          {/* Body type */}
          <ControlGroup label="body type">
            <div className="grid grid-cols-3 gap-2.5">
              {bodyTypes.map((b, i) => (
                <button
                  key={b.value}
                  onClick={() => setBodyType(i)}
                  className={`py-3 rounded-xl font-extrabold lowercase text-sm border-2 transition-all ${
                    i === bodyType
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:border-foreground/30"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </ControlGroup>

          {/* Eye colour */}
          <ControlGroup label="eye colour">
            <div className="flex gap-2.5">
              {eyeColours.map((c, i) => (
                <button
                  key={c.label}
                  onClick={() => setEyeColour(i)}
                  className={`w-11 h-11 rounded-xl border-2 transition-all ${
                    i === eyeColour
                      ? "border-foreground scale-110 shadow-soft"
                      : "border-border hover:border-foreground/30"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </ControlGroup>

          {/* Extra detail */}
          <ControlGroup label="extra detail">
            <textarea
              value={extraDetail}
              onChange={(e) => setExtraDetail(e.target.value)}
              placeholder="tattoos, freckles, glasses…"
              rows={2}
              className="w-full border-2 border-border bg-background text-foreground p-4 text-sm font-bold lowercase placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 resize-none rounded-xl transition-colors"
            />
          </ControlGroup>

          {error && (
            <div className="border border-destructive/30 bg-destructive/5 p-3 text-destructive font-bold lowercase text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Action buttons */}
          {!hasGenerated ? (
            <Button
              variant="hero"
              className="w-full h-16 text-lg rounded-2xl"
              onClick={() => handleGenerate(false)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={22} strokeWidth={2.5} />
                  generating…
                </>
              ) : (
                <>
                  <Zap size={22} strokeWidth={2.5} />
                  generate
                </>
              )}
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="hero"
                className="h-14 text-base rounded-2xl"
                onClick={() => handleGenerate(false)}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin" size={20} strokeWidth={2.5} />
                ) : (
                  <>
                    <RotateCcw size={18} strokeWidth={2.5} />
                    continue
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="h-14 text-base rounded-2xl border-2"
                onClick={() => handleGenerate(true)}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin" size={20} strokeWidth={2.5} />
                ) : (
                  <>
                    <Wand2 size={18} strokeWidth={2.5} />
                    refine this
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const ControlGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-extrabold lowercase text-muted-foreground mb-2.5">
      {label}
    </label>
    {children}
  </div>
);

export default CharacterCreator;
