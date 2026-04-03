import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GuidedCreator, { type GuidedSelections } from "@/components/GuidedCreator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useAuth } from "@/contexts/AuthContext";
import { useGems } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitiseText } from "@/lib/sanitise";
import DotDecal from "@/components/DotDecal";

const STORAGE_KEY = "vizura_character_draft";
const FLOW_STATE_KEY = "vizura_guided_flow_state";
const DISMISSED_KEY = "vizura_creator_dismissed";

type LatestImage = {
  id: string;
  url: string;
  prompt: string;
  created_at: string;
};

type CharacterPreview = {
  id: string;
  name: string;
  age: string;
  face_image_url: string | null;
};

const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  if (url.startsWith("data:image/svg")) return false;
  if (url.includes("imgen.x.ai/xai-imgen/xai-tmp-imgen")) return false;
  return true;
};

const Home = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { gems } = useGems();
  const [images, setImages] = useState<LatestImage[]>(() => {
    try {
      const cached = sessionStorage.getItem("vizura_latest_photos");
      if (cached) return JSON.parse(cached) as LatestImage[];
    } catch {}
    return [];
  });
  const [characters, setCharacters] = useState<CharacterPreview[]>([]);
  const [showGuided, setShowGuided] = useState(false);
  const [skipWelcome, setSkipWelcome] = useState(false);
  const [selectedImage, setSelectedImage] = useState<LatestImage | null>(null);
  const [autoOpenEvaluated, setAutoOpenEvaluated] = useState(false);

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
        (g.image_urls ?? []).filter(isValidImageUrl).slice(0, 1).map((url: string, i: number) => ({
          id: `${g.id}-${i}`,
          url,
          prompt: g.prompt ?? "",
          created_at: g.created_at,
        })),
      )
      .slice(0, 8);
    setImages(latest);
    try { sessionStorage.setItem("vizura_latest_photos", JSON.stringify(latest)); } catch {}
  }, [user]);

  const fetchCharacters = useCallback(async () => {
    if (!user) { setCharacters([]); return; }
    const { data } = await supabase
      .from("characters")
      .select("id, name, age, face_image_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4);
    if (data) setCharacters(data as CharacterPreview[]);
  }, [user]);

  useEffect(() => {
    const state = window.history.state?.usr;
    if (state?.openCreator) {
      window.history.replaceState({ ...window.history.state, usr: {} }, "");
      handleOpenCreator();
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setAutoOpenEvaluated(true);
      return;
    }
    const alreadyOpened = sessionStorage.getItem("vizura_auto_opened");
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (!alreadyOpened && !dismissed) {
      sessionStorage.setItem("vizura_auto_opened", "1");
      sessionStorage.removeItem(FLOW_STATE_KEY);
      setSkipWelcome(false);
      setShowGuided(true);
    }
    setAutoOpenEvaluated(true);
    requestAnimationFrame(() => document.getElementById("splash-screen")?.remove());
  }, [authLoading, user]);

  useEffect(() => {
    void fetchLatestPhotos();
    void fetchCharacters();
    const refresh = () => { void fetchLatestPhotos(); void fetchCharacters(); };
    const handleVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchLatestPhotos, fetchCharacters]);

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
    setTimeout(() => setShowGuided(false), 800);
  };

  const handleGuidedExit = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setShowGuided(false);
  };

  const photoSlots = useMemo(() => {
    const slots: LatestImage[] = [];
    for (let i = 0; i < 4; i++) {
      if (i < images.length) slots.push(images[i]);
      else slots.push({ id: `placeholder-${i}`, url: "", prompt: "", created_at: "" });
    }
    return slots;
  }, [images]);

  const charSlots = useMemo(() => {
    const slots: (CharacterPreview | null)[] = [];
    for (let i = 0; i < 4; i++) {
      if (i < characters.length) slots.push(characters[i]);
      else slots.push(null);
    }
    return slots;
  }, [characters]);

  const pageHidden = showGuided || (!autoOpenEvaluated && !user);

  return (
    <div className={`relative min-h-[calc(100dvh-57px)] overflow-hidden ${pageHidden ? "bg-nav" : "bg-background"}`}>
      {pageHidden && <div className="fixed inset-0 z-[9997] bg-nav" />}
      <GuidedCreator
        open={showGuided}
        onComplete={handleGuidedComplete}
        onExit={handleGuidedExit}
        skipWelcome={skipWelcome}
      />

      {!pageHidden && <AnimatePresence>
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
      </AnimatePresence>}

      {!pageHidden && <div className="relative flex h-full flex-col">
        <DotDecal />

        <main className="relative z-[1] mx-auto w-full max-w-lg px-[14px] pt-[54px] pb-6 md:hidden">
          {/* Hero */}
          <h1 className="text-[50px] font-[900] lowercase leading-[0.94] tracking-[-2px] text-white mb-0">
            what are we making today? ✨
          </h1>
          <div className="mt-3 mb-6" style={{ width: 60, height: 6, borderRadius: 3, backgroundColor: "#facc15" }} />

          {/* Two action buttons */}
          <div className="flex gap-2 mb-6">
            {/* Create Character - solid yellow */}
            <button
              type="button"
              onClick={handleOpenCreator}
              className="flex items-center justify-between active:scale-[0.98] transition-transform"
              style={{
                flex: "1 1 0%",
                minWidth: 0,
                backgroundColor: "#facc15",
                padding: "16px 14px",
                borderRadius: 12,
              }}
            >
              <span className="text-[14px] font-[900] lowercase leading-[1.1] text-black text-left">create<br />character</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            {/* Create Photo - opaque secondary */}
            <button
              type="button"
              onClick={() => {
                if (!user) { navigate("/auth?redirect=/create"); return; }
                navigate("/create");
              }}
              className="relative flex items-center justify-between active:scale-[0.98] transition-transform overflow-hidden"
              style={{
                flex: "1 1 0%",
                minWidth: 0,
                backgroundColor: "#000",
                padding: "16px 14px",
                borderRadius: 12,
              }}
            >
              <div className="absolute inset-0" style={{
                backgroundColor: "rgba(250,204,21,0.06)",
                border: "2px solid rgba(250,204,21,0.15)",
                borderRadius: 12,
              }} />
              <span className="relative z-[1] text-[14px] font-[900] lowercase leading-[1.1] text-white text-left">create photo</span>
              <svg className="relative z-[1]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>

          {/* Latest Photos Section */}
          <section className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-[900] lowercase text-white flex items-center gap-1.5">🖼️ latest photos</h2>
              <button onClick={() => navigate("/storage")} className="text-[11px] font-[800] lowercase" style={{ color: "#facc15" }}>
                see all →
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {photoSlots.map((photo) => {
                const isPlaceholder = !photo.url;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => { if (!isPlaceholder) setSelectedImage(photo); }}
                    className="overflow-hidden active:scale-[0.98] transition-transform"
                    style={{
                      borderRadius: 16,
                      border: isPlaceholder ? "2px dashed #222" : "2px solid #222",
                      backgroundColor: "#151515",
                    }}
                  >
                    <AspectRatio ratio={3 / 4}>
                      {isPlaceholder ? (
                        <div className="flex h-full w-full items-center justify-center text-white/20 text-lg font-[300]">+</div>
                      ) : (
                        <img src={photo.url} alt="latest photo" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                    </AspectRatio>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: "#222", margin: "4px 0 16px" }} />

          {/* My Characters Section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-[900] lowercase text-white flex items-center gap-1.5">🧑 my characters</h2>
              <button onClick={() => navigate("/characters")} className="text-[11px] font-[800] lowercase" style={{ color: "#facc15" }}>
                manage →
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {charSlots.map((char, i) => {
                if (!char) {
                  return (
                    <button
                      key={`empty-${i}`}
                      type="button"
                      onClick={handleOpenCreator}
                      className="overflow-hidden active:scale-[0.98] transition-transform"
                      style={{
                        borderRadius: 16,
                        border: "2px dashed #222",
                        backgroundColor: "#151515",
                      }}
                    >
                      <AspectRatio ratio={3 / 4}>
                        <div className="flex h-full w-full items-center justify-center text-white/20 text-lg font-[300]">+</div>
                      </AspectRatio>
                    </button>
                  );
                }
                const hasFace = char.face_image_url && char.face_image_url.startsWith("http");
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => navigate(`/characters/${char.id}`)}
                    className="relative overflow-hidden active:scale-[0.98] transition-transform"
                    style={{
                      borderRadius: 16,
                      border: "2px solid #222",
                      backgroundColor: "#151515",
                    }}
                  >
                    <AspectRatio ratio={3 / 4}>
                      {hasFace ? (
                        <img src={char.face_image_url!} alt={char.name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)">
                            <circle cx="12" cy="8" r="5" />
                            <path d="M3.5 21.5a8.5 8.5 0 0 1 17 0c0 1.1-.9 2-2 2h-13a2 2 0 0 1-2-2Z" />
                          </svg>
                        </div>
                      )}
                    </AspectRatio>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-4">
                      <span className="block text-[11px] font-[900] lowercase text-white leading-tight truncate">{char.name}</span>
                      <span className="block text-[9px] font-[800] lowercase" style={{ color: "rgba(255,255,255,0.35)" }}>age {char.age}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </main>

        {/* Desktop layout */}
        <main className="hidden md:block relative z-[1] w-full max-w-6xl mx-auto px-8 pt-10 pb-16">
          <h1 className="text-[50px] font-[900] lowercase leading-[0.94] tracking-[-2px] text-white mb-0">
            what are we making today? ✨
          </h1>
          <div className="mt-3 mb-8" style={{ width: 60, height: 6, borderRadius: 3, backgroundColor: "#facc15" }} />
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-4 flex flex-col gap-4">
              <button
                type="button"
                onClick={handleOpenCreator}
                className="flex h-20 items-center justify-center gap-3 text-base font-[900] lowercase text-black transition-transform active:scale-[0.98]"
                style={{ backgroundColor: "#facc15", borderRadius: 12 }}
              >
                create character
              </button>
              <button
                type="button"
                onClick={() => { if (!user) { navigate("/auth?redirect=/create"); return; } navigate("/create"); }}
                className="relative flex h-20 items-center justify-center gap-3 text-base font-[900] lowercase text-white transition-transform active:scale-[0.98] overflow-hidden"
                style={{ backgroundColor: "#0b0b0b", borderRadius: 12 }}
              >
                <div className="absolute inset-0" style={{ backgroundColor: "rgba(250,204,21,0.06)", border: "2px solid rgba(250,204,21,0.15)", borderRadius: 12 }} />
                <span className="relative z-[1]">create photo</span>
              </button>
            </div>
            <section className="col-span-8 flex flex-col p-4" style={{ backgroundColor: "#151515", border: "2px solid #222", borderRadius: 16 }}>
              <h2 className="mb-3 text-base font-[900] lowercase text-white">latest photos</h2>
              <div className="grid grid-cols-4 gap-3 flex-1">
                {photoSlots.map((photo) => {
                  const isPlaceholder = !photo.url;
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => { if (!isPlaceholder) setSelectedImage(photo); }}
                      className="overflow-hidden transition-transform active:scale-[0.98]"
                      style={{ borderRadius: 16, border: isPlaceholder ? "2px dashed #222" : "2px solid #222", backgroundColor: "#151515" }}
                    >
                      <AspectRatio ratio={3 / 4}>
                        {isPlaceholder ? (
                          <div className="flex h-full w-full items-center justify-center text-white/20">+</div>
                        ) : (
                          <img src={photo.url} alt="latest photo" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        )}
                      </AspectRatio>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>}
    </div>
  );
};

export default Home;
