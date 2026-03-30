import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Zap, Upload, Sparkles } from "lucide-react";
import PageTitle from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import PaywallOverlay from "@/components/PaywallOverlay";
import CreationLoadingOverlay from "@/components/CreationLoadingOverlay";
import GuidedCreator, { type GuidedSelections } from "@/components/GuidedCreator";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitiseText } from "@/lib/sanitise";

const skinOptions = ["pale", "tan", "asian", "dark"] as const;
const bodyOptions = ["slim", "regular", "curvy"] as const;
const chestOptions = ["small", "medium", "large"] as const;
const hairStyleOptions = ["straight", "curly", "bangs", "short"] as const;
const hairColourOptions = ["blonde", "brunette", "black", "pink"] as const;
const eyeOptions = ["brown", "blue", "green", "hazel"] as const;
const makeupOptions = ["natural", "model", "egirl"] as const;

const STORAGE_KEY = "vizura_character_draft";
const WELCOME_SESSION_KEY = "vizura_welcome_seen";

const PillGroup = ({
  label, options, value, onChange,
}: {
  label: string; options: readonly string[]; value: string; onChange: (v: string) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-extrabold lowercase text-foreground">{label}</span>
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-xl px-3.5 py-2 text-xs font-extrabold lowercase transition-all ${
            value === opt
              ? "bg-neon-yellow text-neon-yellow-foreground border-[3px] border-neon-yellow"
              : "border-[3px] border-border bg-card text-foreground/70 hover:border-foreground/40"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const CharacterCreator = () => {
  const { user } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const { subscribed } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const editId = searchParams.get("editId");
  const isEditing = !!editId;

  const [characterCount, setCharacterCount] = useState<number | null>(null);
  const [showGuided, setShowGuided] = useState(false);
  const [guidedReady, setGuidedReady] = useState(false);

  // Fetch character count and welcome status
  useEffect(() => {
    const fetchState = async () => {
      if (user) {
        const [charResult, profileResult] = await Promise.all([
          supabase.from("characters").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("profiles").select("has_seen_welcome").eq("user_id", user.id).single(),
        ]);
        setCharacterCount(charResult.count ?? 0);
        setHasSeenWelcome((profileResult.data as any)?.has_seen_welcome ?? false);
      } else {
        setCharacterCount(0);
        setHasSeenWelcome(sessionStorage.getItem(WELCOME_SESSION_KEY) === "1");
      }
      setGuidedReady(true);
    };
    fetchState();
  }, [user]);

  // Auto-launch guided for first-time / zero-character users
  useEffect(() => {
    if (!guidedReady || isEditing) return;
    if (characterCount === 0) {
      setShowGuided(true);
    }
  }, [guidedReady, characterCount, isEditing]);

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

  const [skin, setSkin] = useState<string>(saved?.skin || "tan");
  const [bodyType, setBodyType] = useState<string>(saved?.bodyType || "regular");
  const [chest, setChest] = useState<string>(saved?.chest || "medium");
  const [hairStyle, setHairStyle] = useState<string>(saved?.hairStyle || "straight");
  const [hairColour, setHairColour] = useState<string>(saved?.hairColour || "brunette");
  const [eye, setEye] = useState<string>(saved?.eye || "brown");
  const [makeup, setMakeup] = useState<string>(saved?.makeup || "natural");
  const [age, setAge] = useState<string>(saved?.age || "");
  const [description, setDescription] = useState(saved?.description || "");
  const [characterName, setCharacterName] = useState(saved?.characterName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [error, setError] = useState("");
  const [referenceStrength, setReferenceStrength] = useState(50);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const guidedPromptRef = useRef<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceImage(file);
    setReferencePreview(URL.createObjectURL(file));
  };

  const buildPrompt = () => {
    const skinPart = skin ? `, ${skin} skin` : "";
    let prompt = `photorealistic portrait, ${age || "25"} year old woman${skinPart}, ${bodyType} body type, ${chest} chest, ${hairStyle} ${hairColour} hair, ${eye} eyes, ${makeup} makeup`;
    if (description.trim()) prompt += `, ${description.trim()}`;
    prompt += ", professional photography, natural lighting, shallow depth of field, hyperdetailed";
    return prompt;
  };

  const saveCharacter = async () => {
    if (!user) {
      // Store draft and redirect to sign in
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        characterName, skin, bodyType, chest, hairStyle, hairColour, eye, makeup, age, description,
      }));
      navigate(`/account?redirect=${encodeURIComponent(location.pathname)}`);
      return null;
    }
    try {
      const charData = {
        name: sanitiseText(characterName, 100) || `${hairColour} ${eye} ${age}`,
        country: sanitiseText(skin, 50),
        age,
        hair: sanitiseText(hairColour, 50),
        eye: sanitiseText(eye, 50),
        body: sanitiseText(bodyType, 50),
        style: sanitiseText(makeup, 50),
        description: sanitiseText(`${chest} chest, ${hairStyle} hair. ${description}`, 500),
        generation_prompt: buildPrompt(),
      };

      if (isEditing) {
        const { error: updateError } = await supabase
          .from("characters")
          .update(charData)
          .eq("id", editId);
        if (updateError) throw updateError;
        toast.success("character updated");
        return editId;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("characters")
          .insert({ user_id: user.id, ...charData })
          .select("id")
          .single();
        if (insertError) throw insertError;
        return inserted?.id || null;
      }
    } catch (err: any) {
      toast.error(err.message || "failed to save character");
      return null;
    }
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
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        characterName, skin, bodyType, chest, hairStyle, hairColour, eye, makeup, age, description,
      }));
      navigate(`/account?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    guidedPromptRef.current = null;
    setShowLoading(true);
    setIsSaving(true);
    const charId = await saveCharacter();
    setIsSaving(false);
    if (!charId) {
      setShowLoading(false);
      return;
    }
    sessionStorage.setItem("vizura_pending_char_id", charId);
  };

  const handleLoadingComplete = () => {
    setShowLoading(false);
    const charId = sessionStorage.getItem("vizura_pending_char_id");
    sessionStorage.removeItem("vizura_pending_char_id");
    toast.success("30 gems used");
    const prompt = guidedPromptRef.current || buildPrompt();
    guidedPromptRef.current = null;
    navigate("/choose-face", {
      state: { prompt, characterId: charId },
    });
  };

  const handleGuidedComplete = useCallback(async (selections: GuidedSelections) => {
    setSkin(selections.skin || "tan");
    setBodyType(selections.bodyType || "regular");
    setChest(selections.chest || "medium");
    setHairStyle(selections.hairStyle || "straight");
    setHairColour(selections.hairColour || "brunette");
    setEye(selections.eye || "brown");
    setMakeup(selections.makeup || "natural");
    setCharacterName(selections.characterName);
    setAge(selections.age);
    setShowGuided(false);

    // Store selections in sessionStorage for persistence through sign-in redirect
    const draft = {
      characterName: selections.characterName,
      skin: selections.skin || "tan",
      bodyType: selections.bodyType || "regular",
      chest: selections.chest || "medium",
      hairStyle: selections.hairStyle || "straight",
      hairColour: selections.hairColour || "brunette",
      eye: selections.eye || "brown",
      makeup: selections.makeup || "natural",
      age: selections.age,
      description: "",
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));

    // Build prompt
    const sk = selections.skin || "tan";
    const bt = selections.bodyType || "regular";
    const ch = selections.chest || "medium";
    const hs = selections.hairStyle || "straight";
    const hc = selections.hairColour || "brunette";
    const ey = selections.eye || "brown";
    const mk = selections.makeup || "natural";
    const ag = selections.age || "25";
    const prompt = `photorealistic portrait, ${ag} year old woman, ${sk} skin, ${bt} body type, ${ch} chest, ${hs} ${hc} hair, ${ey} eyes, ${mk} makeup, professional photography, natural lighting, shallow depth of field, hyperdetailed`;

    guidedPromptRef.current = prompt;
    sessionStorage.setItem("vizura_guided_prompt", prompt);

    // Show loading immediately
    setShowLoading(true);

    if (user) {
      setIsSaving(true);
      try {
        const charData = {
          user_id: user.id,
          name: sanitiseText(selections.characterName, 100) || `${hc} ${ey} ${ag}`,
          country: sanitiseText(sk, 50),
          age: ag,
          hair: sanitiseText(hc, 50),
          eye: sanitiseText(ey, 50),
          body: sanitiseText(bt, 50),
          style: sanitiseText(mk, 50),
          description: sanitiseText(`${ch} chest, ${hs} hair.`, 500),
          generation_prompt: prompt,
        };
        const { data: inserted, error: insertError } = await supabase
          .from("characters")
          .insert(charData)
          .select("id")
          .single();
        if (insertError) throw insertError;
        sessionStorage.setItem("vizura_pending_char_id", inserted.id);
      } catch (err: any) {
        toast.error(err.message || "failed to save character");
        setShowLoading(false);
      }
      setIsSaving(false);
    }
    // For non-logged-in users, loading screen plays, then choose-face will handle sign-in
  }, [user]);

  const handleGuidedExit = useCallback((partial: Partial<GuidedSelections>) => {
    if (partial.skin) setSkin(partial.skin);
    if (partial.bodyType) setBodyType(partial.bodyType);
    if (partial.chest) setChest(partial.chest);
    if (partial.hairStyle) setHairStyle(partial.hairStyle);
    if (partial.hairColour) setHairColour(partial.hairColour);
    if (partial.eye) setEye(partial.eye);
    if (partial.makeup) setMakeup(partial.makeup);
    if (partial.characterName) setCharacterName(partial.characterName);
    if (partial.age) setAge(partial.age);
    setShowGuided(false);
  }, []);

  const handleMarkWelcomeSeen = useCallback(async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ has_seen_welcome: true } as any)
        .eq("user_id", user.id);
    }
    sessionStorage.setItem(WELCOME_SESSION_KEY, "1");
    setHasSeenWelcome(true);
  }, [user]);

  return (
    <div className="relative min-h-screen bg-background">
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />
      <CreationLoadingOverlay open={showLoading} onComplete={handleLoadingComplete} />
      <GuidedCreator
        open={showGuided}
        onComplete={handleGuidedComplete}
        onExit={handleGuidedExit}
      />

      <main className="mx-auto flex w-full max-w-lg flex-col px-4 pt-14 pb-10">
        <div className="flex items-center justify-between mb-8">
          <PageTitle className="mb-0">create character</PageTitle>
          {!showGuided && (
            <button
              onClick={() => setShowGuided(true)}
              className="flex items-center gap-1.5 text-xs font-extrabold lowercase text-foreground/50 hover:text-foreground transition-colors"
            >
              <Sparkles size={14} strokeWidth={2.5} />
              guided creator
            </button>
          )}
        </div>

        {/* Hero image box */}
        <section className="mx-auto mb-8 flex w-[92%] max-w-[22rem] items-center justify-center rounded-2xl border-[5px] border-border bg-card" style={{ aspectRatio: "10/11" }}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neon-yellow">
            <Sparkles size={28} strokeWidth={2.5} className="text-neon-yellow-foreground" />
          </div>
        </section>

        {/* Character name */}
        <section className="flex flex-col gap-1.5">
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

        {/* Age */}
        <section className="mt-5 flex flex-col gap-1.5">
          <span className="text-xs font-extrabold lowercase text-foreground">age</span>
          <input
            type="number"
            min={18}
            max={40}
            value={age}
            placeholder="18-40"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || (Number(v) >= 1 && Number(v) <= 99)) setAge(v);
            }}
            className="h-12 w-full rounded-2xl border-[5px] border-border bg-card px-4 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
          />
        </section>

        {/* 7 Pill toggle sections */}
        <section className="mt-5 flex flex-col gap-4">
          <PillGroup label="skin" options={skinOptions} value={skin} onChange={setSkin} />
          <PillGroup label="body type" options={bodyOptions} value={bodyType} onChange={setBodyType} />
          <PillGroup label="chest" options={chestOptions} value={chest} onChange={setChest} />
          <PillGroup label="hair" options={hairStyleOptions} value={hairStyle} onChange={setHairStyle} />
          <PillGroup label="hair colour" options={hairColourOptions} value={hairColour} onChange={setHairColour} />
          <PillGroup label="eyes" options={eyeOptions} value={eye} onChange={setEye} />
          <PillGroup label="makeup" options={makeupOptions} value={makeup} onChange={setMakeup} />
        </section>

        {/* Reference image upload */}
        <section className="mt-5 flex flex-col gap-1.5">
          <span className="text-xs font-extrabold lowercase text-foreground">reference image</span>
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

        {/* Reference strength slider */}
        <section className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold lowercase text-foreground">reference strength</span>
            <span className="text-xs font-extrabold lowercase text-foreground">{referenceStrength}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={referenceStrength}
            onChange={(e) => setReferenceStrength(Number(e.target.value))}
            className="w-full accent-neon-yellow h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, hsl(var(--neon-yellow)) ${referenceStrength}%, hsl(0 0% 20%) ${referenceStrength}%)`,
            }}
          />
        </section>

        {/* Description */}
        <section className="mt-10 flex flex-col gap-1.5">
          <span className="text-xs font-extrabold lowercase text-foreground">text box</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="add any details you want to see"
            rows={6}
            className="min-h-40 w-full resize-none rounded-2xl border-[5px] border-border bg-card px-4 py-3 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
          />
        </section>

        {error && (
          <div className="mt-5 rounded-2xl border-[5px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}

        {/* Create button */}
        <div className="mt-8 mb-6">
          <Button className="h-14 w-full text-sm" onClick={handleCreate} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                saving...
              </>
            ) : (
              <>
                <Zap size={18} strokeWidth={2.5} />
                {isEditing ? "update" : "create · 30 gems"}
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CharacterCreator;
