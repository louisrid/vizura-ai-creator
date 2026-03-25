import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Zap, ChevronLeft, ChevronRight, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import PaywallOverlay from "@/components/PaywallOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";

const hairOptions = ["blonde", "brunette", "black", "red", "pink", "white"];
const eyeOptions = ["brown", "blue", "green", "hazel", "grey"];
const bodyOptions = ["slim", "regular", "curvy"];

const CharacterCreator = () => {
  const { user } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editPrompt = searchParams.get("edit");

  const [hair, setHair] = useState(0);
  const [eye, setEye] = useState(0);
  const [body, setBody] = useState(1);
  const [extra, setExtra] = useState(editPrompt || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const hasGen = generated.length > 0;

  const buildPrompt = () => {
    let p = `photorealistic portrait, young woman, ${bodyOptions[body]} build, ${hairOptions[hair]} hair, ${eyeOptions[eye]} eyes`;
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

  const prev = () => setActiveIndex((i) => (i === 0 ? 2 : i - 1));
  const next = () => setActiveIndex((i) => (i === 2 ? 0 : i + 1));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <PageTransition>
        <main className="w-full max-w-lg mx-auto px-4 pt-3 pb-8">

          {/* Image row */}
          <div className="flex items-center gap-1.5 mb-3">
            <button
              onClick={prev}
              className="shrink-0 w-8 h-8 rounded-xl bg-foreground flex items-center justify-center text-background hover:bg-foreground/80 transition-colors"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </button>

            <div className="flex-1 grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`rounded-xl border-2 overflow-hidden bg-card aspect-[3/4] ${
                    i === activeIndex ? "border-foreground" : "border-border"
                  }`}
                >
                  {hasGen ? (
                    <img src={generated[i]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <User size={24} className="text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={next}
              className="shrink-0 w-8 h-8 rounded-xl bg-foreground flex items-center justify-center text-background hover:bg-foreground/80 transition-colors"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* Credits */}
          {user && (
            <div className="flex items-center justify-end gap-1 text-[10px] font-extrabold text-muted-foreground lowercase mb-3">
              <Sparkles size={12} className="text-accent-purple" />
              {credits} credit{credits !== 1 ? "s" : ""}
            </div>
          )}

          {/* Create button */}
          <Button
            className="w-full h-12 text-xs mb-3"
            onClick={generate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><Loader2 className="animate-spin" size={16} />creating…</>
            ) : (
              <><Zap size={16} strokeWidth={2.5} />create</>
            )}
          </Button>

          {error && (
            <div className="border-2 border-destructive/30 bg-destructive/5 p-2.5 text-destructive font-extrabold lowercase text-xs rounded-xl mb-3">
              {error}
            </div>
          )}

          {/* Description textarea */}
          <div className="mb-3">
            <span className="block text-xs font-extrabold lowercase text-muted-foreground mb-1.5">describe your character</span>
            <textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="tattoos, freckles, glasses, outfit details, pose, setting…"
              rows={3}
              className="w-full border-2 border-border bg-background text-foreground px-3 py-2.5 text-xs font-extrabold lowercase placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 rounded-xl transition-colors resize-none"
            />
          </div>

          {/* Dropdown selectors */}
          <div className="space-y-2">
            <Dropdown label="hair colour" options={hairOptions} value={hair} onChange={setHair} />
            <Dropdown label="eye colour" options={eyeOptions} value={eye} onChange={setEye} />
            <Dropdown label="body type" options={bodyOptions} value={body} onChange={setBody} />
          </div>
        </main>
      </PageTransition>
    </div>
  );
};

const Dropdown = ({ label, options, value, onChange }: { label: string; options: string[]; value: number; onChange: (i: number) => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <span className="block text-[10px] font-extrabold lowercase text-muted-foreground mb-1">{label}</span>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border-2 border-border bg-background text-foreground px-3 py-2.5 rounded-xl text-xs font-extrabold lowercase hover:border-foreground/30 transition-colors"
      >
        {options[value]}
        <ChevronDown />
      </button>
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 border-2 border-border bg-card rounded-xl overflow-hidden shadow-medium">
          {options.map((o, i) => (
            <button
              key={o}
              onClick={() => { onChange(i); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-extrabold lowercase transition-colors ${
                i === value ? "bg-foreground text-background" : "text-foreground hover:bg-muted"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default CharacterCreator;
