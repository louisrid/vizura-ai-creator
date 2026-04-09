import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Zap, Upload, Sparkles, Gem } from "lucide-react";
import PageTitle from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import PaywallOverlay from "@/components/PaywallOverlay";
import GuidedCreator, { type GuidedSelections } from "@/components/GuidedCreator";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitiseText } from "@/lib/sanitise";

const skinOptions = ["white", "tan", "asian", "black"] as const;
const bodyOptions = ["slim", "average", "curvy"] as const;
const hairStyleOptions = ["long straight", "long wavy", "fringe/bangs"] as const;
const hairColourOptions = ["blonde", "brunette", "black", "pink"] as const;
const eyeOptions = ["blue", "brown", "green", "grey"] as const;
const makeupOptions = ["natural", "classic"] as const;
const ageOptions = ["18-24", "24+"] as const;

const STORAGE_KEY = "vizura_character_draft";
const FLOW_STATE_KEY = "vizura_guided_flow_state";

const PillGroup = ({
  label, options, value, onChange,
}: {
  label: string; options: readonly string[]; value: string; onChange: (v: string) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-extrabold lowercase text-foreground">{label}</span>
    <div className={`flex flex-wrap gap-1.5 ${options.length <= 2 ? "justify-center" : ""}`}>
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
  const [skipWelcome, setSkipWelcome] = useState(false);
  const [guidedReady, setGuidedReady] = useState(false);

  useEffect(() => {
    const fetchState = async () => {
      if (user) {
        const charResult = await supabase.from("characters").select("id", { count: "exact", head: true }).eq("user_id", user.id);
        setCharacterCount(charResult.count ?? 0);
      } else {
        setCharacterCount(0);
      }
      setGuidedReady(true);
    };
    fetchState();
  }, [user]);

  useEffect(() => {
    if (!guidedReady || isEditing) return;
    // Only skip welcome slides when user navigated here internally (flag set by menu/button)
    const internalNav = sessionStorage.getItem("vizura_internal_nav") === "1";
    sessionStorage.removeItem("vizura_internal_nav"); // consume the flag
    const shouldSkip = internalNav && !!user && (characterCount ?? 0) > 0;
    setSkipWelcome(shouldSkip);
    if (shouldSkip) {
      const timer = window.setTimeout(() => setShowGuided(true), 1000);
      return () => window.clearTimeout(timer);
    }
    setShowGuided(true);
  }, [guidedReady, isEditing, user, characterCount]);

  const saved = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        // DON'T remove it here - ChooseFace needs it later
        return JSON.parse(raw) as Record<string, string>;
      }
    } catch {}
    return null;
  }, []);

  const [skin, setSkin] = useState<string>(saved?.skin || "tan");
  const [bodyType, setBodyType] = useState<string>(saved?.bodyType || "average");
  const [hairStyle, setHairStyle] = useState<string>(saved?.hairStyle || "long straight");
  const [hairColour, setHairColour] = useState<string>(saved?.hairColour || "brunette");
  const [eye, setEye] = useState<string>(saved?.eye || "brown");
  const [makeup, setMakeup] = useState<string>(saved?.makeup === "glam" || saved?.makeup === "model" ? "classic" : saved?.makeup || "natural");
  const [age, setAge] = useState<string>(saved?.age || "");
  const [description, setDescription] = useState(saved?.description || "");
  const [characterName, setCharacterName] = useState(saved?.characterName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [referenceStrength, setReferenceStrength] = useState(50);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // On full page reload, clear flow state so it restarts fresh
  useEffect(() => {
    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navEntry?.type !== "reload") return;
    [STORAGE_KEY, FLOW_STATE_KEY, "vizura_guided_prompt", "vizura_selected_face", "vizura_face_options", "vizura_pending_char_id"].forEach((k) => sessionStorage.removeItem(k));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceImage(file);
    setReferencePreview(URL.createObjectURL(file));
  };

  const buildPrompt = () => {
    const skinPart = skin ? `, ${skin} skin` : "";
    let prompt = `photorealistic portrait, ${age || "25"} year old woman${skinPart}, ${bodyType} body type, ${hairStyle} ${hairColour} hair, ${eye} eyes, ${makeup} makeup`;
    if (description.trim()) prompt += `, ${description.trim()}`;
    prompt += ", professional photography, natural lighting, shallow depth of field, hyperdetailed";
    return prompt;
  };

  const saveCharacter = async () => {
    if (!user) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        characterName, skin, bodyType, hairStyle, hairColour, eye, makeup, age, description,
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
        description: sanitiseText(`${hairStyle} hair. ${description}`, 500),
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
    const missingAge = !age;
    if (missingName || missingAge) {
      if (missingName) toast.error("name is required");
      if (missingAge) toast.error("age is required");
      return;
    }
    if (!user) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        characterName, skin, bodyType, hairStyle, hairColour, eye, makeup, age, description,
      }));
      navigate(`/account?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    setIsSaving(true);
    const charId = await saveCharacter();
    setIsSaving(false);
    if (!charId) return;
    sessionStorage.setItem("vizura_pending_char_id", charId);
  };

  // Called when GuidedCreator cooking phase completes
  const handleGuidedComplete = useCallback(async (selections: GuidedSelections) => {
    // Save draft to sessionStorage for ChooseFace to read
    const draft = {
      characterName: selections.characterName,
      skin: selections.skin || "tan",
      bodyType: selections.bodyType || "average",
      hairStyle: selections.hairStyle || "long straight",
      hairColour: selections.hairColour || "brunette",
      eye: selections.eye || "brown",
      makeup: selections.makeup || "natural",
      age: selections.age,
      description: selections.description || "",
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));

    const sk = selections.skin || "tan";
    const bt = selections.bodyType || "average";
    const hs = selections.hairStyle || "long straight";
    const hc = selections.hairColour || "brunette";
    const ey = selections.eye || "brown";
    const mk = selections.makeup || "natural";
    const ag = selections.age === "18-24" ? "18" : selections.age === "24+" ? "24" : selections.age || "18";
    const prompt = `${ag} year old woman, ${sk} skin, ${hs} ${hc} hair, ${ey} eyes, ${mk} makeup`;

    sessionStorage.setItem("vizura_guided_prompt", prompt);

    // If user is already logged in, save character to DB now
    if (user) {
      const charData = {
        user_id: user.id,
        name: sanitiseText(selections.characterName, 100) || `${hc} ${ey} ${ag}`,
        country: sanitiseText(sk, 50),
        age: ag,
        hair: sanitiseText(hc, 50),
        eye: sanitiseText(ey, 50),
        body: sanitiseText(bt, 50),
        style: sanitiseText(mk, 50),
        description: sanitiseText(`${hs} hair. ${selections.description || ""}`, 500),
        generation_prompt: prompt,
      };
      const { data: inserted, error: insertError } = await supabase
        .from("characters")
        .insert(charData)
        .select("id")
        .single();
      if (!insertError && inserted) {
        sessionStorage.setItem("vizura_pending_char_id", inserted.id);
      }
      // Clear stale face options so ChooseFace always generates fresh faces
      sessionStorage.removeItem("vizura_face_options");
      navigate("/choose-face", { state: { prompt, characterId: inserted?.id, freshCreation: true } });
    } else {
      // Not logged in - navigate to choose-face, sign-in will happen there
      sessionStorage.removeItem("vizura_face_options");
      navigate("/choose-face", { state: { prompt, freshCreation: true } });
    }

    // Close guided overlay after navigation is queued
    sessionStorage.removeItem(FLOW_STATE_KEY);
    setShowGuided(false);
  }, [user, navigate]);

  const handleGuidedExit = useCallback((partial: Partial<GuidedSelections>) => {
    if (partial.skin) setSkin(partial.skin);
    if (partial.bodyType) setBodyType(partial.bodyType);
    if (partial.hairStyle) setHairStyle(partial.hairStyle);
    if (partial.hairColour) setHairColour(partial.hairColour);
    if (partial.eye) setEye(partial.eye);
    if (partial.makeup) setMakeup(partial.makeup);
    if (partial.characterName) setCharacterName(partial.characterName);
    if (partial.age) setAge(partial.age);
    setShowGuided(false);
  }, []);

  const pendingGuidedStart = !isEditing && guidedReady && !!user && (characterCount ?? 0) > 0 && !showGuided;
  const pageHidden = showGuided || pendingGuidedStart || (!guidedReady && !isEditing);

  return (
    <div className={`relative min-h-screen ${pageHidden ? "bg-black" : "bg-background"}`}>
      {pageHidden && <div className="fixed inset-0 z-[9997] bg-black" />}
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />
      <GuidedCreator
        open={showGuided}
        onComplete={handleGuidedComplete}
        onExit={handleGuidedExit}
        skipWelcome={skipWelcome}
      />

      {!pageHidden && (
      <main className="mx-auto flex w-full max-w-lg md:max-w-3xl flex-col px-4 md:px-10 pt-10 pb-[250px]">
        <div className="flex items-center justify-between mb-8">
          <PageTitle className="mb-0">create character</PageTitle>

        </div>

        {/* Hero image box */}
        <section className="mx-auto mb-8 flex w-[92%] max-w-[22rem] items-center justify-center rounded-2xl border-[2px] border-border bg-card" style={{ aspectRatio: "10/11" }}>
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
            className="h-12 w-full rounded-2xl border-[2px] border-border bg-card px-4 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
          />
        </section>

        {/* Age is now in the pill group section below */}

        {/* 7 Pill toggle sections */}
        <section className="mt-5 flex flex-col gap-4">
          <PillGroup label="skin" options={skinOptions} value={skin} onChange={setSkin} />
          <PillGroup label="body type" options={bodyOptions} value={bodyType} onChange={setBodyType} />
          <PillGroup label="age" options={ageOptions} value={age} onChange={setAge} />
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


        {/* Description */}
        <section className="mt-10 flex flex-col gap-1.5">
          <span className="text-xs font-extrabold lowercase text-foreground">text box</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="add any details you want to see"
            rows={8}
            className="min-h-52 w-full resize-none rounded-2xl border-[2px] border-border bg-card px-4 py-3 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
          />
        </section>

        {error && (
          <div className="mt-5 rounded-2xl border-[2px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}

        {/* Create button */}
        <div className="mt-8 mb-6">
          <button
            className="flex h-16 w-full items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold lowercase transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#050a10", color: "#00e0ff", border: "2px solid #00e0ff" }}
            onClick={handleCreate}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                saving...
              </>
            ) : (
              <>
                <Zap size={18} strokeWidth={2.5} />
                {isEditing ? "update" : "create • 30"}
                <Gem size={14} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
              </>
            )}
          </button>
        </div>
      </main>
      )}
    </div>
  );
};

export default CharacterCreator;
