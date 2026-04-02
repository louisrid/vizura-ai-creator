import { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, Gem, Settings, Sparkles, FolderOpen, LayoutGrid, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GuidedCreator, { type GuidedSelections } from "@/components/GuidedCreator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useAuth } from "@/contexts/AuthContext";
import { useGems } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitiseText } from "@/lib/sanitise";

const STORAGE_KEY = "vizura_character_draft";
const FLOW_STATE_KEY = "vizura_guided_flow_state";
const DISMISSED_KEY = "vizura_creator_dismissed";

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

  const fetchLatestPhotos = useCallback(async () => {
    if (!user) { setImages([]); return; }
    const { data } = await supabase
      .from("generations")
      .select("id, image_urls, prompt, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);

    const latest = (data ?? [])
      .flatMap((g: any) =>
        (g.image_urls ?? []).slice(0, 1).map((url: string, i: number) => ({
          id: `${g.id}-${i}`,
          url,
          prompt: g.prompt ?? "",
          created_at: g.created_at,
        })),
      )
      .slice(0, 8);
    setImages(latest);
  }, [user]);

  useEffect(() => {
    const state = window.history.state?.usr;
    if (state?.openCreator) {
      window.history.replaceState({ ...window.history.state, usr: {} }, "");
      handleOpenCreator();
    }
  }, []);

  useEffect(() => {
    if (user) return;
    const alreadyOpened = sessionStorage.getItem("vizura_auto_opened");
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (alreadyOpened || dismissed) return;
    sessionStorage.setItem("vizura_auto_opened", "1");
    sessionStorage.removeItem(FLOW_STATE_KEY);
    setSkipWelcome(false);
    setShowGuided(true);
  }, [user]);

  useEffect(() => {
    void fetchLatestPhotos();
    const refresh = () => void fetchLatestPhotos();
    const handleVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchLatestPhotos]);

  const handleOpenCreator = () => {
    sessionStorage.removeItem(DISMISSED_KEY);
    if (user) {
      sessionStorage.removeItem(FLOW_STATE_KEY);
      setSkipWelcome(true);
    } else {
      sessionStorage.removeItem(FLOW_STATE_KEY);
      setSkipWelcome(false);
    }
    setShowGuided(true);
  };

  const handleGuidedComplete = async (selections: GuidedSelections) => {
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
    const ag = selections.age || "25";
    const prompt = `${ag} year old woman, ${sk} skin, ${bt} body type, ${hs} ${hc} hair, ${ey} eyes, ${mk} makeup`;

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
        description: sanitiseText(`${hs} hair. ${selections.description || ""}`, 500),
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
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setShowGuided(false);
  };

  const handleGuidedExit = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setShowGuided(false);
  };

  const photoSlots = useMemo(() => {
    const slots: LatestImage[] = [];
    for (let i = 0; i < 8; i++) {
      if (i < images.length) {
        slots.push(images[i]);
      } else {
        slots.push({ id: `placeholder-${i}`, url: "", prompt: "", created_at: "" });
      }
    }
    return slots;
  }, [images]);

  return (
    <div className="relative min-h-[calc(100dvh-81px)] overflow-hidden bg-background">
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
            transition={{ duration: 0.75, ease: "easeInOut" }}
            onClick={() => setSelectedImage(null)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-card text-foreground"
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            <img src={selectedImage.url} alt="latest photo" className="max-h-full max-w-full rounded-[2rem] object-contain" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="flex h-full flex-col">
        {/* Mobile layout */}
        <main className="mx-auto w-full max-w-lg px-4 pt-10 pb-14 md:hidden">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (!user) { navigate("/auth?redirect=/create"); return; }
                navigate("/create");
              }}
              className="flex h-16 items-center justify-center gap-2 rounded-[1.5rem] border-[5px] border-border bg-card px-3 text-sm font-[900] lowercase text-foreground transition-transform active:scale-[0.98]"
            >
              <Camera size={16} strokeWidth={2.5} />
              create photo
            </button>
            <button
              type="button"
              onClick={handleOpenCreator}
              className="flex h-16 items-center justify-center gap-2 rounded-[1.5rem] border-[5px] border-neon-yellow bg-neon-yellow px-3 text-sm font-[900] lowercase text-neon-yellow-foreground transition-transform active:scale-[0.98]"
            >
              <Sparkles size={16} strokeWidth={2.5} />
              create character
            </button>
          </div>

          <section className="mt-5 flex flex-col rounded-[1.75rem] border-[5px] border-border bg-card px-3 py-3">
            <h2 className="mb-2 text-sm font-[900] lowercase text-foreground">latest photos</h2>
            <div className="grid grid-cols-4 gap-2">
              {photoSlots.slice(0, 4).map((photo) => {
                const isPlaceholder = !photo.url;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => { if (!isPlaceholder) setSelectedImage(photo); }}
                    className={`overflow-hidden rounded-[0.75rem] border-[3px] transition-transform active:scale-[0.98] ${
                      isPlaceholder ? "border-dashed border-foreground/20 bg-secondary" : "border-border bg-secondary"
                    }`}
                  >
                    <AspectRatio ratio={3 / 4}>
                      {isPlaceholder ? (
                        <div className="flex h-full w-full items-center justify-center text-[8px] font-[900] lowercase text-foreground/25">empty</div>
                      ) : (
                        <img src={photo.url} alt="latest photo" className="h-full w-full object-cover" />
                      )}
                    </AspectRatio>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/top-ups")}
              className="flex h-16 items-center justify-center gap-2 rounded-[1.5rem] border-[5px] border-border bg-card px-3 text-left text-foreground transition-transform active:scale-[0.98]"
            >
              <Gem size={16} strokeWidth={2.5} className="text-gem-green" />
              <span className="text-sm font-[900] lowercase">{gems} gems</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/account")}
              className="flex h-16 items-center justify-center gap-2 rounded-[1.5rem] border-[5px] border-border bg-card px-3 text-sm font-[900] lowercase text-foreground transition-transform active:scale-[0.98]"
            >
              <Settings size={16} strokeWidth={2.5} />
              settings
            </button>
          </div>
        </main>

        {/* Desktop layout — full width grid */}
        <main className="hidden md:block w-full max-w-6xl mx-auto px-8 pt-10 pb-16">
          <div className="grid grid-cols-12 gap-5">
            {/* Left column — actions */}
            <div className="col-span-4 flex flex-col gap-4">
              <button
                type="button"
                onClick={handleOpenCreator}
                className="flex h-20 items-center justify-center gap-3 rounded-[1.5rem] border-[5px] border-neon-yellow bg-neon-yellow px-4 text-base font-[900] lowercase text-neon-yellow-foreground transition-transform active:scale-[0.98]"
              >
                <Sparkles size={20} strokeWidth={2.5} />
                create character
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!user) { navigate("/auth?redirect=/create"); return; }
                  navigate("/create");
                }}
                className="flex h-20 items-center justify-center gap-3 rounded-[1.5rem] border-[5px] border-border bg-card px-4 text-base font-[900] lowercase text-foreground transition-transform active:scale-[0.98]"
              >
                <Camera size={20} strokeWidth={2.5} />
                create photo
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/characters")}
                  className="flex h-16 items-center justify-center gap-2 rounded-[1.5rem] border-[5px] border-border bg-card px-3 text-sm font-[900] lowercase text-foreground transition-transform active:scale-[0.98]"
                >
                  <LayoutGrid size={16} strokeWidth={2.5} />
                  characters
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/storage")}
                  className="flex h-16 items-center justify-center gap-2 rounded-[1.5rem] border-[5px] border-border bg-card px-3 text-sm font-[900] lowercase text-foreground transition-transform active:scale-[0.98]"
                >
                  <FolderOpen size={16} strokeWidth={2.5} />
                  storage
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/top-ups")}
                  className="flex h-16 items-center justify-center gap-2 rounded-[1.5rem] border-[5px] border-border bg-card px-3 text-foreground transition-transform active:scale-[0.98]"
                >
                  <Gem size={16} strokeWidth={2.5} className="text-gem-green" />
                  <span className="text-sm font-[900] lowercase">{gems} gems</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/account")}
                  className="flex h-16 items-center justify-center gap-2 rounded-[1.5rem] border-[5px] border-border bg-card px-3 text-sm font-[900] lowercase text-foreground transition-transform active:scale-[0.98]"
                >
                  <Settings size={16} strokeWidth={2.5} />
                  settings
                </button>
              </div>
            </div>

            {/* Right column — latest photos grid */}
            <section className="col-span-8 flex flex-col rounded-[1.75rem] border-[5px] border-border bg-card px-4 py-4">
              <h2 className="mb-3 text-base font-[900] lowercase text-foreground">latest photos</h2>
              <div className="grid grid-cols-4 gap-3 flex-1">
                {photoSlots.map((photo) => {
                  const isPlaceholder = !photo.url;
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => { if (!isPlaceholder) setSelectedImage(photo); }}
                      className={`overflow-hidden rounded-[1rem] border-[3px] transition-transform active:scale-[0.98] ${
                        isPlaceholder ? "border-dashed border-foreground/20 bg-secondary" : "border-border bg-secondary"
                      }`}
                    >
                      <AspectRatio ratio={3 / 4}>
                        {isPlaceholder ? (
                          <div className="flex h-full w-full items-center justify-center text-[9px] font-[900] lowercase text-foreground/25">empty</div>
                        ) : (
                          <img src={photo.url} alt="latest photo" className="h-full w-full object-cover" />
                        )}
                      </AspectRatio>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
