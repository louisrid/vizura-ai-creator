import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Loader2, Zap, Sparkles, ChevronDown, Gem } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import BackButton from "@/components/BackButton";
import PaywallOverlay from "@/components/PaywallOverlay";
import PageTitle from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitiseText } from "@/lib/sanitise";

interface Character {
  id: string;
  name: string;
  country: string;
  age: string;
  hair: string;
  eye: string;
  body: string;
  style: string;
  description: string;
  face_image_url: string | null;
}

const randomPrompts = [
  "confident woman in golden hour light, rooftop terrace",
  "woman with freckles and green eyes, coffee shop, warm tones",
  "athletic woman, beach sunset, windswept hair",
  "elegant woman, black dress, city night lights",
  "woman with curly hair, studio portrait, soft shadows",
];

const buildPromptFromCharacter = (c: Character): string => {
  const ethnicityPart = c.country !== "any" ? `, ${c.country} ethnicity` : "";
  let prompt = `photorealistic portrait, ${c.age} year old woman${ethnicityPart}, ${c.body} body type, ${c.hair} hair, ${c.eye} eyes, ${c.style} style`;
  if (c.description.trim()) prompt += `, ${c.description.trim()}`;
  return prompt;
};

const Index = () => {
  const { user } = useAuth();
  const { credits, gems, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharId, setSelectedCharId] = useState("");

  const preselectedCharacterId = (location.state as any)?.preselectedCharacterId;

  useEffect(() => {
    if (searchParams.get("upgrade") === "true") setShowPaywall(true);
  }, [searchParams]);

  useEffect(() => {
    const fetchCharacters = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) {
        setCharacters(data as Character[]);
        if (preselectedCharacterId) {
          const char = data.find((c: any) => c.id === preselectedCharacterId);
          if (char) { setSelectedCharId(preselectedCharacterId); setPrompt(buildPromptFromCharacter(char as Character)); }
        }
      }
    };
    fetchCharacters();
  }, [user, preselectedCharacterId]);

  const handleCharacterSelect = (charId: string) => {
    setSelectedCharId(charId);
  };

  // All characters are selectable — the starter "ava" has a generation_prompt so treat her as ready
  const allCharacters = characters;

  const handleCreate = async () => {
    if (!user) { navigate(`/account?redirect=${encodeURIComponent("/create")}`); return; }
    if (credits <= 0) { setShowPaywall(true); return; }
    if (!prompt.trim()) { toast.error("describe your photo first"); return; }

    setIsGenerating(true);
    setImages([]);
    setError("");

    const cleanPrompt = sanitiseText(prompt.trim());

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: { prompt: cleanPrompt },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setImages(data.images || []);
      await refetchCredits();
      toast("1 gem used");
    } catch (e: any) {
      if (e.message?.includes("No gems") || e.message?.includes("No credits") || e.message?.includes("402")) {
        setShowPaywall(true);
      } else {
        setError(e.message || "creation failed");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <main className="w-full max-w-lg mx-auto px-4 pt-14 pb-10">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <PageTitle className="mb-0">create photo</PageTitle>
        </div>

        {/* Hero image box */}
        <section className="mx-auto mb-8 flex w-[92%] max-w-[22rem] items-center justify-center rounded-2xl border-[5px] border-border bg-card" style={{ aspectRatio: "10/11" }}>
          {images[0] ? (
            <img src={images[0]} alt="generated photo" className="h-full w-full object-cover rounded-[calc(1rem-5px)]" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neon-yellow">
              <Sparkles size={28} strokeWidth={2.5} className="text-neon-yellow-foreground" />
            </div>
          )}
        </section>

        <div className="space-y-6">
          {/* Character select */}
          <div>
            <span className="block text-xs font-extrabold lowercase text-foreground mb-3">select character</span>
            <label className="relative block">
              <select
                value={selectedCharId}
                onChange={(e) => handleCharacterSelect(e.target.value)}
                className="h-14 w-full appearance-none rounded-2xl border-[5px] border-border bg-card px-4 pr-10 text-sm font-extrabold lowercase text-foreground outline-none transition-colors focus:border-foreground"
              >
                <option value="">none</option>
                {allCharacters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || `${c.hair} hair, ${c.eye} eyes, ${c.age}y`}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                strokeWidth={2.5}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-foreground"
              />
            </label>
            {characters.length === 0 && user && (
              <button
                onClick={() => { sessionStorage.setItem("vizura_internal_nav", "1"); navigate("/"); }}
                className="mt-2 text-[10px] font-extrabold lowercase text-neon-yellow hover:opacity-80 transition-colors"
              >
                create your first character →
              </button>
            )}
          </div>

          {/* Prompt */}
          <div>
            <span className="block text-xs font-extrabold lowercase text-foreground mb-3">describe your photo</span>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="woman in golden hour light, rooftop..."
              className="w-full rounded-2xl border-[5px] border-border bg-card px-4 py-4 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="mt-10 rounded-2xl border-[5px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}

        <div className="mt-10">
          <button
            className="w-full h-16 rounded-2xl text-sm font-extrabold lowercase transition-all bg-neon-yellow text-neon-yellow-foreground hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
            onClick={handleCreate}
            disabled={isGenerating || (!!user && !prompt.trim())}
          >
            {isGenerating ? (
              <><Loader2 className="animate-spin" size={18} />creating...</>
            ) : (
              <>
                <Zap size={18} strokeWidth={2.5} />
                create
                <Gem size={14} strokeWidth={2.5} className="text-neon-yellow-foreground/60 ml-1" />
                <span className="text-[11px] ml-0.5">1</span>
              </>
            )}
          </button>
        </div>

        {/* Gem balance */}
        {user && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Gem size={14} strokeWidth={2.5} className="text-gem-green" />
            <span className="text-xs font-extrabold lowercase text-foreground/50">{gems} gems remaining</span>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
