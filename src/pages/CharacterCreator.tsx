import { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaywallOverlay from "@/components/PaywallOverlay";
import CardCarousel from "@/components/CardCarousel";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-nature-collage.jpg";

const countryOptions = [
  "any", "american", "british", "australian", "brazilian", "colombian", "french",
  "german", "indian", "italian", "japanese", "korean", "mexican", "nigerian",
  "russian", "scandinavian", "spanish", "thai", "turkish", "ukrainian",
] as const;
const ageOptions = Array.from({ length: 23 }, (_, i) => `${i + 18}`) as unknown as readonly string[];
const hairOptions = ["blonde", "brunette", "black", "red", "pink", "white"] as const;
const eyeOptions = ["brown", "blue", "green", "hazel", "grey"] as const;
const bodyOptions = ["slim", "regular", "curvy"] as const;
const styleOptions = ["natural", "model", "egirl"] as const;

const CharacterCreator = () => {
  const { user } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const { subscribed } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editPrompt = searchParams.get("edit");

  const [country, setCountry] = useState<string>("any");
  const [age, setAge] = useState<string>("25");
  const [hair, setHair] = useState<(typeof hairOptions)[number]>("brunette");
  const [eye, setEye] = useState<(typeof eyeOptions)[number]>("brown");
  const [body, setBody] = useState<(typeof bodyOptions)[number]>("regular");
  const [style, setStyle] = useState<(typeof styleOptions)[number]>("natural");
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
    const ethnicityPart = country !== "any" ? `, ${country} ethnicity` : "";
    let prompt = `photorealistic portrait, ${age} year old woman${ethnicityPart}, ${body} body type, ${hair} hair, ${eye} eyes`;
    if (description.trim()) prompt += `, ${description.trim()}`;
    prompt += ", professional photography, natural lighting, shallow depth of field, hyperdetailed";
    return prompt;
  };

  const generate = async () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (credits <= 0 && !subscribed) {
      navigate("/account/membership");
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

  const total = imageCards.length || 3;
  const cyclePrevious = () => setActiveIndex((c) => (c - 1 + total) % total);
  const cycleNext = () => setActiveIndex((c) => (c + 1) % total);

  return (
    <div className="relative min-h-screen bg-background">
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <div className="absolute top-0 left-1/2 z-0 w-full max-w-lg -translate-x-1/2">
        <div className="relative w-full" style={{ aspectRatio: "4 / 2.2" }}>
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: 0.04, filter: "saturate(0.08) blur(0.5px)" }}
            width={1024}
            height={768}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, hsl(var(--background) / 0.4) 0%, hsl(var(--background) / 0.7) 50%, hsl(var(--background)) 85%)",
            }}
          />
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-lg px-4 pt-16 pb-0">
        <h1 className="text-3xl font-extrabold lowercase tracking-tight text-foreground text-center">
          create character
        </h1>
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col px-4 pt-4 pb-12">
        <CardCarousel
          images={imageCards}
          activeIndex={activeIndex}
          onPrevious={cyclePrevious}
          onNext={cycleNext}
        />

        <section className="mt-6 flex flex-col gap-2">
          <label htmlFor="character-description" className="text-xs font-extrabold lowercase text-foreground">
            describe your character
          </label>
          <textarea
            id="character-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="face shape, hairstyle, outfit, pose, mood, setting..."
            rows={4}
            className="min-h-32 w-full resize-none rounded-2xl border-[4px] border-border bg-card px-4 py-3 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
          />
        </section>

        <section className="mt-6 flex flex-col gap-4">
          <SelectField label="ethnicity / country" value={country} options={countryOptions} onChange={(v) => setCountry(v)} />
          <SelectField label="age" value={age} options={ageOptions} onChange={(v) => setAge(v)} />

          <div className="flex flex-col gap-2">
            <span className="text-xs font-extrabold lowercase text-foreground">style</span>
            <div className="flex gap-2">
              {styleOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`flex-1 py-3 rounded-2xl font-extrabold lowercase text-xs transition-all ${
                    style === s
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-foreground border-[4px] border-transparent"
                      : "border-[4px] border-border text-foreground hover:border-foreground/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <SelectField label="hair colour" value={hair} options={hairOptions} onChange={(v) => setHair(v)} />
          <SelectField label="eye colour" value={eye} options={eyeOptions} onChange={(v) => setEye(v)} />
          <SelectField label="body type" value={body} options={bodyOptions} onChange={(v) => setBody(v)} />
        </section>

        {error && (
          <div className="mt-4 rounded-2xl border-[4px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6">
          <Button className="h-14 w-full text-sm" onClick={generate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                creating...
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
      className="h-12 w-full appearance-none rounded-2xl border-[4px] border-border bg-card px-4 pr-10 text-sm font-extrabold lowercase text-foreground outline-none transition-colors focus:border-foreground"
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
