import { useMemo, useState, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Zap, Upload, Sparkles } from "lucide-react";
import PageTitle from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import PaywallOverlay from "@/components/PaywallOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitiseText } from "@/lib/sanitise";

const skinOptions = ["pale", "tan", "asian", "black"] as const;
const hairOptions = ["blonde", "brunette", "black", "pink", "white"] as const;
const eyeOptions = ["brown", "blue", "green", "hazel", "grey"] as const;
const bodyOptions = ["slim", "regular", "curvy"] as const;
const styleOptions = ["natural", "model", "egirl"] as const;

const STORAGE_KEY = "vizura_character_draft";

/* ── Pill toggle group ── */
const PillGroup = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
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

  const [skin, setSkin] = useState<string>(searchParams.get("skin") || saved?.skin || "tanned");
  const [age, setAge] = useState<string>(searchParams.get("age") || saved?.age || "");
  const [hair, setHair] = useState<string>(searchParams.get("hair") || saved?.hair || "brunette");
  const [eye, setEye] = useState<string>(searchParams.get("eye") || saved?.eye || "brown");
  const [body, setBody] = useState<string>(searchParams.get("body") || saved?.body || "regular");
  const [style, setStyle] = useState<string>(searchParams.get("style") || saved?.style || "natural");
  const [description, setDescription] = useState(searchParams.get("description") || searchParams.get("edit") || saved?.description || "");
  const [characterName, setCharacterName] = useState(searchParams.get("name") || saved?.characterName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceImage(file);
    setReferencePreview(URL.createObjectURL(file));
  };

  const buildPrompt = () => {
    const skinPart = skin ? `, ${skin} skin` : "";
    let prompt = `photorealistic portrait, ${age || "25"} year old woman${skinPart}, ${body} body type, ${hair} hair, ${eye} eyes, ${style} style`;
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
        country: sanitiseText(skin, 50),
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

  const saveFormToSession = () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      characterName, skin, age, hair, eye, body, style, description,
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

        {/* Pill toggle sections */}
        <section className="mt-5 flex flex-col gap-4">
          <PillGroup label="style" options={styleOptions} value={style} onChange={setStyle} />
          <PillGroup label="skin" options={skinOptions} value={skin} onChange={setSkin} />
          <PillGroup label="hair colour" options={hairOptions} value={hair} onChange={setHair} />
          <PillGroup label="eye colour" options={eyeOptions} value={eye} onChange={setEye} />
          <PillGroup label="body type" options={bodyOptions} value={body} onChange={setBody} />

          {/* Age — text input */}
          <div className="flex flex-col gap-1.5">
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
          </div>
        </section>

        {/* Description */}
        <section className="mt-5 flex flex-col gap-1.5">
          <textarea
            id="character-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="type extra stuff here"
            rows={3}
            className="min-h-24 w-full resize-none rounded-2xl border-[5px] border-border bg-card px-4 py-3 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
          />
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

        {error && (
          <div className="mt-5 rounded-2xl border-[5px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
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

export default CharacterCreator;
