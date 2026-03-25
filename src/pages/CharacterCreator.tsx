import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import PaywallOverlay from "@/components/PaywallOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";

const hairOptions = ["blonde", "brunette", "black", "red", "pink", "white"] as const;
const eyeOptions = ["brown", "blue", "green", "hazel", "grey"] as const;
const bodyOptions = ["slim", "regular", "curvy"] as const;

const CharacterCreator = () => {
  const { user } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editPrompt = searchParams.get("edit");

  const [hair, setHair] = useState<(typeof hairOptions)[number]>("brunette");
  const [eye, setEye] = useState<(typeof eyeOptions)[number]>("brown");
  const [body, setBody] = useState<(typeof bodyOptions)[number]>("regular");
  const [description, setDescription] = useState(editPrompt || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const imageCards = useMemo(() => {
    if (generated.length === 0) return [null, null, null];
    return Array.from({ length: 3 }, (_, offset) => generated[(activeIndex + offset) % generated.length] ?? null);
  }, [activeIndex, generated]);

  const buildPrompt = () => {
    let prompt = `photorealistic portrait, young woman, ${body} body type, ${hair} hair, ${eye} eyes`;
    if (description.trim()) prompt += `, ${description.trim()}`;
    prompt += ", professional photography, natural lighting, shallow depth of field, hyperdetailed";
    return prompt;
  };

  const generate = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (credits <= 0) {
      setShowPaywall(true);
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const { data, error: functionError } = await supabase.functions.invoke("generate", {
        body: { prompt: buildPrompt() },
      });

      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.error);

      setGenerated(data.images || []);
      setActiveIndex(0);
      await refetchCredits();
    } catch (err: any) {
      if (err.message?.includes("No credits") || err.message?.includes("402")) {
        setShowPaywall(true);
      } else {
        setError(err.message || "creation failed");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const cyclePrevious = () => {
    const total = generated.length || 3;
    setActiveIndex((current) => (current - 1 + total) % total);
  };

  const cycleNext = () => {
    const total = generated.length || 3;
    setActiveIndex((current) => (current + 1) % total);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <PageTransition>
        <main className="mx-auto flex w-full max-w-lg flex-col px-4 pt-44 pb-12">
          {/* Large image cards */}
          <section className="flex flex-col items-center">
            <div className="grid w-full grid-cols-3 gap-3">
              {imageCards.map((image, index) => (
                <div
                  key={`${image ?? "placeholder"}-${index}`}
                  className="aspect-[3/5] overflow-hidden rounded-xl border-2 border-border bg-card"
                >
                  {image ? (
                    <img src={image} alt="generated character" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-card">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <User size={32} strokeWidth={2} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={cyclePrevious}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-colors hover:bg-foreground/80"
                aria-label="previous images"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={cycleNext}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-colors hover:bg-foreground/80"
                aria-label="next images"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </section>

          {/* Create button */}
          <div className="mt-12">
            <Button className="h-16 w-full text-sm" onClick={generate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  creating…
                </>
              ) : (
                <>
                  <Zap size={18} strokeWidth={2.5} />
                  create
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="mt-8 rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
              {error}
            </div>
          )}

          {/* Description textarea */}
          <section className="mt-12 flex flex-col gap-3">
            <label htmlFor="character-description" className="text-sm font-extrabold lowercase text-muted-foreground">
              describe your character
            </label>
            <textarea
              id="character-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="face shape, hairstyle, outfit, pose, mood, setting…"
              rows={5}
              className="min-h-40 w-full resize-none rounded-xl border-2 border-border bg-card px-4 py-4 text-sm font-extrabold lowercase text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/40 focus:outline-none"
            />
          </section>

          {/* Dropdowns */}
          <section className="mt-12 flex flex-col gap-5">
            <SelectField label="hair colour" value={hair} options={hairOptions} onChange={(value) => setHair(value)} />
            <SelectField label="eye colour" value={eye} options={eyeOptions} onChange={(value) => setEye(value)} />
            <SelectField label="body type" value={body} options={bodyOptions} onChange={(value) => setBody(value)} />
          </section>
        </main>
      </PageTransition>
    </div>
  );
};

type SelectFieldProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

const SelectField = <T extends string>({ label, options, value, onChange }: SelectFieldProps<T>) => (
  <label className="relative flex flex-col gap-2">
    <span className="text-sm font-extrabold lowercase text-muted-foreground">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="h-14 w-full appearance-none rounded-xl border-2 border-border bg-card px-4 pr-10 text-sm font-extrabold lowercase text-foreground outline-none transition-colors focus:border-foreground/40"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
    <ChevronDown
      size={16}
      strokeWidth={2.5}
      className="pointer-events-none absolute right-4 bottom-3.5 text-muted-foreground"
    />
  </label>
);

export default CharacterCreator;
