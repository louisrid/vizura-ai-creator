import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { mergeCachedOnboardingState } from "@/lib/onboardingState";
import { RefreshCw, Gem, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { registerNavGuard } from "@/lib/navGuard";
import { displayAge } from "@/lib/displayAge";

import PageTitle from "@/components/PageTitle";
import ImageZoomViewer from "@/components/ImageZoomViewer";

import DotDecal from "@/components/DotDecal";
import { SignInOverlay } from "@/components/GuidedCreator";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useGems } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import PaywallOverlay from "@/components/PaywallOverlay";
import ProgressBarLoader from "@/components/loading/ProgressBarLoader";
import RegenerateConfirmDialog from "@/components/RegenerateConfirmDialog";
import { sanitiseText } from "@/lib/sanitise";

const STORAGE_KEY = "vizura_character_draft";
const FACE_STORAGE_KEY = "vizura_face_options";
const AUTH_RESUME_KEY = "vizura_resume_after_auth";

const FACE_GEN_PHRASES = [
  "generating faces…",
  "building your look…",
  "refining features…",
  "almost ready…",
];

const ANGLE_GEN_PHRASES = [
  "creating character views…",
  "generating side profile…",
  "generating full body…",
  "finalising your character…",
];

const ChooseFace = () => {
  const { user, loading: authLoading } = useAuth();
  const { gems, refetch: refetchGems } = useGems();
  const { subscribed } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  const { prompt: statePrompt, characterId: stateCharId, freshCreation: stateFresh } = (location.state as {
    prompt?: string;
    characterId?: string;
    freshCreation?: boolean;
  }) || {};

  // Fresh creation = user just came from the guided creator flow.
  // Always clear cached faces so we generate new ones for the new character.
  const isFreshCreation = !!stateFresh;
  if (isFreshCreation) {
    sessionStorage.removeItem(FACE_STORAGE_KEY);
  }

  // Strip freshCreation from history so future refreshes never re-evaluate it
  useEffect(() => {
    if (stateFresh && location.state) {
      const { freshCreation: _drop, ...rest } = location.state as Record<string, unknown>;
      navigate(location.pathname, { replace: true, state: Object.keys(rest).length ? rest : undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prompt = statePrompt || sessionStorage.getItem("vizura_guided_prompt") || undefined;
  const [characterId, setCharacterId] = useState<string | undefined>(stateCharId || sessionStorage.getItem("vizura_pending_char_id") || undefined);

  const [faces, setFaces] = useState<string[]>(() => {
    if (isFreshCreation) return [];
    try {
      const raw = sessionStorage.getItem(FACE_STORAGE_KEY);
      return raw ? JSON.parse(raw) as string[] : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [apiDone, setApiDone] = useState(false);
  const [barComplete, setBarComplete] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  
  const [cardsRevealed, setCardsRevealed] = useState(false);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [regeneratingFaces, setRegeneratingFaces] = useState(false);
  const [zoomedFaceUrl, setZoomedFaceUrl] = useState<string | null>(null);
  const isFreeUser = !subscribed && gems <= 0;
  const hasShownGreatChoiceRef = useRef(false);

  // Angle/body generation — runs in background, no overlay
  const [pendingNavCharId, setPendingNavCharId] = useState<string | null>(null);

  const hasInitRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    window.dispatchEvent(new CustomEvent("vizura:blackout:end"));
  }, [authLoading, showSignIn, loading]);

  useEffect(() => {
    if (authLoading) return;
    if (!prompt) { navigate("/"); return; }
    if (hasInitRef.current) return;
    hasInitRef.current = true;
    if (faces.length > 0) {
      setApiDone(true);
      setBarComplete(true);
      setLoading(false);
      return;
    }
    void generateFaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // When bar completes and faces are ready, stop loading (tap-to-continue handles transition)
  useEffect(() => {
    if (barComplete && faces.length > 0) {
      setLoading(false);
    }
  }, [barComplete, faces.length]);

  useEffect(() => {
    if (!loading && !cardsRevealed && faces.length > 0) {
      const t = setTimeout(() => setCardsRevealed(true), 100);
      return () => clearTimeout(t);
    }
  }, [loading, cardsRevealed, faces.length]);

  // Register navigation guard — blocks Header nav and shows confirm dialog
  useEffect(() => {
    return registerNavGuard(() => {
      setShowBackConfirm(true);
      return true;
    });
  }, []);

  // Intercept swipe-back gesture and show confirmation dialog instead
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setShowBackConfirm(true);
    };
    window.addEventListener("vizura:swipe-back", handler);
    return () => window.removeEventListener("vizura:swipe-back", handler);
  }, []);

  const [pendingAuthSave, setPendingAuthSave] = useState(() => sessionStorage.getItem(AUTH_RESUME_KEY) === "1");
  const doFinalSaveRef = useRef<(forcedFaceIdx?: number) => Promise<boolean>>(async () => false);

  useEffect(() => {
    if (showSignIn || !user || sessionStorage.getItem(AUTH_RESUME_KEY) !== "1") return;
    const storedFace = Number(sessionStorage.getItem("vizura_selected_face") ?? "-1");
    if (storedFace < 0) return;
    setPendingAuthSave(true);
    setSelectedIndex(storedFace);
    void doFinalSaveRef.current(storedFace);
  }, [user, showSignIn]);

  const generateFaces = async () => {
    setLoading(true);
    setApiDone(false);
    setBarComplete(false);
    setCardsRevealed(false);
    setGenerationError(null);
    try {
      if (!user) {
        setFaces([]);
        setLoading(false);
        setShowSignIn(true);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setFaces([]);
        setLoading(false);
        setShowSignIn(true);
        return;
      }

      setShowSignIn(false);

      const invokeAndParse = async (body: Record<string, unknown>, retriesLeft = 2): Promise<any> => {
        // Refresh session proactively in case tab was backgrounded
        const { data: sessionData } = await supabase.auth.getSession();
        let token = sessionData?.session?.access_token;
        if (!token) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          token = refreshed?.session?.access_token;
        }
        if (!token) throw new Error("Unauthorized");

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const url = `https://${projectId}.supabase.co/functions/v1/generate`;

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify(body),
          });

          const result = await response.json();

          if (!response.ok && result?.error === "Unauthorized") {
            const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshed.session) {
              return invokeAndParse(body, 0);
            }
          }

          return result;
        } catch (networkErr: any) {
          // Tab suspension on iOS Safari causes fetch to fail with TypeError
          // Wait for tab to become visible again, then retry
          if (retriesLeft > 0 && (networkErr?.name === "TypeError" || networkErr?.message?.includes("fetch"))) {
            console.warn("Fetch failed (likely tab suspended), waiting to retry…", networkErr.message);
            await new Promise<void>((resolve) => {
              if (document.visibilityState === "visible") {
                // Already visible — small delay then retry
                setTimeout(resolve, 1000);
              } else {
                // Wait for tab to come back
                const onVisible = () => {
                  if (document.visibilityState === "visible") {
                    document.removeEventListener("visibilitychange", onVisible);
                    setTimeout(resolve, 500);
                  }
                };
                document.addEventListener("visibilitychange", onVisible);
              }
            });
            // Refresh auth before retry
            await supabase.auth.refreshSession();
            return invokeAndParse(body, retriesLeft - 1);
          }
          throw networkErr;
        }
      };

      let result = await invokeAndParse({ prompt, free_gen: true });

      if (result?.error && (result.code === "FREE_GEN_USED" || result.code === "IP_USED")) {
        result = await invokeAndParse({ prompt, face_regen: true });
      }

      if (result?.error) {
        if (result.error === "Unauthorized") {
          setFaces([]);
          setShowSignIn(true);
          setLoading(false);
          return;
        }
        if (result.code === "NO_GEMS") {
          navigate("/top-ups");
          setLoading(false);
          return;
        }
        if (result.code === "CONTENT_POLICY") {
          toast("prompt not allowed");
          setLoading(false);
          return;
        }
        throw new Error(result.error);
      }

      const imgs = result?.images || [];
      const nextFaces = imgs.slice(0, 3);
      if (nextFaces.length === 0) throw new Error("generation failed — no faces returned");
      setFaces(nextFaces);
      sessionStorage.setItem(FACE_STORAGE_KEY, JSON.stringify(nextFaces));
      setSelectedIndex(null);
      setApiDone(true);
    } catch (err: any) {
      console.error("generateFaces error:", err);
      const msg = err?.message || "generation failed";
      if (msg.includes("Free generation") || msg.includes("IP_USED") || msg.includes("FREE_GEN_USED")) {
        setShowPaywall(true);
      } else {
        setGenerationError("generation failed");
        toast.error("generation failed, please try again");
      }
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (isFreeUser) {
      navigate("/top-ups");
      return;
    }
    if (!user) return;

    // Stay on screen, show spinners on face cards
    setRegeneratingFaces(true);
    setSelectedIndex(null);
    setGenerationError(null);

    try {
      const invokeAndParse = async (body: Record<string, unknown>, retriesLeft = 2): Promise<any> => {
        const { data: sessionData } = await supabase.auth.getSession();
        let token = sessionData?.session?.access_token;
        if (!token) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          token = refreshed?.session?.access_token;
        }
        if (!token) throw new Error("Unauthorized");
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const url = `https://${projectId}.supabase.co/functions/v1/generate`;
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify(body),
          });
          return response.json();
        } catch (networkErr: any) {
          if (retriesLeft > 0 && (networkErr?.name === "TypeError" || networkErr?.message?.includes("fetch"))) {
            await new Promise<void>((resolve) => {
              if (document.visibilityState === "visible") {
                setTimeout(resolve, 1000);
              } else {
                const onVisible = () => {
                  if (document.visibilityState === "visible") {
                    document.removeEventListener("visibilitychange", onVisible);
                    setTimeout(resolve, 500);
                  }
                };
                document.addEventListener("visibilitychange", onVisible);
              }
            });
            await supabase.auth.refreshSession();
            return invokeAndParse(body, retriesLeft - 1);
          }
          throw networkErr;
        }
      };

      const result = await invokeAndParse({ prompt, face_regen: true });
      if (result?.error) throw new Error(result.error);
      const nextFaces = (result.images || []).slice(0, 3);
      if (nextFaces.length === 0) throw new Error("generation failed — no faces returned");
      setFaces(nextFaces);
      sessionStorage.setItem(FACE_STORAGE_KEY, JSON.stringify(nextFaces));
      setSelectedIndex(null);
      await refetchGems();
      toast("30 gems used");
    } catch (err: any) {
      toast.error("generation failed, please try again");
    } finally {
      setRegeneratingFaces(false);
    }
  };

  const handleFaceClick = (i: number) => {
    setSelectedIndex(i);
    setPulseIndex(i);
    if (!hasShownGreatChoiceRef.current) {
      toast("great choice!");
      hasShownGreatChoiceRef.current = true;
    }
    window.setTimeout(() => setPulseIndex((current) => (current === i ? null : current)), 360);
  };

  const handleSelectFace = async (faceIndex: number) => {
    setSelectedIndex(faceIndex);

    if (!user) {
      sessionStorage.setItem("vizura_selected_face", String(faceIndex));
      sessionStorage.setItem(AUTH_RESUME_KEY, "1");
      setShowSignIn(true);
      return;
    }

    await doFinalSave(faceIndex);
  };

  const normaliseDraftAge = (value?: string) => {
    if (value === "18-24" || value === "18") return "18";
    if (value === "24+" || value === "24") return "24";
    return "18";
  };

  const normaliseDraftBodyType = (value?: string) => {
    const key = (value || "regular").toLowerCase();
    if (key === "slim") return "thin";
    if (key === "average") return "regular";
    if (key === "thin" || key === "curvy") return key;
    return "regular";
  };

  const normaliseDraftBustSize = (value?: string) => (value === "large" ? "large" : "regular");

  const doFinalSave = async (forcedFaceIdx?: number) => {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      toast.error("not signed in");
      return false;
    }

    const faceIdx = forcedFaceIdx ?? selectedIndex ?? Number(sessionStorage.getItem("vizura_selected_face") ?? "-1");
    if (faceIdx < 0) {
      toast.error("pick a face first");
      return false;
    }

    const faceUrl = faces[faceIdx] || null;
    let cId = characterId;
    let draft: Record<string, string> | null = null;

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      draft = raw ? JSON.parse(raw) : null;
    } catch {
      draft = null;
    }

    const draftBodyType = normaliseDraftBodyType(draft?.bodyType);
    const draftBustSize = normaliseDraftBustSize(draft?.bustSize);

    if (!cId) {
      if (!draft) {
        toast.error("failed to load character details");
        return false;
      }

      try {
        console.log("[ChooseFace] Draft from sessionStorage:", { bustSize: draft.bustSize, bodyType: draft.bodyType });
        const charData = {
          user_id: currentUser.id,
          name: sanitiseText(draft.characterName || "", 100) || "new character",
          country: sanitiseText(draft.skin || "", 50),
          age: normaliseDraftAge(draft.age),
          hair: sanitiseText(draft.hairColour || "", 50),
          eye: sanitiseText(draft.eye || "", 50),
          body: sanitiseText(draftBodyType, 50),
          bust_size: draftBustSize,
          style: "",
          description: sanitiseText(`${draft.hairStyle || ""} hair. ${draft.description || ""}`, 500),
          generation_prompt: prompt || "",
          face_image_url: faceUrl,
        };
        const { data: inserted, error: insertError } = await supabase
          .from("characters")
          .insert(charData)
          .select("id")
          .single();
        if (insertError) {
          toast.error("failed to save character");
          return false;
        }
        if (inserted) {
          cId = inserted.id;
          setCharacterId(cId);
          sessionStorage.setItem("vizura_pending_char_id", cId);
          // Update onboarding cache so redirect gate won't block
          mergeCachedOnboardingState(currentUser.id, { characterCount: 1, onboardingComplete: true });
        }
      } catch (err) {
        toast.error("failed to save character");
        return false;
      }
    } else {
      try {
        const updateData: Record<string, unknown> = { face_image_url: faceUrl, generation_prompt: prompt };
        if (draft) {
          Object.assign(updateData, {
            name: sanitiseText(draft.characterName || "", 100) || "new character",
            country: sanitiseText(draft.skin || "", 50),
            age: normaliseDraftAge(draft.age),
            hair: sanitiseText(draft.hairColour || "", 50),
            eye: sanitiseText(draft.eye || "", 50),
            body: sanitiseText(draftBodyType, 50),
            bust_size: draftBustSize,
            description: sanitiseText(`${draft.hairStyle || ""} hair. ${draft.description || ""}`, 500),
          });
        }
        const { error: updateError } = await supabase
          .from("characters")
          .update(updateData)
          .eq("id", cId)
          .eq("user_id", currentUser.id);
        if (updateError) throw updateError;
      } catch (err) {
        toast.error("failed to save selected face");
        return false;
      }
    }

    if (faceUrl) {
      await supabase.from("generations").insert({
        user_id: currentUser.id,
        prompt: prompt || "face generation",
        image_urls: [faceUrl],
      });
    }

    if (faceUrl && cId) {
      const angleCharacterId = cId;
      const anglePrompt = prompt || "";
      let bodyType = draftBodyType;
      let bustSize = draftBustSize;

      try {
        const { data: charRecord } = await supabase
          .from("characters")
          .select("body, bust_size")
          .eq("id", angleCharacterId)
          .single();
        if (charRecord?.body) bodyType = charRecord.body;
        if (charRecord?.bust_size) bustSize = charRecord.bust_size;
      } catch {}

      // Fire angle+body generation in background — don't block UI
      supabase.functions.invoke("generate", {
        body: {
          prompt: anglePrompt,
          generate_angles: true,
          selected_face_url: faceUrl,
          body_type: bodyType,
          bust_size: bustSize,
          angle_character_id: angleCharacterId,
        },
      }).then(({ data, error }) => {
        if (error) console.error("Angle + body generation failed:", error);
        else console.log("Angle + body generation completed:", { characterId: angleCharacterId, angle: data?.angle_url, body: data?.body_anchor_url, bustSize });
      }).catch((e) => {
        console.error("Angle + body generation failed:", e);
      });
    }

    // Navigate immediately — character detail page polls for angle/body updates
    if (cId) sessionStorage.setItem("vizura_new_char_highlight", cId);
    sessionStorage.removeItem("vizura_selected_face");
    sessionStorage.removeItem("vizura_guided_prompt");
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem("vizura_pending_char_id");
    sessionStorage.removeItem(FACE_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_RESUME_KEY);
    setPendingAuthSave(false);
    setShowSignIn(false);
    toast.success("character added!");
    navigate(`/characters/${cId}`, { replace: true });
    return true;
  };
  doFinalSaveRef.current = doFinalSave;

  const handleSignedIn = useCallback(async () => {
    if (faces.length === 0) {
      setShowSignIn(false);
      setPendingAuthSave(false);
      await generateFaces();
      return;
    }

    sessionStorage.removeItem(AUTH_RESUME_KEY);
    setPendingAuthSave(true);
    await new Promise((r) => setTimeout(r, 300));
    const saved = await doFinalSaveRef.current();
    if (!saved) {
      setPendingAuthSave(false);
      setShowSignIn(false);
    }
  }, [faces.length, user]);

  if (showPaywall) {
    return (
      <div className="relative min-h-screen bg-background">
        <PaywallOverlay open={true} onClose={() => navigate("/")} hasSubscription={subscribed} />
      </div>
    );
  }

  if (pendingAuthSave) {
    return <div className="fixed inset-0 bg-black z-[9999]" />;
  }

  const cardDelays = [0, 0.2, 0.4];

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-background w-full">
        <SignInOverlay open={showSignIn} onSignedIn={handleSignedIn} />

        <AnimatePresence>
          {loading && (
            <motion.div
              key="black-underlay"
              className="fixed inset-0 z-[10000] bg-black"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {loading && (
            <motion.div
              key="face-loader"
              className="fixed inset-0 z-[10001] flex flex-col items-center justify-center bg-black"
              style={{ overflow: "hidden", touchAction: "none", overscrollBehavior: "none" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
                <ProgressBarLoader
                  duration={45000}
                  phrases={FACE_GEN_PHRASES}
                  phraseInterval={5000}
                  completeNow={apiDone}
                  onComplete={() => setBarComplete(true)}
                />
            </motion.div>
          )}
        </AnimatePresence>

      {/* Face picker — shown after loading completes */}
        {!loading && faces.length > 0 && (
          <>
            <DotDecal />

            <main className="relative z-[1] mx-auto flex w-full max-w-lg flex-col overflow-y-auto px-[14px] pt-10 pb-[280px] md:max-w-3xl md:px-10">
              <div className="flex items-center gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => setShowBackConfirm(true)}
                  className="flex items-center justify-center hover:opacity-90 transition-colors active:scale-95 w-[40px] h-[40px] md:w-[48px] md:h-[48px]"
                  style={{ borderRadius: 10, backgroundColor: "#ffe603" }}
                  aria-label="go back"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-[16px] md:h-[16px]">
                    <line x1="12" y1="7" x2="2" y2="7" />
                    <polyline points="7,2 2,7 7,12" />
                  </svg>
                </button>
                <PageTitle className="mb-0">pick your face</PageTitle>
              </div>


              <div className="mx-auto mt-2 flex w-full max-w-[26rem] md:max-w-[40rem] flex-col gap-4 md:gap-6">
                <div className="grid grid-cols-3 gap-3 md:gap-6">
                  {faces.map((url, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                    <motion.button
                        type="button"
                        onClick={() => {
                          if (selectedIndex === i) {
                            setZoomedFaceUrl(url);
                          } else {
                            handleFaceClick(i);
                          }
                        }}
                        initial={{ opacity: 0 }}
                        animate={cardsRevealed ? { opacity: 1 } : { opacity: 0 }}
                        whileTap={{ scale: 1.02 }}
                        transition={{
                          opacity: { duration: 0.4, ease: "easeOut" },
                        }}
                        className="relative aspect-[3/4] w-full transition-all duration-300 ease-out"
                        style={{
                          borderRadius: 10,
                          border: selectedIndex === i ? "3px solid #ffe603" : "3px solid transparent",
                          overflow: "hidden",
                        }}
                      >
                        <div className="w-full h-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: "#000" }}>
                          {regeneratingFaces ? (
                            <Loader2 className="animate-spin" size={18} style={{ color: "#ffffff" }} strokeWidth={3} />
                          ) : (
                            <img src={url} alt={`face ${i + 1}`} className="h-full w-full object-cover block" />
                          )}
                        </div>
                      </motion.button>
                    </div>
                  ))}
                </div>

                {/* Two full-width buttons below faces */}
                <div className="flex flex-col gap-2.5 md:gap-3 mt-2">
                  <button
                    onClick={() => { if (selectedIndex !== null) handleSelectFace(selectedIndex); }}
                    disabled={selectedIndex === null}
                    className="flex h-14 md:h-16 w-full items-center justify-center gap-2 text-sm md:text-xl font-[900] lowercase transition-all duration-150 active:scale-[0.99] disabled:cursor-not-allowed"
                    style={{
                      borderRadius: 10,
                      backgroundColor: selectedIndex !== null ? "#ffe603" : "hsl(var(--card))",
                      color: selectedIndex !== null ? "#000" : "#ffffff",
                    }}
                  >
                    {selectedIndex !== null ? "use this face →" : "use this face →"}
                  </button>

                  <button
                    onClick={() => {
                      if (isFreeUser) {
                        toast("please add gems");
                        return;
                      }
                      setShowRegenConfirm(true);
                    }}
                    disabled={isFreeUser}
                    className="flex h-14 md:h-16 w-full items-center justify-center gap-1.5 text-sm md:text-xl font-[900] lowercase transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
                    style={{
                      borderRadius: 10,
                      backgroundColor: "#050a10",
                      border: "2px solid #00e0ff",
                      color: "#ffffff",
                    }}
                  >
                    <RefreshCw size={16} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
                    regenerate all <span style={{ color: "#00e0ff" }}>•</span> 1
                    <Gem size={13} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
                  </button>
                </div>

                {/* Traits summary */}
                {(() => {
                  try {
                    const raw = sessionStorage.getItem("vizura_character_draft");
                    if (!raw) return null;
                    const draft = JSON.parse(raw);
                    const traitItems = [
                      { label: "skin", value: draft.skin },
                      { label: "body", value: draft.bodyType },
                      { label: "size", value: draft.bustSize || "regular" },
                      { label: "age", value: displayAge(draft.characterName || "draft", draft.age) },
                      { label: "hair colour", value: draft.hairColour },
                      { label: "hair style", value: draft.hairStyle },
                      { label: "eyes", value: draft.eye },
                    ].filter(t => t.value);
                    if (traitItems.length === 0) return null;
                    return (
                      <div className="mt-4 md:mt-6 px-4 py-3" style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }}>
                        <div className="grid grid-cols-4 gap-1.5">
                          {traitItems.map((t) => (
                            <div key={t.label} className="rounded-[10px] py-2 text-center" style={{ backgroundColor: "hsl(var(--card))" }}>
                              <span className="block font-[800] uppercase leading-none mb-1.5 text-[8px] text-white">{t.label}</span>
                              <span className="inline-block font-[800] lowercase text-white leading-none text-[11px] border-[2px] border-[hsl(var(--border-mid))] rounded-[10px]" style={{ backgroundColor: "#000", padding: "6px 12px" }}>{t.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } catch { return null; }
                })()}
              </div>
            </main>
          </>
        )}

        {!loading && faces.length === 0 && !showSignIn && (
          <main className="mx-auto flex h-[calc(100dvh-57px)] w-full max-w-lg flex-col px-[14px] pt-8">
            <div className="mt-16 flex flex-col items-center gap-4">
              <p className="text-sm font-[900] lowercase text-white">{generationError || "no faces generated yet"}</p>
              {generationError && (
                <button
                  type="button"
                  onClick={() => void generateFaces()}
                  className="h-10 px-4 text-[12px] font-[900] lowercase"
                  style={{ backgroundColor: "#ffe603", color: "#000", borderRadius: 10 }}
                >
                  try again
                </button>
              )}
            </div>
          </main>
        )}

        <RegenerateConfirmDialog
          open={showRegenConfirm}
          onConfirm={() => {
            setShowRegenConfirm(false);
            handleRegenerate();
          }}
          onCancel={() => setShowRegenConfirm(false)}
          message="regenerate all faces?"
          confirmLabel="yes • 30"
          gemCost
        />

        <RegenerateConfirmDialog
          open={showBackConfirm}
          message={"are you sure?\nyou will lose your progress"}
          confirmLabel="yes, go back"
          gemCost={false}
          onConfirm={() => {
            setShowBackConfirm(false);
            sessionStorage.removeItem(FACE_STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem("vizura_selected_face");
            sessionStorage.removeItem("vizura_guided_prompt");
            sessionStorage.removeItem("vizura_pending_char_id");
            sessionStorage.removeItem(AUTH_RESUME_KEY);
            sessionStorage.removeItem("vizura_guided_flow_state");
            navigate("/", { replace: true });
            if (characterId && user) {
              supabase.from("characters").delete().eq("id", characterId).eq("user_id", user.id).then(() => {});
            }
          }}
          onCancel={() => setShowBackConfirm(false)}
        />
        <ImageZoomViewer url={zoomedFaceUrl} onClose={() => setZoomedFaceUrl(null)} showDownload={false} />
      </div>
    </>
  );
};

export default ChooseFace;
