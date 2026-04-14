import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { displayAge } from "@/lib/displayAge";
import { User, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import GuidedCreator, { type GuidedSelections } from "@/components/GuidedCreator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useGems } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchAndCacheOnboardingState, needsOnboardingRedirect, readCachedOnboardingState } from "@/lib/onboardingState";

import DotDecal from "@/components/DotDecal";
import ModalCloseButton from "@/components/ModalCloseButton";

const STORAGE_KEY = "facefox_character_draft";
const DRAFT_BACKUP_KEY = "facefox_character_draft_backup";
const FLOW_STATE_KEY = "facefox_guided_flow_state";
const DISMISSED_KEY = "facefox_creator_dismissed";

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

/* Lock overlay — 80% black, clips to button shape including border */
const LockOverlay = ({ borderRadius = 10 }: { borderRadius?: number }) => (
  <div
    className="pointer-events-auto absolute"
    style={{
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.80)",
      borderRadius: Math.max(borderRadius - 2, 0),
      boxShadow: "0 0 0 4px rgba(0,0,0,0.80)",
      zIndex: 20,
    }}
  />
);

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { gems } = useGems();
  const locationState = ((location.state as { openCreator?: boolean; onboardingRedirect?: boolean } | null) ?? null);
  const [images, setImages] = useState<LatestImage[]>(() => {
    try {
      const cached = sessionStorage.getItem("facefox_latest_photos");
      if (cached) return JSON.parse(cached) as LatestImage[];
    } catch {}
    return [];
  });
  const [characters, setCharacters] = useState<CharacterPreview[]>([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [charsLoaded, setCharsLoaded] = useState(false);
  const cachedStateNeedsVerification = !!user && !!cachedOnboardingState && needsOnboardingRedirect(cachedOnboardingState);
  const [showGuided, setShowGuided] = useState(false);
  const [skipWelcome, setSkipWelcome] = useState(false);
  const [selectedImage, setSelectedImage] = useState<LatestImage | null>(null);
  const [autoOpenEvaluated, setAutoOpenEvaluated] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(() => cachedOnboardingState?.onboardingComplete ?? true);
  const [lockStateResolved, setLockStateResolved] = useState(() => !user || (!!cachedOnboardingState && !cachedStateNeedsVerification));
  const [characterCount, setCharacterCount] = useState(() => cachedOnboardingState?.characterCount ?? 0);
  const isOnboardingUser = !!user && lockStateResolved && !onboardingComplete && characterCount === 0;
  const openCreatorRequested = Boolean(locationState?.openCreator);
  const onboardingRedirectRequested = Boolean(locationState?.onboardingRedirect);

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
    try { sessionStorage.setItem("facefox_latest_photos", JSON.stringify(latest)); } catch {}
  }, [user]);

  const fetchCharacters = useCallback(async () => {
    if (!user) { setCharacters([]); setCharsLoaded(true); return; }
    const { data } = await supabase
      .from("characters")
      .select("id, name, age, face_image_url, face_angle_url, body_anchor_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      const complete = (data as any[]).filter(
        (c) => c.face_image_url && c.face_angle_url && c.body_anchor_url
      );
      setCharacters(complete.slice(0, 4) as CharacterPreview[]);
    }
    setCharsLoaded(true);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    const pendingPostAuthHome = sessionStorage.getItem("facefox_post_auth_home") === "1";
    if (user || pendingPostAuthHome) {
      if (!openCreatorRequested && !isOnboardingUser) setShowGuided(false);
      if (isOnboardingUser) setSkipWelcome(true);
      setAutoOpenEvaluated(true);
      requestAnimationFrame(() => document.getElementById("splash-screen")?.remove());
      return;
    }

    const alreadyOpened = sessionStorage.getItem("facefox_auto_opened");
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (!alreadyOpened && !dismissed) {
      sessionStorage.setItem("facefox_auto_opened", "1");
      sessionStorage.removeItem(FLOW_STATE_KEY);
      setSkipWelcome(false);
      setShowGuided(true);
    }
    setAutoOpenEvaluated(true);
    requestAnimationFrame(() => document.getElementById("splash-screen")?.remove());
  }, [authLoading, openCreatorRequested, user]);

  // When lock state resolves and user needs onboarding, force guided creator open
  useEffect(() => {
    if (!lockStateResolved || !user) return;
    if (!onboardingComplete && characterCount === 0) {
      setShowGuided(true);
      setSkipWelcome(true);
      setAutoOpenEvaluated(true);
    }
  }, [lockStateResolved, user, onboardingComplete, characterCount]);

  // Clear blackout once GuidedCreator is open (covers auth→home transition)
  useEffect(() => {
    if (showGuided) {
      // Small delay to ensure GuidedCreator portal has mounted
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("facefox:blackout:end"));
      });
    }
  }, [showGuided]);

  // Fetch all data in parallel — resolve lock state atomically
  useEffect(() => {
    if (!user) {
      setOnboardingComplete(true);
      setLockStateResolved(false);
      setCharacterCount(0);
      void Promise.all([fetchLatestPhotos(), fetchCharacters()]);
      return;
    }

    const applyResolvedState = (resolvedState: { onboardingComplete: boolean; characterCount: number }) => {
      if (cancelled) return;
      setOnboardingComplete(resolvedState.onboardingComplete);
      setCharacterCount(resolvedState.characterCount);
      setLockStateResolved(true);

      if (resolvedState.characterCount > 0 && !openCreatorRequested) {
        setShowGuided(false);
      }
    };

    if (cachedOnboardingState && !needsOnboardingRedirect(cachedOnboardingState)) {
      setOnboardingComplete(cachedOnboardingState.onboardingComplete);
      setCharacterCount(cachedOnboardingState.characterCount);
      setLockStateResolved(true);
    } else {
      setLockStateResolved(false);
    }

    let cancelled = false;

    const refreshAll = async () => {
      const [, , resolvedState] = await Promise.all([
        fetchLatestPhotos(),
        fetchCharacters(),
        fetchAndCacheOnboardingState(user.id),
      ]);
      applyResolvedState(resolvedState);
    };

    void refreshAll();

    const refreshMedia = () => { void Promise.all([fetchLatestPhotos(), fetchCharacters()]); };
    const handleVisibility = () => { if (document.visibilityState === "visible") refreshMedia(); };
    const handleTestReset = () => { void refreshAll(); };

    window.addEventListener("focus", refreshMedia);
    window.addEventListener("pageshow", refreshMedia);
    window.addEventListener("facefox:test-reset-complete", handleTestReset);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshMedia);
      window.removeEventListener("pageshow", refreshMedia);
      window.removeEventListener("facefox:test-reset-complete", handleTestReset);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [cachedOnboardingState, fetchLatestPhotos, fetchCharacters, openCreatorRequested, user]);

  function handleOpenCreator(forceFullFlow?: boolean | React.MouseEvent) {
    const isFull = typeof forceFullFlow === "boolean" ? forceFullFlow : false;
    sessionStorage.removeItem(DISMISSED_KEY);
    setSkipWelcome(isFull ? false : !!user);
    setShowGuided(true);
  }

  useEffect(() => {
    if (openCreatorRequested) {
      navigate(location.pathname, { replace: true, state: {} });
      handleOpenCreator(onboardingRedirectRequested);
    }
  }, [location.pathname, navigate, onboardingRedirectRequested, openCreatorRequested, user]);

  const handleGuidedComplete = async (selections: GuidedSelections) => {
    const draft = {
      characterName: selections.characterName,
      skin: selections.skin || "tan",
      bodyType: selections.bodyType || "regular",
      bustSize: selections.bustSize || "regular",
      hairStyle: selections.hairStyle || "long straight",
      hairColour: selections.hairColour || "brunette",
      eye: selections.eye || "brown",
      age: selections.age,
      description: selections.description || "",
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    localStorage.setItem(DRAFT_BACKUP_KEY, JSON.stringify(draft));

    const sk = selections.skin || "tan";
    const hs = selections.hairStyle || "long straight";
    const hc = selections.hairColour || "brunette";
    const ey = selections.eye || "brown";
    const ag = selections.age === "18-24" ? "18" : selections.age === "24+" ? "24" : selections.age || "18";
    const prompt = `${ag} year old woman, ${sk} skin, ${hs} ${hc} hair, ${ey} eyes`;

    sessionStorage.setItem("facefox_guided_prompt", prompt);
    sessionStorage.removeItem("facefox_face_options");
    sessionStorage.removeItem("facefox_pending_char_id");
    navigate("/choose-face", { state: { prompt, freshCreation: true } });

    sessionStorage.removeItem(FLOW_STATE_KEY);
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setTimeout(() => setShowGuided(false), 600);
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

  // Lock conditions: only show locks after state is confirmed — never flash for users with characters
  const showLocks = lockStateResolved && !onboardingComplete && characterCount === 0;
  const forceOnboarding = !!user && lockStateResolved && !onboardingComplete && characterCount === 0;

  // Never trap logged-in users behind a blank startup screen while state revalidates.
  const pageHidden = showGuided || (!autoOpenEvaluated && !user) || authLoading;

  return (
    <div className={`relative min-h-[calc(100dvh-57px)] overflow-hidden ${pageHidden ? "bg-nav" : "bg-background"}`}>
      {/* Black screen portal — renders outside route animation wrapper so it's never affected by page fade-in */}
      {pageHidden && createPortal(
        <div className="fixed inset-0 bg-nav" style={{ zIndex: 9995 }} />,
        document.body,
      )}
      <GuidedCreator
        open={showGuided}
        onComplete={handleGuidedComplete}
        onExit={handleGuidedExit}
        skipWelcome={skipWelcome}
      />

      {!pageHidden && <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="fixed inset-0 z-[9998] flex items-center justify-center px-6 pt-24 pb-6"
            style={{ backgroundColor: "rgba(0,0,0,0.83)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-[280px] md:max-w-[400px]"
            >
              <ModalCloseButton onClick={() => setSelectedImage(null)} />
              <div className="overflow-hidden" style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10, border: "2px solid hsl(var(--border-mid))" }}>
                <img src={selectedImage.url} alt="latest photo" className="w-full object-contain max-h-[50vh]" />
                {selectedImage.prompt && selectedImage.prompt !== "character references" && selectedImage.prompt !== "face generation" && (
                  <div className="px-3 pt-2.5 pb-3">
                    <p className="text-[10px] font-[800] lowercase leading-snug" style={{ color: "#ffffff" }}>
                      {selectedImage.prompt}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>}

      {!pageHidden && <div className="relative flex h-full flex-col">
        <DotDecal />

        <main className="relative z-[1] mx-auto w-full max-w-lg px-[14px] pt-14 pb-[280px] md:hidden">
          {/* Hero */}
          <h1 className="text-[50px] font-[900] lowercase leading-[0.94] tracking-[-2px] text-white mb-0">
            what are we making today? ✨
          </h1>
          <div className="mt-3 mb-6" style={{ width: 60, height: 6, borderRadius: 3, backgroundColor: "#ffe603" }} />

          {/* Two action buttons */}
          <div className="flex gap-2 mb-6">
            {/* Create Character - solid yellow */}
            <button
              type="button"
              onClick={handleOpenCreator}
              className="relative flex items-center justify-between active:scale-[0.98] transition-transform"
              style={{
                flex: "1 1 0%",
                minWidth: 0,
                backgroundColor: "#ffe603",
                padding: "16px 14px",
                borderRadius: 10,
                fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Rounded', system-ui, sans-serif",
              }}
            >
              <span className="text-[16px] font-[900] lowercase leading-[1.0] text-black text-left">create<br />character</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            {/* Create Photo */}
            <button
              type="button"
              onClick={() => {
                if (showLocks) return;
                if (!user) { navigate("/auth?redirect=/create"); return; }
                navigate("/create");
              }}
              className="relative flex items-center justify-between active:scale-[0.98] transition-transform"
              style={{
                flex: "1 1 0%",
                minWidth: 0,
                padding: "16px 14px",
                borderRadius: 10,
                fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Rounded', system-ui, sans-serif",
                color: "#ffffff",
                backgroundColor: "#000000",
                border: "2px solid #ffe603",
              }}
            >
              <span className="relative z-[1] text-[16px] font-[900] lowercase leading-[1.0] text-left" style={{ color: "#ffffff" }}>create<br />photo</span>
              <svg className="relative z-[1]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {showLocks && <LockOverlay borderRadius={8} />}
            </button>
          </div>

          {/* Latest Photos Section */}
          <section className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-[900] lowercase flex items-center gap-1.5" style={{ color: "#ffffff" }}>🖼️ latest photos</h2>
              <div className="relative" style={{ overflow: "hidden", borderRadius: 10 }}>
                <button
                  onClick={() => { if (showLocks) return; navigate("/storage"); }}
                  className="text-[11px] font-[800] lowercase px-3 py-1.5 active:scale-95 transition-transform"
                  style={{ color: "#ffe603", backgroundColor: "#000000", border: "2px solid #ffe603", borderRadius: 10 }}
                >
                  see all →
                </button>
                {showLocks && <LockOverlay borderRadius={10} />}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {!photosLoaded && images.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skel-p-${i}`} style={{ borderRadius: 10, overflow: "hidden", backgroundColor: "hsl(var(--card))" }}>
                    <AspectRatio ratio={3 / 4}>
                      <div className="h-full w-full" style={{ backgroundColor: "hsl(var(--card))" }} />
                    </AspectRatio>
                  </div>
                ))
              ) : (
                photoSlots.map((photo, i) => {
                  const isPlaceholder = !photo.url;
                  const isFirstPlaceholder = isPlaceholder && !photoSlots.slice(0, i).some(p => !p.url);
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => {
                        if (!isPlaceholder) setSelectedImage(photo);
                        else if (isFirstPlaceholder) {
                          if (!user) { navigate("/auth?redirect=/create"); return; }
                          navigate("/create");
                        }
                      }}
                      className="overflow-hidden"
                      style={{
                        borderRadius: 10,
                        border: isPlaceholder ? "none" : "2px solid hsl(var(--border-mid))",
                        backgroundColor: "hsl(var(--card))",
                        cursor: isPlaceholder && !isFirstPlaceholder ? "default" : "pointer",
                      }}
                    >
                      <AspectRatio ratio={3 / 4}>
                        {isPlaceholder ? (
                          isFirstPlaceholder ? (
                            <div className="flex h-full w-full items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                          ) : (
                            <div className="h-full w-full" />
                          )
                        ) : (
                          <img src={photo.url} alt="latest photo" className="h-full w-full object-cover" onError={() => { setImages((prev) => prev.filter((p) => p.id !== photo.id)); }} />
                        )}
                      </AspectRatio>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* My Characters Section */}
          <section className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-[900] lowercase flex items-center gap-1.5" style={{ color: "#ffffff" }}>🧑 my characters</h2>
              <div className="relative" style={{ overflow: "hidden", borderRadius: 10 }}>
                <button onClick={() => { if (showLocks) return; navigate("/characters"); }} className="text-[11px] font-[800] lowercase px-3 py-1.5 active:scale-95 transition-transform" style={{ color: "#ffe603", backgroundColor: "#000000", border: "2px solid #ffe603", borderRadius: 10 }}>
                  manage →
                </button>
                {showLocks && <LockOverlay borderRadius={10} />}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {!charsLoaded && characters.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skel-c-${i}`} style={{ borderRadius: 10, overflow: "hidden", backgroundColor: "hsl(var(--card))" }}>
                    <AspectRatio ratio={3 / 4}>
                      <div className="h-full w-full" style={{ backgroundColor: "hsl(var(--card))" }} />
                    </AspectRatio>
                  </div>
                ))
              ) : (
                charSlots.map((char, i) => {
                  if (!char) {
                    const isFirstEmpty = !charSlots.slice(0, i).some(c => c === null);
                    return (
                      <button
                        key={`empty-${i}`}
                        type="button"
                        onClick={() => { if (isFirstEmpty) handleOpenCreator(); }}
                        className="overflow-hidden"
                        style={{
                          borderRadius: 10,
                          backgroundColor: "hsl(var(--card))",
                          cursor: isFirstEmpty ? "pointer" : "default",
                        }}
                      >
                        <AspectRatio ratio={3 / 4}>
                          {isFirstEmpty ? (
                            <div className="flex h-full w-full items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                          ) : (
                            <div className="h-full w-full" />
                          )}
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
                      className="relative overflow-hidden"
                      style={{
                        borderRadius: 10,
                        border: "2px solid hsl(var(--border-mid))",
                        backgroundColor: "hsl(var(--card))",
                      }}
                    >
                      <AspectRatio ratio={3 / 4}>
                        {hasFace ? (
                          <img src={char.face_image_url!} alt={char.name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <User size={28} strokeWidth={2.5} style={{ color: "#ffffff" }} />
                          </div>
                        )}
                      </AspectRatio>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-4">
                        <span className="block text-[11px] font-[900] lowercase text-white leading-tight truncate">{char.name}</span>
                        <span className="block text-[9px] font-[800] lowercase text-white/70">age {displayAge(char.id, char.age)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </main>

        {/* Desktop layout */}
        <main className="hidden md:block relative z-[1] w-full max-w-3xl mx-auto px-10 pt-14 pb-[280px]">
          <h1 className="text-[64px] font-[900] lowercase leading-[0.94] tracking-[-2px] text-white mb-0">
            what are we making today? ✨
          </h1>
          <div className="mt-4 mb-10" style={{ width: 70, height: 7, borderRadius: 3, backgroundColor: "#ffe603" }} />

          {/* Two action buttons */}
          <div className="flex gap-3 mb-8">
            <button
              type="button"
              onClick={handleOpenCreator}
              className="relative flex items-center justify-between active:scale-[0.98] transition-transform hover-lift"
              style={{
                flex: "1 1 0%",
                minWidth: 0,
                backgroundColor: "#ffe603",
                padding: "22px 20px",
                borderRadius: 10,
              }}
            >
              <span className="text-[22px] font-[900] lowercase leading-[1.0] text-black text-left">create<br />character</span>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                if (showLocks) return;
                if (!user) { navigate("/auth?redirect=/create"); return; }
                navigate("/create");
              }}
              className="relative flex items-center justify-between active:scale-[0.98] transition-transform hover-lift"
              style={{
                flex: "1 1 0%",
                minWidth: 0,
                padding: "22px 20px",
                borderRadius: 10,
                color: "#ffffff",
                backgroundColor: "#000000",
                border: "2px solid #ffe603",
              }}
            >
              <span className="relative z-[1] text-[22px] font-[900] lowercase leading-[1.0] text-left" style={{ color: "#ffffff" }}>create<br />photo</span>
              <svg className="relative z-[1]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {showLocks && <LockOverlay borderRadius={8} />}
            </button>
          </div>

          {/* Latest Photos Section */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-[900] lowercase flex items-center gap-2" style={{ color: "#ffffff" }}>🖼️ latest photos</h2>
              <div className="relative" style={{ overflow: "hidden", borderRadius: 10 }}>
                <button
                  onClick={() => { if (showLocks) return; navigate("/storage"); }}
                  className="text-[13px] font-[800] lowercase px-4 py-2 active:scale-95 transition-transform hover-glow"
                  style={{ color: "#ffe603", backgroundColor: "#000000", border: "2px solid #ffe603", borderRadius: 10 }}
                >
                  see all →
                </button>
                {showLocks && <LockOverlay borderRadius={10} />}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {!photosLoaded && images.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skel-p-${i}`} style={{ borderRadius: 10, overflow: "hidden", backgroundColor: "hsl(var(--card))" }}>
                    <AspectRatio ratio={3 / 4}>
                      <div className="h-full w-full" style={{ backgroundColor: "hsl(var(--card))" }} />
                    </AspectRatio>
                  </div>
                ))
              ) : (
                photoSlots.map((photo, i) => {
                  const isPlaceholder = !photo.url;
                  const isFirstPlaceholder = isPlaceholder && !photoSlots.slice(0, i).some(p => !p.url);
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => {
                        if (!isPlaceholder) setSelectedImage(photo);
                        else if (isFirstPlaceholder) {
                          if (!user) { navigate("/auth?redirect=/create"); return; }
                          navigate("/create");
                        }
                      }}
                      className={`overflow-hidden ${!isPlaceholder ? "hover-lift" : ""}`}
                      style={{
                        borderRadius: 10,
                        border: isPlaceholder ? "none" : "2px solid hsl(var(--border-mid))",
                        backgroundColor: "hsl(var(--card))",
                        cursor: isPlaceholder && !isFirstPlaceholder ? "default" : "pointer",
                      }}
                    >
                      <AspectRatio ratio={3 / 4}>
                        {isPlaceholder ? (
                          isFirstPlaceholder ? (
                            <div className="flex h-full w-full items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                          ) : (
                            <div className="h-full w-full" />
                          )
                        ) : (
                          <img src={photo.url} alt="latest photo" className="h-full w-full object-cover" onError={() => { setImages((prev) => prev.filter((p) => p.id !== photo.id)); }} />
                        )}
                      </AspectRatio>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* My Characters Section */}
          <section className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-[900] lowercase flex items-center gap-2" style={{ color: "#ffffff" }}>🧑 my characters</h2>
              <div className="relative" style={{ overflow: "hidden", borderRadius: 10 }}>
                <button onClick={() => navigate("/characters")} className="text-[13px] font-[800] lowercase px-4 py-2 active:scale-95 transition-transform hover-glow" style={{ color: "#ffe603", backgroundColor: "#000000", border: "2px solid #ffe603", borderRadius: 10 }}>
                  manage →
                </button>
                {showLocks && <LockOverlay borderRadius={10} />}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {!charsLoaded && characters.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skel-c-${i}`} style={{ borderRadius: 10, overflow: "hidden", backgroundColor: "hsl(var(--card))" }}>
                    <AspectRatio ratio={3 / 4}>
                      <div className="h-full w-full" style={{ backgroundColor: "hsl(var(--card))" }} />
                    </AspectRatio>
                  </div>
                ))
              ) : (
                charSlots.map((char, i) => {
                  if (!char) {
                    const isFirstEmpty = !charSlots.slice(0, i).some(c => c === null);
                    return (
                      <button
                        key={`empty-${i}`}
                        type="button"
                        onClick={() => { if (isFirstEmpty) handleOpenCreator(); }}
                        className="overflow-hidden"
                        style={{
                          borderRadius: 10,
                          backgroundColor: "hsl(var(--card))",
                          cursor: isFirstEmpty ? "pointer" : "default",
                        }}
                      >
                        <AspectRatio ratio={3 / 4}>
                          {isFirstEmpty ? (
                            <div className="flex h-full w-full items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                          ) : (
                            <div className="h-full w-full" />
                          )}
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
                      className="relative overflow-hidden hover-lift"
                      style={{
                        borderRadius: 10,
                        border: "2px solid hsl(var(--border-mid))",
                        backgroundColor: "hsl(var(--card))",
                      }}
                    >
                      <AspectRatio ratio={3 / 4}>
                        {hasFace ? (
                          <img src={char.face_image_url!} alt={char.name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <User size={32} strokeWidth={2.5} style={{ color: "#ffffff" }} />
                          </div>
                        )}
                      </AspectRatio>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-5">
                        <span className="block text-[13px] font-[900] lowercase text-white leading-tight truncate">{char.name}</span>
                        <span className="block text-[10px] font-[800] lowercase text-white/70">age {displayAge(char.id, char.age)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </main>
      </div>}
    </div>
  );
};

export default Home;
