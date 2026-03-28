import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Loader2, Zap, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import PaywallOverlay from "@/components/PaywallOverlay";
import CardCarousel from "@/components/CardCarousel";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitiseText } from "@/lib/sanitise";


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

  // Edit mode
  const editId = searchParams.get("editId");
  const isEditing = !!editId;

  const [country, setCountry] = useState<string>(searchParams.get("country") || "any");
  const [age, setAge] = useState<string>(searchParams.get("age") || "25");
  const [hair, setHair] = useState<string>(searchParams.get("hair") || "brunette");
  const [eye, setEye] = useState<string>(searchParams.get("eye") || "brown");
  const [body, setBody] = useState<string>(searchParams.get("body") || "regular");
  const [style, setStyle] = useState<string>(searchParams.get("style") || "natural");
  const [description, setDescription] = useState(searchParams.get("description") || searchParams.get("edit") || "");
  const [characterName, setCharacterName] = useState(searchParams.get("name") || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const saveCharacter = async () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setIsSaving(true);
    try {
      const charData = {
        name: sanitiseText(characterName, 100) || `${hair} ${eye} ${age}`,
        country: sanitiseText(country, 50),
        age,
        hair: sanitiseText(hair, 50),
        eye: sanitiseText(eye, 50),
        body: sanitiseText(body, 50),
        style: sanitiseText(style, 50),
        description: sanitiseText(description, 500),
      };

      if (isEditing) {
        const { error: updateError } = await supabase
          .from("characters")
          .update(charData)
          .eq("id", editId);
        if (updateError) throw updateError;
        toast({ title: "updated", description: "character updated successfully" });
      } else {
        const { error: insertError } = await supabase.from("characters").insert({
          user_id: user.id,
          ...charData,
        });
        if (insertError) throw insertError;
        toast({ title: "saved", description: "character saved to your collection" });
      }
    } catch (err: any) {
      toast({ title: "error", description: err.message || "failed to save character", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
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
    <div className="relative min-h-screen bg-background px-4 py-6">
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <main className="mx-auto flex w-full max-w-lg flex-col rounded-2xl bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 pb-10">
        <CardCarousel
          images={imageCards}
          activeIndex={activeIndex}
          onPrevious={cyclePrevious}
          onNext={cycleNext}
        />

        {/* Character name */}
        <section className="mt-6 flex flex-col gap-2">
          <label htmlFor="character-name" className="text-xs font-extrabold lowercase text-foreground">
            character name
          </label>
          <input
            id="character-name"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="give your character a name..."
            className="h-12 w-full rounded-2xl border-[5px] border-border bg-card px-4 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
          />
        </section>

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
            className="min-h-32 w-full resize-none rounded-2xl border-[5px] border-border bg-card px-4 py-3 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
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
                      ? "bg-neon-yellow text-neon-yellow-foreground border-[5px] border-neon-yellow"
                      : "border-[5px] border-border text-foreground hover:border-foreground/60"
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
          <div className="mt-6 rounded-2xl border-[4px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Button className="flex-1 h-14 text-sm" onClick={generate} disabled={isGenerating}>
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
          <Button
            variant="outline"
            className="h-14 px-5"
            onClick={saveCharacter}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} strokeWidth={2.5} />}
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
