import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Loader2, Zap, Upload, Sparkles } from "lucide-react";
import PageTitle from "@/components/PageTitle";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
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

const hairOptions = ["blonde", "brunette", "black", "red", "pink", "white"] as const;
const eyeOptions = ["brown", "blue", "green", "hazel", "grey"] as const;
const bodyOptions = ["slim", "regular", "curvy"] as const;
const styleOptions = ["natural", "model", "egirl"] as const;

const STORAGE_KEY = "vizura_character_draft";

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

  // Restore from sessionStorage if available, then clear it
  const saved = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        sessionStorage.removeItem(STORAGE_KEY);
        return JSON.parse(raw) as Record<string, string>;
      }
    } catch {}
    return null;
  }, []);

  const [country, setCountry] = useState<string>(searchParams.get("country") || saved?.country || "any");
  const [age, setAge] = useState<string>(searchParams.get("age") || saved?.age || "");
  const [hair, setHair] = useState<string>(searchParams.get("hair") || saved?.hair || "brunette");
  const [eye, setEye] = useState<string>(searchParams.get("eye") || saved?.eye || "brown");
  const [body, setBody] = useState<string>(searchParams.get("body") || saved?.body || "regular");
  const [style, setStyle] = useState<string>(searchParams.get("style") || saved?.style || "natural");
  const [description, setDescription] = useState(searchParams.get("description") || searchParams.get("edit") || saved?.description || "");
  const [characterName, setCharacterName] = useState(searchParams.get("name") || saved?.characterName || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generated, setGenerated] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [extraDetails, setExtraDetails] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceImage(file);
    const url = URL.createObjectURL(file);
    setReferencePreview(url);
  };


  const imageCards = useMemo(() => {
    if (generated.length === 0) return [null, null, null];
    return generated.map((img) => img ?? null);
  }, [generated]);

  const buildPrompt = () => {
    const ethnicityPart = country !== "any" ? `, ${country} ethnicity` : "";
    let prompt = `photorealistic portrait, ${age || "25"} year old woman${ethnicityPart}, ${body} body type, ${hair} hair, ${eye} eyes, ${style} style`;
    if (description.trim()) prompt += `, ${description.trim()}`;
    prompt += ", professional photography, natural lighting, shallow depth of field, hyperdetailed";
    return prompt;
  };

  const saveCharacter = async (andChooseFace = false) => {
    if (!user) {
      navigate(`/account?redirect=${encodeURIComponent(location.pathname)}`);
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
        toast.success("character updated");
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("characters")
          .insert({ user_id: user.id, ...charData })
          .select("id")
          .single();
        if (insertError) throw insertError;

        if (andChooseFace && inserted) {
          navigate("/choose-face", {
            state: { prompt: buildPrompt(), characterId: inserted.id },
          });
          return;
        }
        toast.success("character added!");
      }
    } catch (err: any) {
      toast.error(err.message || "failed to save character");
    } finally {
      setIsSaving(false);
    }
  };

  const generate = async () => {
    if (!user) {
      navigate(`/account?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (credits <= 0 && !subscribed) {
      navigate("/account");
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
      if (err.message?.includes("No gems") || err.message?.includes("No credits") || err.message?.includes("402")) {
        setShowPaywall(true);
      } else {
        setError(err.message || "creation failed");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const saveFormToSession = () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      characterName, country, age, hair, eye, body, style, description,
    }));
  };

  const handleCreate = async () => {
    const missingName = !characterName.trim();
    const ageNum = Number(age);
    const invalidAge = !age || ageNum < 18 || ageNum > 40;
    if (missingName || invalidAge) {
      if (missingName) toast.error("name is required");
      if (invalidAge) toast.error(age && (ageNum < 18 || ageNum > 40) ? "age must be between 18-40" : "age is required");
      return;
    }
    if (!user) {
      saveFormToSession();
      navigate(`/account?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    await saveCharacter(false);
    if (!isEditing) {
      toast.success("character added!");
      navigate("/characters");
    }
  };

  const total = imageCards.length || 3;
  const cyclePrevious = () => setActiveIndex((c) => (c - 1 + total) % total);
  const cycleNext = () => setActiveIndex((c) => (c + 1) % total);

  return (
    <div className="relative min-h-screen bg-background">
      
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <main className="mx-auto flex w-full max-w-lg flex-col px-4 pt-14 pb-28">
        <div className="flex items-center mb-8">
          <PageTitle className="mb-0">create character</PageTitle>
        </div>

        {/* Hero image box */}
        <section className="mx-auto mb-8 flex w-[92%] max-w-[22rem] items-center justify-center rounded-2xl border-[5px] border-border bg-card" style={{ aspectRatio: "10/11" }}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neon-yellow">
            <Sparkles size={28} strokeWidth={2.5} className="text-black" />
          </div>
        </section>

        {/* Character name */}
        <section className="flex flex-col gap-2">
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

        {/* Description */}
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

        {/* Toggles */}
        <section className="mt-6 flex flex-col gap-4">
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
          <SelectField label="ethnicity / country" value={country} options={countryOptions} onChange={(v) => setCountry(v)} />
          <div className="flex flex-col gap-2">
            <span className="text-xs font-extrabold lowercase text-foreground">age</span>
            <input
              type="number"
              min={18}
              max={40}
              value={age}
              placeholder="age (18-40)"
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || (Number(v) >= 1 && Number(v) <= 99)) setAge(v);
              }}
              onBlur={() => {}}
              className="h-12 w-full rounded-2xl border-[5px] border-border bg-card px-4 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
            />
          </div>
        </section>

        {/* Reference image upload */}
        <section className="mt-10 flex flex-col">
          <h2 className="text-2xl font-[900] lowercase text-foreground mb-3">got an idea?</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center rounded-2xl border-[3px] border-dashed border-foreground/20 bg-card transition-colors hover:border-foreground/40"
            style={{ aspectRatio: "4/3" }}
          >
            {referencePreview ? (
              <img
                src={referencePreview}
                alt="Reference"
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              <Upload size={28} strokeWidth={2.5} className="text-foreground/30" />
            )}
          </button>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border-[5px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}
      </main>

      {/* Fixed bottom create button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 bg-background">
        <div className="mx-auto max-w-lg">
          <Button className="h-14 w-full text-sm" onClick={handleCreate} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                saving...
              </>
            ) : (
              <>
                <Zap size={18} strokeWidth={2.5} />
                {isEditing ? "update" : "create"}
              </>
            )}
          </Button>
        </div>
      </div>
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
