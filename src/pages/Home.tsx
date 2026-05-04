import { useEffect, useMemo, useState } from "react";

import { displayAge } from "@/lib/displayAge";
import { User, Copy, Download } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import GuidedCreator, { type GuidedSelections } from "@/components/GuidedCreator";
import { AspectRatio } from "@/components/ui/aspect-ratio";

import { useAuth } from "@/contexts/AuthContext";
import { useAppData } from "@/contexts/AppDataContext";
import { useOnboarded } from "@/hooks/useOnboarded";

import DotDecal from "@/components/DotDecal";
import LockOverlay from "@/components/LockOverlay";
import ImageZoomViewer from "@/components/ImageZoomViewer";
import { toast } from "@/components/ui/sonner";

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



const Home = () => {
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { characters: cachedChars, generations: cachedGens, charactersReady: cachedCharsLoaded } = useAppData();
  const locationState = ((location.state as { openCreator?: boolean; onboardingRedirect?: boolean } | null) ?? null);
  const openCreatorRequested = Boolean(locationState?.openCreator);
  const shouldOpenGuidedOnMount = openCreatorRequested;
  useEffect(() => {
    if (openCreatorRequested) {
      window.history.replaceState({}, "");
    }
  }, [openCreatorRequested]);

  useEffect(() => {
    const shouldToast = sessionStorage.getItem("facefox_show_start_toast");
    if (shouldToast) {
      sessionStorage.removeItem("facefox_show_start_toast");
      setTimeout(() => toast.error("press start instead!"), 500);
    }
  }, []);
  // Derive images and characters from global cache
  const images = useMemo(() => {
    return cachedGens
      .flatMap((g) =>
        (g.image_urls ?? []).filter(isValidImageUrl).slice(0, 1).map((url, i) => ({
          id: `${g.id}-${i}`,
          url,
          prompt: g.prompt ?? "",
          created_at: g.created_at,
        })),
      )
      .slice(0, 8);
  }, [cachedGens]);

  const characters = useMemo(() => {
    return cachedChars
      .filter((c) => c.face_image_url && c.face_angle_url && c.body_anchor_url)
      .slice(0, 4) as CharacterPreview[];
  }, [cachedChars]);

  const charsLoaded = cachedCharsLoaded;
  const [showGuided, setShowGuided] = useState(() => shouldOpenGuidedOnMount);
  const [skipWelcome, setSkipWelcome] = useState(false);
  const [selectedImage, setSelectedImage] = useState<LatestImage | null>(null);
  const [autoOpenEvaluated, setAutoOpenEvaluated] = useState(() => shouldOpenGuidedOnMount);
  const { onboardingComplete, characterCount, resolved: lockStateResolved } = useOnboarded();
  const resolvedCharacterCount = Math.max(characterCount, cachedChars.length);
  const effectiveOnboardingComplete = onboardingComplete || resolvedCharacterCount > 0;


  useEffect(() => {
    if (authLoading) return;

    const pending = localStorage.getItem("facefox_pending_creation");
    if (user && pending && lockStateResolved && charsLoaded) {
      localStorage.removeItem("facefox_pending_creation");

      if (resolvedCharacterCount > 0) {
        sessionStorage.removeItem("facefox_signup_gate_active");
        sessionStorage.removeItem("facefox_post_auth_home");
        sessionStorage.removeItem("facefox_guided_flow_state");
        sessionStorage.setItem(DISMISSED_KEY, "1");
        toast("acc exists!");
        setSkipWelcome(true);
        setShowGuided(false);
        setAutoOpenEvaluated(true);
        return;
      }

      try {
        const sel = JSON.parse(pending);
        if (sel?.characterName) {
          const draft = {
            characterName: sel.characterName,
            skin: sel.skin || "tan",
            bodyType: sel.bodyType || "regular",
            bustSize: sel.bustSize || "regular",
            hairStyle: sel.hairStyle || "long straight",
            hairColour: sel.hairColour || "brunette",
            eye: sel.eye || "brown",
            age: sel.age === "18-24" ? "18" : sel.age === "24+" ? "24" : sel.age || "18",
            description: sel.description || "",
          };
          sessionStorage.setItem("facefox_character_draft", JSON.stringify(draft));
          localStorage.setItem("facefox_draft_backup", JSON.stringify(draft));
          const prompt = `${draft.age} year old woman, ${draft.skin} skin, ${draft.hairStyle} ${draft.hairColour} hair, ${draft.eye} eyes`;
          sessionStorage.setItem("facefox_guided_prompt", prompt);
          sessionStorage.removeItem("facefox_face_options");
          sessionStorage.removeItem("facefox_pending_char_id");
          sessionStorage.removeItem("facefox_guided_flow_state");
          sessionStorage.setItem(DISMISSED_KEY, "1");
          navigate("/choose-face", { state: { prompt, freshCreation: true } });
          return;
        }
      } catch {}
    }


    if (user) {
      setSkipWelcome(true);
      if (!openCreatorRequested) setShowGuided(false);
      setAutoOpenEvaluated(true);
      return;
    }

    // No user → show the hero/start-now screen (GuidedCreator step 0)
    setShowGuided(true);
    setSkipWelcome(false);
    setAutoOpenEvaluated(true);
  }, [authLoading, openCreatorRequested, user, navigate, lockStateResolved, charsLoaded, resolvedCharacterCount]);

  // Auto-close the creator once the user has at least one character, unless the creator was explicitly requested this mount.
  useEffect(() => {
    if (resolvedCharacterCount > 0 && !openCreatorRequested) {
      setShowGuided(false);
    }
  }, [resolvedCharacterCount, openCreatorRequested]);

  function handleOpenCreator(forceFullFlow?: boolean | React.MouseEvent) {
    const isFull = typeof forceFullFlow === "boolean" ? forceFullFlow : false;
    sessionStorage.removeItem(DISMISSED_KEY);
    setSkipWelcome(isFull ? false : !!user);
    setShowGuided(true);
  }

  useEffect(() => {
    const handler = () => handleOpenCreator();
    window.addEventListener("facefox:open-creator", handler);
    return () => window.removeEventListener("facefox:open-creator", handler);
  }, [user]);

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
    setTimeout(() => setShowGuided(false), 520);
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
  const showLocks = lockStateResolved && charsLoaded && !effectiveOnboardingComplete && resolvedCharacterCount === 0;

  // (dataLoading removed — App-level splash + cached data handle initial render)

  // Never trap logged-in users behind a blank startup screen while state revalidates.
  const hasCachedUser = typeof window !== "undefined" && !!localStorage.getItem("facefox_cached_user");
  const pageHidden = showGuided || (!autoOpenEvaluated && !user && !hasCachedUser);

  return (
    <div className={`relative min-h-[calc(100dvh-57px)] overflow-hidden ${pageHidden ? "bg-nav" : "bg-background"}`}>
      <GuidedCreator
        open={showGuided}
        onComplete={handleGuidedComplete}
        onExit={handleGuidedExit}
        skipWelcome={skipWelcome}
      />

      {!pageHidden && <div className="relative flex h-full flex-col">
        <DotDecal />

        <main className="relative z-[1] mx-auto w-full max-w-lg px-[32px] pt-[50px] pb-[280px] md:hidden">
          {/* Hero */}
          <h1 className="flex w-full flex-col items-start text-[44px] font-[900] lowercase leading-[0.94] tracking-[-1.6px] text-white mb-0 mt-[32px] text-left">
            <span className="block w-full text-left">what are we</span>
            <span className="inline-flex items-center justify-start gap-[8px] whitespace-nowrap text-left">
              <span>making today?</span>
              <span aria-hidden="true" className="shrink-0">✨</span>
            </span>
          </h1>
          {/* <div className="mt-5 mb-6" style={{ width: 60, height: 8, borderRadius: 9999, backgroundColor: "#ffe603" }} /> */}

          {/* Two action buttons — extended outward to align with photo pill row edges */}
          <div className="flex gap-2 mb-6 mt-[24px]">
            {/* Create Character - solid yellow */}
            <button
              type="button"
              onClick={handleOpenCreator}
              className="relative flex items-center justify-between transition-transform"
              style={{
                flex: "1 1 0%",
                minWidth: 0,
                backgroundColor: "#ffe603",
                padding: "16px 14px 16px 20px",
                borderRadius: 10,
                fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Rounded', system-ui, sans-serif",
              }}
            >
              <span className="text-[16px] font-[900] lowercase leading-[1.0] text-black text-left">create<br />character</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              className="relative flex items-center justify-between transition-transform"
              style={{
                flex: "1 1 0%",
                minWidth: 0,
                padding: "16px 20px 16px 14px",
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
              {showLocks && <LockOverlay borderRadius={10} />}
            </button>
          </div>

          {/* Latest Photos Section */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-[900] lowercase flex items-center gap-1.5" style={{ color: "#ffffff" }}>🖼️ latest photos</h2>
              <div className="relative" style={{ overflow: "hidden", borderRadius: 10 }}>
                <button
                  onClick={() => { if (!onboardingComplete) return; navigate("/storage"); }}
                  className="text-[11px] font-[800] lowercase px-3 py-1.5 transition-transform"
                  style={{ color: "#ffffff", backgroundColor: "#000000", border: "2px solid #ffe603", borderRadius: 10 }}
                >
                  see all →
                </button>
                {!onboardingComplete && <LockOverlay borderRadius={10} />}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {photoSlots.map((photo, i) => {
                const isPlaceholder = !photo.url;
                const isFirstPlaceholder = isPlaceholder && !photoSlots.slice(0, i).some(p => !p.url);
                return (
                  <button
                    key={`photo-slot-${i}`}
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
                      border: "none",
                      backgroundColor: "hsl(0 0% 5%)",
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
                        <img src={photo.url} alt="latest photo" className="h-full w-full object-cover" loading="eager" decoding="sync" style={{ opacity: 0, transition: "opacity 0.3s ease" }} onLoad={(e) => (e.currentTarget.style.opacity = "1")} onError={(e) => (e.currentTarget.style.display = "none")} />
                      )}
                    </AspectRatio>
                  </button>
                );
              })}
            </div>
          </section>

          {/* My Characters Section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-[900] lowercase flex items-center gap-1.5" style={{ color: "#ffffff" }}>🧑 my characters</h2>
              <div className="relative" style={{ overflow: "hidden", borderRadius: 10 }}>
                <button onClick={() => { if (!onboardingComplete) return; navigate("/characters"); }} className="text-[11px] font-[800] lowercase px-3 py-1.5 transition-transform" style={{ color: "#ffffff", backgroundColor: "#000000", border: "2px solid #ffe603", borderRadius: 10 }}>
                  manage →
                </button>
                {!onboardingComplete && <LockOverlay borderRadius={10} />}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {charSlots.map((char, i) => {
                if (!char) {
                  const isFirstEmpty = !charSlots.slice(0, i).some(c => c === null);
                  return (
                    <button
                      key={`empty-${i}`}
                      type="button"
                      onClick={() => { if (isFirstEmpty && effectiveOnboardingComplete) handleOpenCreator(); }}
                      className="overflow-hidden"
                      style={{
                        borderRadius: 10,
                        backgroundColor: "hsl(0 0% 5%)",
                        cursor: isFirstEmpty && effectiveOnboardingComplete ? "pointer" : "default",
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
                    key={`char-slot-${i}`}
                    type="button"
                    onClick={() => navigate(`/characters/${char.id}`)}
                    className="relative overflow-hidden"
                    style={{
                      borderRadius: 10,
                      border: "none",
                      backgroundColor: "hsl(0 0% 5%)",
                    }}
                  >
                    <AspectRatio ratio={3 / 4}>
                      {hasFace ? (
                        <img src={char.face_image_url!} alt={char.name} className="h-full w-full object-cover" style={{ opacity: 0, transition: "opacity 0.3s ease" }} onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = "1"; }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User size={28} strokeWidth={2.5} style={{ color: "#ffffff" }} />
                        </div>
                      )}
                    </AspectRatio>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-4">
                      <span className="block text-[11px] font-[900] lowercase text-white leading-tight truncate">{char.name}</span>
                      <span className="block text-[9px] font-[800] lowercase text-white">age {displayAge(char.id, char.age)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </main>

        {/* Desktop layout */}
        <main className="hidden md:block relative z-[1] w-full max-w-3xl mx-auto px-[56px] pt-[62px] pb-[280px]">
          <h1 className="flex w-full flex-col items-start text-[54px] font-[900] lowercase leading-[0.94] tracking-[-1.6px] text-white mb-0 mt-[20px] text-left">
            <span className="block w-full text-left">what are we</span>
            <span className="inline-flex items-center justify-start gap-[10px] whitespace-nowrap text-left">
              <span>making today?</span>
              <span aria-hidden="true" className="shrink-0">✨</span>
            </span>
          </h1>
          {/* <div className="mt-6 mb-10" style={{ width: 60, height: 8, borderRadius: 9999, backgroundColor: "#ffe603" }} /> */}

          {/* Two action buttons */}
          <div className="flex gap-3 mb-8 mt-[24px]">
            <button
              type="button"
              onClick={handleOpenCreator}
              className="relative flex items-center justify-between transition-transform hover-lift"
              style={{
                flex: "1 1 0%",
                minWidth: 0,
                backgroundColor: "#ffe603",
                padding: "22px 20px",
                borderRadius: 10,
              }}
            >
              <span className="text-[22px] font-[900] lowercase leading-[1.0] text-black text-left">create<br />character</span>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              className="relative flex items-center justify-between transition-transform hover-lift"
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
              {showLocks && <LockOverlay borderRadius={10} />}
            </button>
          </div>

          {/* Latest Photos Section */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-[900] lowercase flex items-center gap-2" style={{ color: "#ffffff" }}>🖼️ latest photos</h2>
              <div className="relative" style={{ overflow: "hidden", borderRadius: 10 }}>
                <button
                  onClick={() => { if (!onboardingComplete) return; navigate("/storage"); }}
                  className="text-[13px] font-[800] lowercase px-4 py-2 transition-transform hover-glow"
                  style={{ color: "#ffffff", backgroundColor: "#000000", border: "2px solid #ffe603", borderRadius: 10 }}
                >
                  see all →
                </button>
                {!onboardingComplete && <LockOverlay borderRadius={10} />}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {photoSlots.map((photo, i) => {
                const isPlaceholder = !photo.url;
                const isFirstPlaceholder = isPlaceholder && !photoSlots.slice(0, i).some(p => !p.url);
                return (
                  <button
                    key={`photo-slot-desktop-${i}`}
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
                      border: "none",
                      backgroundColor: "hsl(0 0% 5%)",
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
                        <img src={photo.url} alt="latest photo" className="h-full w-full object-cover" loading="eager" decoding="sync" onError={(e) => (e.currentTarget.style.display = "none")} />
                      )}
                    </AspectRatio>
                  </button>
                );
              })}
            </div>
          </section>

          {/* My Characters Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-[900] lowercase flex items-center gap-2" style={{ color: "#ffffff" }}>🧑 my characters</h2>
              <div className="relative" style={{ overflow: "hidden", borderRadius: 10 }}>
                <button onClick={() => { if (!onboardingComplete) return; navigate("/characters"); }} className="text-[13px] font-[800] lowercase px-4 py-2 transition-transform hover-glow" style={{ color: "#ffffff", backgroundColor: "#000000", border: "2px solid #ffe603", borderRadius: 10 }}>
                  manage →
                </button>
                {!onboardingComplete && <LockOverlay borderRadius={10} />}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {charSlots.map((char, i) => {
                if (!char) {
                  const isFirstEmpty = !charSlots.slice(0, i).some(c => c === null);
                  return (
                    <button
                      key={`empty-${i}`}
                      type="button"
                      onClick={() => { if (isFirstEmpty && effectiveOnboardingComplete) handleOpenCreator(); }}
                      className="overflow-hidden"
                      style={{
                        borderRadius: 10,
                        backgroundColor: "hsl(0 0% 5%)",
                        cursor: isFirstEmpty && effectiveOnboardingComplete ? "pointer" : "default",
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
                    key={`char-slot-desktop-${i}`}
                    type="button"
                    onClick={() => navigate(`/characters/${char.id}`)}
                    className="relative overflow-hidden hover-lift"
                    style={{
                      borderRadius: 10,
                      border: "none",
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
                      <span className="block text-[10px] font-[800] lowercase text-white">age {displayAge(char.id, char.age)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      </div>}

      <ImageZoomViewer
        url={selectedImage?.url ?? null}
        onClose={() => setSelectedImage(null)}
        showDownload={false}
        footer={selectedImage ? (
          <div className="p-3 md:p-4 space-y-2" style={{ backgroundColor: "hsl(var(--card))", borderRadius: "0 0 10px 10px" }}>
            {selectedImage.prompt && selectedImage.prompt !== "character references" && selectedImage.prompt !== "face generation" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const text = selectedImage.prompt;
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(text).then(() => toast.success("copied")).catch(() => toast.error("copy error"));
                  }
                }}
                className="h-10 md:h-12 w-full flex items-center gap-2 px-3 border-[2px] border-[hsl(var(--border-mid))] text-xs md:text-sm font-[900] lowercase text-white text-left rounded-[10px] overflow-hidden"
                style={{ backgroundColor: "#000000" }}
              >
                <span className="truncate flex-1 text-left">{selectedImage.prompt}</span>
                <Copy size={12} strokeWidth={2.5} className="shrink-0" />
              </button>
            )}
            <a href={selectedImage.url} download={`facefox-${selectedImage.id}.png`} target="_blank" className="block">
              <button
                type="button"
                className="h-10 md:h-12 w-full flex items-center justify-center gap-2 border-[2px] border-[hsl(var(--border-mid))] text-xs md:text-sm font-[900] lowercase text-white rounded-[10px]"
                style={{ backgroundColor: "#000000" }}
              >
                download <Download size={12} strokeWidth={2.5} />
              </button>
            </a>
          </div>
        ) : undefined}
      />
    </div>
  );
};

export default Home;
