import { useEffect, useMemo, useState } from "react";
import { Camera, Gem, Settings, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GuidedCreator, { type GuidedSelections } from "@/components/GuidedCreator";
import { useAuth } from "@/contexts/AuthContext";
import { useGems } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitiseText } from "@/lib/sanitise";

const STORAGE_KEY = "vizura_character_draft";
const FLOW_STATE_KEY = "vizura_guided_flow_state";

type LatestImage = {
  id: string;
  url: string;
  prompt: string;
  created_at: string;
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { gems } = useGems();
  const [images, setImages] = useState<LatestImage[]>([]);
  const [showGuided, setShowGuided] = useState(false);
  const [skipWelcome, setSkipWelcome] = useState(false);
  const [selectedImage, setSelectedImage] = useState<LatestImage | null>(null);

  useEffect(() => {
    const fetchLatestPhotos = async () => {
      if (!user) {
        setImages([]);
        return;
      }
      const { data } = await supabase
        .from("generations")
        .select("id, image_urls, prompt, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4);

      const latest = (data ?? [])
        .flatMap((generation: any) =>
          (generation.image_urls ?? []).slice(0, 1).map((url: string, index: number) => ({
            id: `${generation.id}-${index}`,
            url,
            prompt: generation.prompt ?? "",
            created_at: generation.created_at,
          })),
        )
        .slice(0, 4);

      setImages(latest);
    };

    void fetchLatestPhotos();
  }, [user]);

  const handleOpenCreator = () => {
    const internalNav = sessionStorage.getItem("vizura_internal_nav") === "1";
    sessionStorage.removeItem("vizura_internal_nav");
    setSkipWelcome(internalNav && !!user);
    setShowGuided(true);
  };

  const handleGuidedComplete = async (selections: GuidedSelections) => {
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
      description: selections.description || "",
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));

    const sk = selections.skin || "tan";
    const bt = selections.bodyType || "regular";
    const ch = selections.chest || "medium";
    const hs = selections.hairStyle || "straight";
    const hc = selections.hairColour || "brunette";
    const ey = selections.eye || "brown";
    const mk = selections.makeup || "natural";
    const ag = selections.age || "25";
    const prompt = `photorealistic portrait, ${ag} year old woman, ${sk} skin, ${bt} body type, ${ch} chest, ${hs} ${hc} hair, ${ey} eyes, ${mk} makeup, professional photography, natural lighting, shallow depth of field, hyperdetailed`;

    sessionStorage.setItem("vizura_guided_prompt", prompt);

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
        description: sanitiseText(`${ch} chest, ${hs} hair. ${selections.description || ""}`, 500),
        generation_prompt: prompt,
      };
      const { data: inserted } = await supabase
        .from("characters")
        .insert(charData)
        .select("id")
        .single();
      if (inserted) {
        sessionStorage.setItem("vizura_pending_char_id", inserted.id);
      }
      navigate("/choose-face", { state: { prompt, characterId: inserted?.id } });
    } else {
      navigate("/choose-face", { state: { prompt } });
    }

    sessionStorage.removeItem(FLOW_STATE_KEY);
    setShowGuided(false);
  };

  const handleGuidedExit = () => {
    setShowGuided(false);
  };

  const photoSlots = useMemo(() => {
    if (images.length > 0) return images;
    return Array.from({ length: 4 }, (_, index) => ({
      id: `placeholder-${index}`,
      url: "",
      prompt: "",
      created_at: "",
    }));
  }, [images]);

  return (
    <div className="relative min-h-screen bg-background">
      <GuidedCreator
        open={showGuided}
        onComplete={handleGuidedComplete}
        onExit={handleGuidedExit}
        skipWelcome={skipWelcome}
      />

      <AnimatePresence>
        {selectedImage && (
          <motion.button
            type="button"
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-card text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            <img src={selectedImage.url} alt="latest photo" className="max-h-full max-w-full rounded-[2rem] object-contain" />
          </motion.button>
        )}
      </AnimatePresence>

      <main className="mx-auto flex h-[calc(100dvh-73px)] w-full max-w-lg flex-col px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleOpenCreator}
            className="flex h-20 items-center justify-center gap-2 rounded-[1.75rem] border-[5px] border-neon-yellow bg-neon-yellow px-4 text-sm font-[900] lowercase text-neon-yellow-foreground transition-transform active:scale-[0.98]"
          >
            <Sparkles size={18} strokeWidth={2.5} />
            create character
          </button>
          <button
            type="button"
            onClick={() => navigate("/create")}
            className="flex h-20 items-center justify-center gap-2 rounded-[1.75rem] border-[5px] border-border bg-card px-4 text-sm font-[900] lowercase text-foreground transition-transform active:scale-[0.98]"
          >
            <Camera size={18} strokeWidth={2.5} />
            create photo
          </button>
        </div>

        <section className="mt-5 flex min-h-0 flex-1 flex-col rounded-[2rem] border-[5px] border-border bg-card px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-[900] lowercase text-foreground">latest photos</h2>
            <span className="text-[10px] font-[900] lowercase text-foreground/35">recent generations</span>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-3">
            {photoSlots.map((photo) => {
              const isPlaceholder = !photo.url;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    if (!isPlaceholder) setSelectedImage(photo);
                  }}
                  className={`overflow-hidden rounded-[1.35rem] border-[4px] transition-transform active:scale-[0.98] ${
                    isPlaceholder
                      ? "border-dashed border-foreground/20 bg-secondary"
                      : "border-border bg-secondary"
                  }`}
                >
                  {isPlaceholder ? (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-[900] lowercase text-foreground/25">
                      empty
                    </div>
                  ) : (
                    <img src={photo.url} alt="latest generated photo" className="h-full w-full object-cover" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate("/top-ups")}
            className="flex h-20 items-center justify-center gap-2 rounded-[1.75rem] border-[5px] border-border bg-card px-4 text-left text-foreground transition-transform active:scale-[0.98]"
          >
            <Gem size={18} strokeWidth={2.5} className="text-gem-green" />
            <span className="text-sm font-[900] lowercase">{gems} gems</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/account")}
            className="flex h-20 items-center justify-center gap-2 rounded-[1.75rem] border-[5px] border-border bg-card px-4 text-sm font-[900] lowercase text-foreground transition-transform active:scale-[0.98]"
          >
            <Settings size={18} strokeWidth={2.5} />
            settings
          </button>
        </div>
      </main>
    </div>
  );
};

export default Home;
