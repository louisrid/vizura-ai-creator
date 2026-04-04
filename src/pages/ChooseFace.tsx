import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, Gem } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { SignInOverlay } from "@/components/GuidedCreator";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useGems } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import PaywallOverlay from "@/components/PaywallOverlay";
import ProgressBarLoader from "@/components/loading/ProgressBarLoader";
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

const ANCHOR_GEN_PHRASES = [
  "building your character…",
  "generating angles…",
  "creating full body…",
  "finalising…",
];

const SUCCESS_HOLD = 3500;

const ChooseFace = () => {
  const { user, loading: authLoading } = useAuth();
  const { gems, refetch: refetchGems } = useGems();
  const { subscribed } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  const { prompt: statePrompt, characterId: stateCharId } = (location.state as {
    prompt?: string;
    characterId?: string;
  }) || {};

  const prompt = statePrompt || sessionStorage.getItem("vizura_guided_prompt") || undefined;
  const [characterId, setCharacterId] = useState<string | undefined>(stateCharId || sessionStorage.getItem("vizura_pending_char_id") || undefined);

  const [faces, setFaces] = useState<string[]>(() => {
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [cardsRevealed, setCardsRevealed] = useState(false);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const [anchorLoading, setAnchorLoading] = useState(false);
  const [anchorApiDone, setAnchorApiDone] = useState(false);
  const [anchorBarComplete, setAnchorBarComplete] = useState(false);
  const isFreeUser = !subscribed && gems <= 0;

  // Green success screen phase
  const [showSuccess, setShowSuccess] = useState(false);
  const hasShownSuccess = useRef(false);

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
      setLoading(false);
      return;
    }
    void generateFaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // Show green success screen after bar completes (not after API finishes)
  useEffect(() => {
    if (barComplete && faces.length > 0 && !hasShownSuccess.current) {
      hasShownSuccess.current = true;
      setLoading(false);
      setShowSuccess(true);
    }
  }, [barComplete, faces.length]);

  useEffect(() => {
    if (!loading && !showSuccess && !cardsRevealed && faces.length > 0) {
      const t = setTimeout(() => setCardsRevealed(true), 100);
      return () => clearTimeout(t);
    }
  }, [loading, showSuccess, cardsRevealed, faces.length]);

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
    try {
      if (!user) {
        setFaces([]);
        setLoading(false);
        setShowSignIn(true);
        return;
      }
      setShowSignIn(false);
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: { prompt, free_gen: true },
      });
      if (fnError) {
        // supabase.functions.invoke puts non-2xx responses in error
        // Try to parse the response body for structured error info
        const parsed = typeof fnError === "object" && fnError?.context ? await fnError.context?.json?.().catch(() => null) : null;
        if (parsed?.code === "FREE_GEN_USED" || parsed?.code === "IP_USED") {
          // Fall through to retry path below
        } else {
          throw fnError;
        }
      }
      if (data?.error) {
        if (data.code === "FREE_GEN_USED" || data.code === "IP_USED") {
          const { data: retryData, error: retryError } = await supabase.functions.invoke("generate", {
            body: { prompt, face_regen: true },
          });
          if (retryError) {
            console.error("Face regen error:", retryError);
            throw retryError;
          }
          if (retryData?.error) {
            if (retryData.code === "NO_GEMS") {
              setShowPaywall(true);
              setLoading(false);
              return;
            }
            throw new Error(retryData.error);
          }
          const retryImgs = retryData.images || [];
          const retryFaces = retryImgs.slice(0, 3);
          setFaces(retryFaces);
          sessionStorage.setItem(FACE_STORAGE_KEY, JSON.stringify(retryFaces));
          setSelectedIndex(null);
          setApiDone(true);
          return;
        }
        if (data.code === "CONTENT_POLICY") {
          toast.error("please adjust your description and try again");
          setLoading(false);
          return;
        }
        throw new Error(data.error);
      }
      const imgs = data.images || [];
      const nextFaces = imgs.slice(0, 3);
      setFaces(nextFaces);
      sessionStorage.setItem(FACE_STORAGE_KEY, JSON.stringify(nextFaces));
      setSelectedIndex(null);
      setApiDone(true);
    } catch (err: any) {
      const msg = err?.message || "generation failed";
      if (msg.includes("Free generation") || msg.includes("IP_USED") || msg.includes("FREE_GEN_USED")) {
        setShowPaywall(true);
      } else {
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

    setRerolling(true);
    setCardsRevealed(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: { prompt, face_regen: true },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      const nextFaces = (data.images || []).slice(0, 3);
      setFaces(nextFaces);
      sessionStorage.setItem(FACE_STORAGE_KEY, JSON.stringify(nextFaces));
      setSelectedIndex(null);
      await refetchGems();
      toast("1 gem used");
    } catch (err: any) {
      toast.error("generation failed, please try again");
    } finally {
      setRerolling(false);
      setTimeout(() => setCardsRevealed(true), 100);
    }
  };

  const handleFaceClick = (i: number) => {
    setSelectedIndex(i);
    setPulseIndex(i);
    window.setTimeout(() => setPulseIndex((current) => (current === i ? null : current)), 360);
  };

  const handleConfirm = async () => {
    if (selectedIndex === null) return;

    if (!user) {
      sessionStorage.setItem("vizura_selected_face", String(selectedIndex));
      sessionStorage.setItem(AUTH_RESUME_KEY, "1");
      setShowSignIn(true);
      return;
    }

    await doFinalSave();
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
            age: draft.age || "25",
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

    // Save only the selected face to generations
    if (faceUrl) {
      await supabase.from("generations").insert({
        user_id: currentUser.id,
        prompt: prompt || "face generation",
        image_urls: [faceUrl],
      });
    }

    // Generate 3/4 angle + full-body anchor (BLOCKING with loading screen)
    if (faceUrl && cId) {
      setAnchorLoading(true);
      setAnchorApiDone(false);
      setAnchorBarComplete(false);

      const angleCharacterId = cId;
      const anglePrompt = prompt || "";
      const angleUserId = currentUser.id;

      // Get body type from session storage draft
      let bodyType = "regular";
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          bodyType = draft.bodyType || "regular";
        }
      } catch {}
      // Also check the character record we just saved
      try {
        const { data: charRecord } = await supabase
          .from("characters")
          .select("body")
          .eq("id", angleCharacterId)
          .single();
        if (charRecord?.body) bodyType = charRecord.body;
      } catch {}

      try {
        const { data: angleData } = await supabase.functions.invoke("generate", {
          body: {
            prompt: anglePrompt,
            generate_angles: true,
            selected_face_url: faceUrl,
            body_type: bodyType,
          },
        });

        if (angleData?.angle_url || angleData?.body_anchor_url) {
          await supabase
            .from("characters")
            .update({
              face_angle_url: angleData.angle_url || null,
              body_anchor_url: angleData.body_anchor_url || null,
            })
            .eq("id", angleCharacterId)
            .eq("user_id", angleUserId);
        }
      } catch (e) {
        console.error("Angle + body generation failed:", e);
      }

      setAnchorApiDone(true);
      // Wait for bar to complete
      await new Promise<void>((resolve) => {
        const check = () => {
          // anchorBarComplete might not be set yet, use a polling approach
          resolve();
        };
        // Give the bar a moment, then proceed
        setTimeout(check, 1500);
      });
    }

    if (cId) {
      sessionStorage.setItem("vizura_new_char_highlight", cId);
    }

    sessionStorage.removeItem("vizura_selected_face");
    sessionStorage.removeItem("vizura_guided_prompt");
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem("vizura_pending_char_id");
    sessionStorage.removeItem(FACE_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_RESUME_KEY);

    setPendingAuthSave(false);
    setShowSignIn(false);
    setAnchorLoading(false);

    toast.success("character added!");
    navigate("/characters", { replace: true });
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
    <div className="relative min-h-[calc(100dvh-73px)] overflow-hidden bg-background w-full">
      <SignInOverlay open={showSignIn} onSignedIn={handleSignedIn} />

      {/* Full-screen loading bar while faces generate */}
      {loading && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
          >
            <ProgressBarLoader
              duration={120000}
              phrases={FACE_GEN_PHRASES}
              phraseInterval={5000}
              requireTapToContinue={false}
              completeNow={apiDone}
              onComplete={() => setBarComplete(true)}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Full-screen loading bar while generating 3/4 angle + full body */}
      {anchorLoading && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
          >
            <ProgressBarLoader
              duration={90000}
              phrases={ANCHOR_GEN_PHRASES}
              phraseInterval={5000}
              requireTapToContinue={false}
              completeNow={anchorApiDone}
              onComplete={() => setAnchorBarComplete(true)}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Green "character created!" success screen */}
      <AnimatePresence>
        {showSuccess && (
          <motion.button
            key="success-screen"
            type="button"
            onClick={() => setShowSuccess(false)}
            className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: "hsl(var(--member-green))" }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeInOut" }}
          >
             <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ marginTop: "-15vh" }}
            >
              <p className="text-center text-[3.5rem] font-[900] lowercase leading-[1.0] text-black">
                <span className="block">character</span>
                <span className="block">created!</span>
              </p>
              <motion.p
                className="mt-4 text-sm font-[800] lowercase text-black/50"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              >tap to continue</motion.p>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Face picker — only shown after success screen */}
      {!loading && faces.length > 0 && !showSuccess && (
        <main className="mx-auto flex h-[calc(100dvh-57px)] w-full max-w-lg md:max-w-3xl flex-col px-[14px] md:px-8 pt-4 pb-0 overflow-hidden">
          <div className="flex items-center gap-3 mb-5">
            <BackButton />
            <PageTitle className="mb-0">pick your face</PageTitle>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <Gem size={16} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
            <span className="text-sm font-[900] lowercase text-foreground">{gems} gems</span>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-5 mt-4 shrink-0 md:max-w-xl md:mx-auto" style={{ perspective: "800px" }}>
            {faces.map((url, i) => (
              <motion.button
                key={i}
                type="button"
                onClick={() => handleFaceClick(i)}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={cardsRevealed ? { rotateY: 0, opacity: 1 } : { rotateY: 90, opacity: 0 }}
                whileTap={{ scale: 1.02 }}
                transition={{
                  rotateY: { duration: 0.5, delay: cardDelays[i], ease: [0.34, 1.56, 0.64, 1] },
                  opacity: { duration: 0.5, delay: cardDelays[i], ease: [0.34, 1.56, 0.64, 1] },
                }}
                className="relative aspect-[3/4] overflow-hidden transition-all duration-300 ease-out"
                style={{
                  borderRadius: 16,
                  border: selectedIndex === i ? "3px solid #facc15" : "2px solid #222",
                }}
              >
                <img src={url} alt={`face ${i + 1}`} className="h-full w-full object-cover" />
              </motion.button>
            ))}
          </div>

          {/* Confirm CTA shown when a face is selected */}
          <AnimatePresence>
            {selectedIndex !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="mt-6 w-full flex justify-center"
              >
                <button
                  onClick={handleConfirm}
                  className="h-14 w-full max-w-[16rem] text-[15px] font-[900] lowercase flex items-center justify-center gap-2 active:scale-[0.96] transition-transform duration-150"
                  style={{ backgroundColor: "#facc15", color: "#000", borderRadius: 12 }}
                >
                  use this face →
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 min-h-[1rem]" />

          <div className="-mx-[14px] shrink-0">
            <div style={{ height: 1, backgroundColor: "#222" }} />
            <div className="px-[14px] pt-5 pb-[max(env(safe-area-inset-bottom),1.5rem)]" style={{ backgroundColor: "#000" }}>
              <div className="flex gap-3">
                {/* Regenerate - opaque secondary */}
                <button
                  onClick={handleRegenerate}
                  disabled={rerolling}
                  className="flex-1 h-14 text-sm font-[900] lowercase flex items-center justify-center gap-2 transition-colors disabled:opacity-50 relative overflow-hidden"
                  style={{
                    backgroundColor: isFreeUser ? "#111111" : "#111111",
                    borderRadius: 12,
                    color: isFreeUser ? "rgba(255,255,255,0.4)" : "#fff",
                    cursor: isFreeUser ? "not-allowed" : "pointer",
                  }}
                >
                  {!isFreeUser && (
                    <div className="absolute inset-0" style={{ backgroundColor: "rgba(250,204,21,0.06)", border: "2px solid rgba(250,204,21,0.15)", borderRadius: 12 }} />
                  )}
                  <span className="relative z-[1] flex items-center gap-2">
                    {rerolling ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <RefreshCw size={16} strokeWidth={2.5} />
                        regenerate
                        <Gem size={12} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
                        <span className="text-[11px]">1</span>
                      </>
                    )}
                  </span>
                </button>
                {/* Confirm - solid yellow */}
                <button
                  onClick={handleConfirm}
                  disabled={selectedIndex === null}
                  className="flex-1 h-14 text-sm font-[900] lowercase flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#facc15", color: "#000", borderRadius: 12 }}
                >
                  confirm
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {!loading && faces.length === 0 && !showSignIn && (
        <main className="mx-auto flex h-[calc(100dvh-57px)] w-full max-w-lg flex-col px-[14px] pt-8">
          <div className="mt-16 flex flex-col items-center gap-4">
            <p className="text-sm font-[900] lowercase" style={{ color: "rgba(255,255,255,0.4)" }}>no faces generated yet</p>
          </div>
        </main>
      )}
    </div>
  );
};

export default ChooseFace;
