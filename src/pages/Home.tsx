import { useCallback, useEffect, useMemo, useState } from "react";
import { X, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import GuidedCreator, { type GuidedSelections } from "@/components/GuidedCreator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
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
  const location = useLocation();
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
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [charsLoaded, setCharsLoaded] = useState(false);
  const [showGuided, setShowGuided] = useState(false);
  const [skipWelcome, setSkipWelcome] = useState(false);
  const [selectedImage, setSelectedImage] = useState<LatestImage | null>(null);
  const [autoOpenEvaluated, setAutoOpenEvaluated] = useState(false);
  const openCreatorRequested = Boolean((location.state as any)?.openCreator);

  const fetchLatestPhotos = useCallback(async () => {
    if (!user) { setImages([]); setPhotosLoaded(true); return; }
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
    setPhotosLoaded(true);
    try { sessionStorage.setItem("vizura_latest_photos", JSON.stringify(latest)); } catch {}
  }, [user]);

  const fetchCharacters = useCallback(async () => {
    if (!user) { setCharacters([]); setCharsLoaded(true); return; }
    const { data } = await supabase
      .from("characters")
      .select("id, name, age, face_image_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4);
    if (data) setCharacters(data as CharacterPreview[]);
    setCharsLoaded(true);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    const pendingPostAuthHome = sessionStorage.getItem("vizura_post_auth_home") === "1";
    if (user || pendingPostAuthHome) {
      if (!openCreatorRequested) setShowGuided(false);
      setAutoOpenEvaluated(true);
      requestAnimationFrame(() => document.getElementById("splash-screen")?.remove());
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
  }, [authLoading, openCreatorRequested, user]);

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

  function handleOpenCreator() {
    sessionStorage.removeItem(DISMISSED_KEY);
    setSkipWelcome(!!user);
    setShowGuided(true);
  }

  useEffect(() => {
    if (openCreatorRequested) {
      navigate(location.pathname, { replace: true, state: {} });
      handleOpenCreator();
    }
  }, [location.pathname, navigate, openCreatorRequested, user]);

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
    const ag = selections.age === "18-24" ? "18" : selections.age === "24+" ? "24" : selections.age || "18";
    const prompt = `${ag} year old woman, ${sk} skin, ${hs} ${hc} hair, ${ey} eyes, ${mk} makeup`;

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
      navigate("/choose-face", { state: { prompt, characterId: inserted?.id, freshCreation: true } });
    } else {
      navigate("/choose-face", { state: { prompt, freshCreation: true } });
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

        <main className="relative z-[1] mx-auto w-full max-w-lg px-[14px] pt-6 pb-[250px] md:hidden">
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
                fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Rounded', system-ui, sans-serif",
              }}
            >
              <span className="text-[16px] font-[900] lowercase leading-[1.0] text-black text-left">create<br />character</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            {/* Create Photo - matches see all / manage style */}
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
                padding: "16px 14px",
                borderRadius: 12,
                fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Rounded', system-ui, sans-serif",
                color: "#facc15",
                backgroundColor: "#111111",
                border: "2px solid #facc15",
              }}
            >
              <span className="relative z-[1] text-[16px] font-[900] lowercase leading-[1.0] text-left" style={{ color: "#facc15" }}>create<br />photo</span>
              <svg className="relative z-[1]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </div>

          {/* Latest Photos Section */}
          <section className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-[900] lowercase flex items-center gap-1.5" style={{ color: "#ffffff" }}>latest photos 🖼️</h2>
              <button onClick={() => navigate("/storage")} className="text-[11px] font-[800] lowercase px-3 py-1.5 active:scale-95 transition-transform" style={{ color: "#facc15", backgroundColor: "#111111", border: "2px solid #facc15", borderRadius: 12 }}>
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
                      backgroundColor: "#111111",
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
              <h2 className="text-[15px] font-[900] lowercase flex items-center gap-1.5" style={{ color: "#ffffff" }}>my characters 🧑</h2>
              <button onClick={() => navigate("/characters")} className="text-[11px] font-[800] lowercase px-3 py-1.5 active:scale-95 transition-transform" style={{ color: "#facc15", backgroundColor: "#111111", border: "2px solid #facc15", borderRadius: 12 }}>
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
                        backgroundColor: "#111111",
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
                      backgroundColor: "#111111",
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
                      <span className="block text-[9px] font-[800] lowercase" style={{ color: "rgba(255,255,255,0.4)" }}>age {char.age}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </main>

        {/* Desktop layout */}
        <main className="hidden md:block relative z-[1] w-full max-w-5xl mx-auto px-10 pt-6 pb-[250px]">
          <h1 className="text-[64px] font-[900] lowercase leading-[0.94] tracking-[-2px] text-white mb-0">
            what are we making today? ✨
          </h1>
          <div className="mt-4 mb-10" style={{ width: 70, height: 7, borderRadius: 3, backgroundColor: "#facc15" }} />
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4 flex flex-col gap-4">
              <button
                type="button"
                onClick={handleOpenCreator}
                className="flex h-24 items-center justify-center gap-3 text-lg font-[900] lowercase text-black transition-transform active:scale-[0.98]"
                style={{ backgroundColor: "#facc15", borderRadius: 14 }}
              >
                create character
              </button>
              <button
                type="button"
                onClick={() => { if (!user) { navigate("/auth?redirect=/create"); return; } navigate("/create"); }}
                className="relative flex h-24 items-center justify-center gap-3 text-lg font-[900] lowercase text-white transition-transform active:scale-[0.98] overflow-hidden"
                style={{ backgroundColor: "#111111", borderRadius: 14 }}
              >
                <div className="absolute inset-0" style={{ backgroundColor: "#111111", border: "2px solid #facc15", borderRadius: 14 }} />
                <span className="relative z-[1]">create photo</span>
              </button>
            </div>
            <section className="col-span-8 flex flex-col p-5" style={{ backgroundColor: "#151515", border: "2px solid #222", borderRadius: 18 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-[900] lowercase" style={{ color: "#ffffff" }}>latest photos 🖼️</h2>
                <button onClick={() => navigate("/storage")} className="text-[12px] font-[800] lowercase px-3 py-1.5 active:scale-95 transition-transform" style={{ color: "#facc15", backgroundColor: "#111111", border: "2px solid #facc15", borderRadius: 12 }}>
                  see all →
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4 flex-1">
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
                          <div className="flex h-full w-full items-center justify-center text-white/20 text-xl">+</div>
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
          {/* Desktop characters section */}
          <section className="mt-6 p-5" style={{ backgroundColor: "#151515", border: "2px solid #222", borderRadius: 18 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-[900] lowercase flex items-center gap-2" style={{ color: "#ffffff" }}>my characters 🧑</h2>
              <button onClick={() => navigate("/characters")} className="text-[12px] font-[800] lowercase px-3 py-1.5 active:scale-95 transition-transform" style={{ color: "#facc15", backgroundColor: "#111111", border: "2px solid #facc15", borderRadius: 12 }}>
                manage →
              </button>
            </div>
            <div className="grid grid-cols-6 gap-4">
              {[...charSlots, null, null].slice(0, 6).map((char, i) => {
                if (!char) {
                  return (
                    <button
                      key={`empty-${i}`}
                      type="button"
                      onClick={handleOpenCreator}
                      className="overflow-hidden active:scale-[0.98] transition-transform"
                      style={{ borderRadius: 16, border: "2px dashed #222", backgroundColor: "#111111" }}
                    >
                      <AspectRatio ratio={3 / 4}>
                        <div className="flex h-full w-full items-center justify-center text-white/20 text-xl font-[300]">+</div>
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
                    style={{ borderRadius: 16, border: "2px solid #222", backgroundColor: "#111111" }}
                  >
                    <AspectRatio ratio={3 / 4}>
                      {hasFace ? (
                        <img src={char.face_image_url!} alt={char.name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)">
                            <circle cx="12" cy="8" r="5" />
                            <path d="M3.5 21.5a8.5 8.5 0 0 1 17 0c0 1.1-.9 2-2 2h-13a2 2 0 0 1-2-2Z" />
                          </svg>
                        </div>
                      )}
                    </AspectRatio>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2.5 pt-5">
                      <span className="block text-[12px] font-[900] lowercase text-white leading-tight truncate">{char.name}</span>
                      <span className="block text-[10px] font-[800] lowercase" style={{ color: "rgba(255,255,255,0.4)" }}>age {char.age}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      </div>}
    </div>
  );
};

export default Home;
