import { useMemo, useState, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Loader2, Zap, Upload, Sparkles, Plus } from "lucide-react";
import PageTitle from "@/components/PageTitle";
import { Slider } from "@/components/ui/slider";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import PaywallOverlay from "@/components/PaywallOverlay";
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
  const [referenceStrength, setReferenceStrength] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceImage(file);
    const url = URL.createObjectURL(file);
    setReferencePreview(url);
  };

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

  return (
    <div className="relative min-h-screen bg-background">
      
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <main className="mx-auto flex w-full max-w-lg flex-col px-4 pt-14 pb-28">
        <div className="flex items-center mb-8">
          <PageTitle className="mb-0">create character</PageTitle>
        </div>

        {/* Top section: Photo left, Name + Traits right */}
        <section className="flex gap-3 mb-5">
          {/* Photo preview box — 4:5 portrait */}
          <div
            className="shrink-0 flex items-center justify-center rounded-2xl border-[5px] border-border bg-card overflow-hidden"
            style={{ width: "40%", aspectRatio: "4/5" }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-yellow">
              <Sparkles size={20} strokeWidth={2.5} className="text-black" />
            </div>
          </div>

          {/* Name + Trait selectors */}
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            {/* Character name */}
            <input
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="name..."
              className="h-[34px] w-full rounded-xl border-[4px] border-border bg-card px-3 text-[10px] font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
            />

            {/* Compact trait selectors */}
            <CompactSelect label="style" value={style} options={styleOptions} onChange={setStyle} />
            <CompactSelect label="hair" value={hair} options={hairOptions} onChange={setHair} />
            <CompactSelect label="eyes" value={eye} options={eyeOptions} onChange={setEye} />
            <CompactSelect label="body" value={body} options={bodyOptions} onChange={setBody} />
            <CompactSelect label="nationality" value={country} options={countryOptions} onChange={setCountry} />

            {/* Age */}
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
              className="h-[34px] w-full rounded-xl border-[4px] border-border bg-card px-3 text-[10px] font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
            />
          </div>
        </section>

        {/* Extra details / description — full width */}
        <section className="mb-5">
          <label className="text-xs font-extrabold lowercase text-foreground mb-1.5 block">
            extra details
          </label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="describe her look, outfit, setting…"
            rows={3}
            className="min-h-24 w-full resize-none rounded-2xl border-[5px] border-border bg-card px-4 py-3 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
          />
        </section>

        {/* Plain + icon */}
        <div className="flex justify-center mb-5">
          <Plus size={24} strokeWidth={3} className="text-foreground" />
        </div>

        {/* Reference image upload */}
        <section className="mb-5 flex flex-col">
          <label className="text-xs font-extrabold lowercase text-foreground mb-1.5 block">
            reference image
          </label>
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
            style={{ aspectRatio: "16/9" }}
          >
            {referencePreview ? (
              <img
                src={referencePreview}
                alt="Reference"
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              <Upload size={24} strokeWidth={2.5} className="text-foreground/30" />
            )}
          </button>
        </section>

        {/* Reference strength slider */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-extrabold lowercase text-foreground">
              reference strength
            </span>
            <span className="text-xs font-extrabold lowercase text-foreground/50">
              {referenceStrength}%
            </span>
          </div>
          <Slider
            value={[referenceStrength]}
            onValueChange={(v) => setReferenceStrength(v[0])}
            min={0}
            max={100}
            step={1}
            className="w-full [&_[data-radix-slider-track]]:h-2.5 [&_[data-radix-slider-track]]:rounded-full [&_[data-radix-slider-track]]:bg-card [&_[data-radix-slider-track]]:border-[3px] [&_[data-radix-slider-track]]:border-border [&_[data-radix-slider-range]]:bg-neon-yellow [&_[data-radix-slider-thumb]]:h-5 [&_[data-radix-slider-thumb]]:w-5 [&_[data-radix-slider-thumb]]:bg-neon-yellow [&_[data-radix-slider-thumb]]:border-[3px] [&_[data-radix-slider-thumb]]:border-foreground"
          />
        </section>

        {error && (
          <div className="mt-2 rounded-2xl border-[5px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
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

type CompactSelectProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

const CompactSelect = <T extends string>({ label, options, value, onChange }: CompactSelectProps<T>) => (
  <label className="relative flex items-center">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-9 w-full appearance-none rounded-xl border-[4px] border-border bg-card pl-3 pr-8 text-[10px] font-extrabold lowercase text-foreground outline-none transition-colors focus:border-foreground"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[7px] font-extrabold lowercase text-foreground/40 hidden">
      {label}
    </span>
    <ChevronDown
      size={12}
      strokeWidth={3}
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/50"
    />
  </label>
);

export default CharacterCreator;
