import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, Gem } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import PageTitle from "@/components/PageTitle";

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

  // Fresh creation should only wipe faces when there are genuinely no cached
  // results yet.  On a browser refresh location.state persists, so we must NOT
  // re-clear faces that were already generated and stored in sessionStorage.
  const cachedFacesExist = (() => {
    try {
      const raw = sessionStorage.getItem(FACE_STORAGE_KEY);
      if (!raw) return false;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length > 0;
    } catch { return false; }
  })();

  const isFreshCreation = !!stateFresh && !cachedFacesExist;
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
  const isFreeUser = !subscribed && gems <= 0;

  // Second loading phase: angle + body generation
  const [angleLoading, setAngleLoading] = useState(false);
  const [angleApiDone, setAngleApiDone] = useState(false);
  const [angleBarComplete, setAngleBarComplete] = useState(false);
  const [pendingNavCharId, setPendingNavCharId] = useState<string | null>(null);

  const hasInitRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("vizura:blackout:end"));
    }, 320);

    return () => window.clearTimeout(timer);
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
          setShowPaywall(true);
          setLoading(false);
          return;
        }
        if (result.code === "CONTENT_POLICY") {
          toast.error("please adjust your description and try again");
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
      toast("please add gems");
      return;
    }
    if (!user) return;

    // Go back to loading bar, regenerate from scratch
    setFaces([]);
    setSelectedIndex(null);
    setLoading(true);
    setApiDone(false);
    setBarComplete(false);
    setCardsRevealed(false);
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
      setApiDone(true);
      await refetchGems();
      toast("1 gem used");
    } catch (err: any) {
      toast.error("generation failed, please try again");
      setLoading(false);
    }
  };

  const handleFaceClick = (i: number) => {
    setSelectedIndex(i);
    setPulseIndex(i);
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

    if (!cId) {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          const charData = {
            user_id: currentUser.id,
            name: sanitiseText(draft.characterName || "", 100) || "new character",
            country: sanitiseText(draft.skin || "", 50),
            age: draft.age === "18-24" ? "18" : draft.age === "24+" ? "24" : draft.age === "18" ? "18" : draft.age === "24" ? "24" : "18",
            hair: sanitiseText(draft.hairColour || "", 50),
            eye: sanitiseText(draft.eye || "", 50),
            body: sanitiseText(draft.bodyType || "", 50),
            style: sanitiseText(draft.makeup || "", 50),
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
          }
        }
      } catch (err) {
        toast.error("failed to save character");
        return false;
      }
    } else {
      try {
        const { error: updateError } = await supabase
          .from("characters")
          .update({ face_image_url: faceUrl, generation_prompt: prompt })
          .eq("id", cId)
          .eq("user_id", currentUser.id);
        if (updateError) throw updateError;
      } catch (err) {
        toast.error("failed to save selected face");
        return false;
      }
    }

    // Save the selected face to generations (angle + body will be added later)
    if (faceUrl) {
      await supabase.from("generations").insert({
        user_id: currentUser.id,
        prompt: prompt || "face generation",
        image_urls: [faceUrl],
      });
    }

    // Generate angle + body with a second loading bar
    if (faceUrl && cId) {
      const angleCharacterId = cId;
      const anglePrompt = prompt || "";
      let bodyType = "regular";
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          bodyType = draft.bodyType || "regular";
        }
      } catch {}
      try {
        const { data: charRecord } = await supabase
          .from("characters")
          .select("body")
          .eq("id", angleCharacterId)
          .single();
        if (charRecord?.body) bodyType = charRecord.body;
      } catch {}

      // Show second loading bar
      setAngleLoading(true);
      setAngleApiDone(false);
      setAngleBarComplete(false);
      setPendingNavCharId(angleCharacterId);

      try {
        const { data, error } = await supabase.functions.invoke("generate", {
          body: {
            prompt: anglePrompt,
            generate_angles: true,
            selected_face_url: faceUrl,
            body_type: bodyType,
            angle_character_id: angleCharacterId,
          },
        });
        if (error) console.error("Angle + body generation failed:", error);
        else console.log("Angle + body generation completed:", { characterId: angleCharacterId, angle: data?.angle_url, body: data?.body_anchor_url });
      } catch (e) {
        console.error("Angle + body generation failed:", e);
      }

      setAngleApiDone(true);
      // Don't navigate yet — wait for bar to complete via tap
      return true;
    }

    // No angle gen needed — navigate immediately
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

  // Handle second loading bar completion — navigate to character page
  const handleAngleBarComplete = useCallback(() => {
    setAngleBarComplete(true);
  }, []);

  const handleAngleTapContinue = useCallback(() => {
    const cId = pendingNavCharId;
    if (cId) sessionStorage.setItem("vizura_new_char_highlight", cId);
    sessionStorage.removeItem("vizura_selected_face");
    sessionStorage.removeItem("vizura_guided_prompt");
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem("vizura_pending_char_id");
    sessionStorage.removeItem(FACE_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_RESUME_KEY);
    setPendingAuthSave(false);
    setShowSignIn(false);
    setAngleLoading(false);
    toast.success("character added!");
    navigate(`/characters/${cId}`, { replace: true });
  }, [pendingNavCharId, navigate]);

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

        {/* Full-screen loading bar while faces generate */}
        <AnimatePresence>
          {loading && (
            <motion.div
              key="face-loader"
              className="fixed inset-0 z-[10001] flex flex-col items-center justify-center bg-black pt-10"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeInOut" }}
              >
                <ProgressBarLoader
                  duration={45000}
                  phrases={FACE_GEN_PHRASES}
                  phraseInterval={5000}
                  requireTapToContinue={true}
                  expandTapTarget={true}
                  completeNow={apiDone}
                  onComplete={() => setBarComplete(true)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Second loading bar: angle + body generation */}
        <AnimatePresence>
          {angleLoading && (
            <motion.div
              key="angle-loader"
              className="fixed inset-0 z-[10001] flex flex-col items-center justify-center bg-black pt-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeInOut" }}
              >
                <ProgressBarLoader
                  duration={30000}
                  phrases={ANGLE_GEN_PHRASES}
                  phraseInterval={5000}
                  requireTapToContinue={true}
                  expandTapTarget={true}
                  completeNow={angleApiDone}
                  onComplete={handleAngleTapContinue}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Face picker — shown after loading completes */}
        {!loading && faces.length > 0 && (
          <>
            <DotDecal />

            <main className="relative z-[1] mx-auto flex w-full max-w-lg flex-col overflow-y-auto px-[14px] pt-4 pb-[280px] md:max-w-3xl md:px-10">
              <div className="flex items-center gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => setShowBackConfirm(true)}
                  className="flex items-center justify-center hover:opacity-90 transition-colors active:scale-95 w-[40px] h-[40px] md:w-[48px] md:h-[48px]"
                  style={{ borderRadius: 12, backgroundColor: "#facc15" }}
                  aria-label="go back"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-[16px] md:h-[16px]">
                    <line x1="12" y1="7" x2="2" y2="7" />
                    <polyline points="7,2 2,7 7,12" />
                  </svg>
                </button>
                <PageTitle className="mb-0">pick your face</PageTitle>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <Gem size={16} strokeWidth={2.5} style={{ color: "#00e0ff" }} className="md:!w-[20px] md:!h-[20px]" />
                <span className="text-sm md:text-base font-[900] lowercase text-foreground">{gems} gems</span>
              </div>

              <div className="mx-auto mt-2 flex w-full max-w-[26rem] md:max-w-[40rem] flex-col gap-4 md:gap-6">
                <div className="grid grid-cols-3 gap-3 md:gap-6" style={{ perspective: "800px" }}>
                  {faces.map((url, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <motion.button
                        type="button"
                        onClick={() => handleFaceClick(i)}
                        initial={{ rotateY: 90, opacity: 0 }}
                        animate={cardsRevealed ? { rotateY: 0, opacity: 1 } : { rotateY: 90, opacity: 0 }}
                        whileTap={{ scale: 1.02 }}
                        transition={{
                          rotateY: { duration: 0.5, delay: cardDelays[i], ease: [0.34, 1.56, 0.64, 1] },
                          opacity: { duration: 0.5, delay: cardDelays[i], ease: [0.34, 1.56, 0.64, 1] },
                        }}
                        className="relative aspect-[3/4] w-full transition-all duration-300 ease-out"
                        style={{
                          borderRadius: 12,
                          border: selectedIndex === i ? "3px solid #facc15" : "none",
                          padding: selectedIndex === i ? 0 : 3,
                          overflow: "hidden",
                        }}
                      >
                        <div className="w-full h-full overflow-hidden" style={{ borderRadius: 10 }}>
                          <img src={url} alt={`face ${i + 1}`} className="h-full w-full object-cover block" />
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
                    className="flex h-14 md:h-16 w-full items-center justify-center gap-2 text-sm md:text-base font-[900] lowercase transition-all duration-150 active:scale-[0.99] disabled:cursor-not-allowed"
                    style={{
                      borderRadius: 12,
                      backgroundColor: selectedIndex !== null ? "#facc15" : "#2a2a2a",
                      color: selectedIndex !== null ? "#000" : "transparent",
                    }}
                  >
                    {selectedIndex !== null ? "use this face →" : "\u00A0"}
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
                    className="flex h-14 md:h-16 w-full items-center justify-center gap-1.5 text-sm md:text-base font-[900] lowercase transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
                    style={{
                      borderRadius: 12,
                      backgroundColor: "#050a10",
                      border: "2px solid #00e0ff",
                      color: "#ffffff",
                    }}
                  >
                    <RefreshCw size={16} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
                    regenerate <span style={{ color: "#00e0ff" }}>•</span> 1
                    <Gem size={13} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
                  </button>
                </div>
              </div>
            </main>
          </>
        )}

        {!loading && faces.length === 0 && !showSignIn && (
          <main className="mx-auto flex h-[calc(100dvh-57px)] w-full max-w-lg flex-col px-[14px] pt-8">
            <div className="mt-16 flex flex-col items-center gap-4">
              <p className="text-sm font-[900] lowercase" style={{ color: "rgba(255,255,255,0.4)" }}>{generationError || "no faces generated yet"}</p>
              {generationError && (
                <button
                  type="button"
                  onClick={() => void generateFaces()}
                  className="h-10 px-4 text-[12px] font-[900] lowercase"
                  style={{ backgroundColor: "#facc15", color: "#000", borderRadius: 12 }}
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
          confirmLabel="yes • 1"
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
      </div>
    </>
  );
};

export default ChooseFace;
