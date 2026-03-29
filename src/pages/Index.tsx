import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Loader2, Zap, Shuffle, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
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
  const { credits, refetch: refetchCredits } = useCredits();
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
          if (char) {
            setSelectedCharId(preselectedCharacterId);
            setPrompt(buildPromptFromCharacter(char as Character));
          }
        }
      }
    };
    fetchCharacters();
  }, [user, preselectedCharacterId]);

  const handleCharacterSelect = (charId: string) => {
    setSelectedCharId(charId);
    if (!charId) return;
    const char = characters.find((c) => c.id === charId);
    if (char) setPrompt(buildPromptFromCharacter(char));
  };

  const handleCreate = async () => {
    if (!user) { navigate(`/account?redirect=${encodeURIComponent("/create")}`); return; }
    if (credits <= 0) { setShowPaywall(true); return; }
    if (!prompt.trim()) {
      toast.error("describe your photo first");
      return;
    }

    setIsGenerating(true);
    setImages([]);
    setError("");

    const fullPrompt = prompt.trim();
    const cleanPrompt = sanitiseText(fullPrompt);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: { prompt: cleanPrompt },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setImages(data.images || []);
      await refetchCredits();
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

  const handleRandom = () => {
    const randomPrompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
    setPrompt(randomPrompt);
    setSelectedCharId("");
  };

  return (
    <div className="relative min-h-screen bg-background">
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <main className="mx-auto flex w-full max-w-lg flex-col px-4 pt-14 pb-28">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <PageTitle className="mb-0">create photo</PageTitle>
        </div>

        {/* Top section: Photo preview left, Character select + prompt right */}
        <section className="flex gap-3 mb-6">
          {/* Photo preview box */}
          <div
            className="shrink-0 flex items-center justify-center rounded-2xl border-[5px] border-border bg-card overflow-hidden"
            style={{ width: "42%", aspectRatio: "3/4" }}
          >
            {images[0] ? (
              <img src={images[0]} alt="generated photo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-yellow">
                <Sparkles size={24} strokeWidth={2.5} className="text-black" />
              </div>
            )}
          </div>

          {/* Character select + credits */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            {/* Character selector */}
            <label className="relative">
              <select
                value={selectedCharId}
                onChange={(e) => handleCharacterSelect(e.target.value)}
                className="h-11 w-full appearance-none rounded-2xl border-[5px] border-border bg-card px-3 pr-8 text-xs font-extrabold lowercase text-foreground outline-none transition-colors focus:border-foreground"
              >
                <option value="">select character...</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || `${c.hair} hair, ${c.eye} eyes`}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                strokeWidth={3}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50"
              />
            </label>

            {characters.length === 0 && user && (
              <button
                onClick={() => navigate("/")}
                className="text-[10px] font-extrabold lowercase text-neon-yellow hover:opacity-80 transition-colors text-left"
              >
                create your first character →
              </button>
            )}

            {/* Quick prompt input */}
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="quick prompt..."
              className="h-11 w-full rounded-2xl border-[5px] border-border bg-card px-3 text-xs font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
            />

            {/* Credits display */}
            {user && (
              <div className="flex items-center gap-1 text-[10px] font-extrabold text-foreground/50 lowercase mt-1">
                <Sparkles size={11} className="text-neon-yellow" />
                {credits} credit{credits !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </section>

        {/* Full-width scene description */}
        <section className="mb-6">
          <label className="text-xs font-extrabold lowercase text-foreground mb-2 block">
            scene description
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="describe the scene, lighting, outfit, pose, mood…"
            rows={4}
            className="min-h-28 w-full resize-none rounded-2xl border-[5px] border-border bg-card px-4 py-3 text-sm font-extrabold lowercase text-foreground placeholder:text-foreground/30 focus:border-foreground focus:outline-none transition-colors"
          />
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border-[5px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            className="flex-1 h-14 text-sm"
            onClick={handleCreate}
            disabled={isGenerating || (!!user && !prompt.trim())}
          >
            {isGenerating ? (
              <><Loader2 className="animate-spin" size={18} />creating...</>
            ) : (
              <><Zap size={18} strokeWidth={2.5} />create</>
            )}
          </Button>
          <Button
            variant="outline"
            className="h-14 px-5"
            onClick={handleRandom}
            disabled={isGenerating}
          >
            <Shuffle size={18} strokeWidth={2.5} />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Index;
