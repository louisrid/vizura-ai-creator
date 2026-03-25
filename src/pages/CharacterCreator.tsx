import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaywallOverlay from "@/components/PaywallOverlay";
import CardCarousel from "@/components/CardCarousel";
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
    return generated.map((img) => img ?? null);
  }, [generated]);

  const buildPrompt = () => {
    let prompt = `photorealistic portrait, young woman, ${body} body type, ${hair} hair, ${eye} eyes`;
    if (description.trim()) prompt += `, ${description.trim()}`;
    prompt += ", professional photography, natural lighting, shallow depth of field, hyperdetailed";
    return prompt;
  };

  const generate = async () => {
    if (!user) { navigate("/auth"); return; }
    if (credits <= 0) { setShowPaywall(true); return; }

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

  const total = imageCards.length || 3;
  const cyclePrevious = () => setActiveIndex((c) => (c - 1 + total) % total);
  const cycleNext = () => setActiveIndex((c) => (c + 1) % total);

  return (
    <div className="min-h-screen bg-background">
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <main className="mx-auto flex w-full max-w-lg flex-col px-4 pt-16 pb-12">
        <h1 className="text-4xl font-extrabold lowercase tracking-tight text-foreground text-center mb-10">create character</h1>

        <CardCarousel
          images={imageCards}
          activeIndex={activeIndex}
          onPrevious={cyclePrevious}
          onNext={cycleNext}
        />

        {/* Description textarea */}
        <section className="mt-10 flex flex-col gap-2">
          <label htmlFor="character-description" className="text-xs font-extrabold lowercase text-foreground">
            describe your character
          </label>
          <textarea
            id="character-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="face shape, hairstyle, outfit, pose, mood, setting…"
            rows={4}
            className="min-h-32 w-full resize-none rounded-2xl border-[5px] border-border bg-card px-4 py-3 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
          />
        </section>

        {/* Dropdowns */}
        <section className="mt-8 flex flex-col gap-4">
          <SelectField label="hair colour" value={hair} options={hairOptions} onChange={(v) => setHair(v)} />
          <SelectField label="eye colour" value={eye} options={eyeOptions} onChange={(v) => setEye(v)} />
          <SelectField label="body type" value={body} options={bodyOptions} onChange={(v) => setBody(v)} />
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border-[5px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}

        {/* Create button */}
        <div className="mt-8">
          <Button className="h-14 w-full text-sm" onClick={generate} disabled={isGenerating}>
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
      </main>
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
    <span className="text-xs font-extrabold lowercase text-foreground">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="h-12 w-full appearance-none rounded-2xl border-[5px] border-border bg-card px-4 pr-10 text-sm font-extrabold lowercase text-foreground outline-none transition-colors focus:border-foreground"
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
      className="pointer-events-none absolute right-4 bottom-3.5 text-foreground"
    />
  </label>
);

export default CharacterCreator;
