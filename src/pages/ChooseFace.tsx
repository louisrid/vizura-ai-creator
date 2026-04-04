import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, Gem } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import Header from "@/components/Header";
import DotDecal from "@/components/DotDecal";
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
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [cardsRevealed, setCardsRevealed] = useState(false);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const isFreeUser = !subscribed && gems <= 0;

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

      const invokeAndParse = async (body: Record<string, unknown>, allowRetry = true): Promise<any> => {
        // Use fetch directly instead of supabase.functions.invoke to avoid
        // connection issues when the tab is backgrounded
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error("Unauthorized");

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const url = `https://${projectId}.supabase.co/functions/v1/generate`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(body),
          // No AbortSignal — let the request complete even if tab is backgrounded
        });

        const result = await response.json();

        if (!response.ok && allowRetry && result?.error === "Unauthorized") {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshed.session) {
            return invokeAndParse(body, false);
          }
        }

        return result;
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
      const invokeAndParse = async (body: Record<string, unknown>): Promise<any> => {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error("Unauthorized");
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const url = `https://${projectId}.supabase.co/functions/v1/generate`;
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

    // Save the selected face to generations (angle + body will be added later)
    if (faceUrl) {
      await supabase.from("generations").insert({
        user_id: currentUser.id,
        prompt: prompt || "face generation",
        image_urls: [faceUrl],
      });
    }

    // Fire angle + body generation in background (non-blocking)
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

      // Don't await — let it run in background; backend persists the returned URLs directly
      supabase.functions.invoke("generate", {
        body: {
          prompt: anglePrompt,
          generate_angles: true,
          selected_face_url: faceUrl,
          body_type: bodyType,
          angle_character_id: angleCharacterId,
        },
      }).then(({ data, error }) => {
        if (error) {
          console.error("Angle + body generation invoke failed:", error);
          return;
        }
        console.log("Angle + body generation completed:", {
          characterId: angleCharacterId,
          angle: data?.angle_url,
          body: data?.body_anchor_url,
        });
      }).catch((e) => {
        console.error("Angle + body generation failed:", e);
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
    <>
      {/* Persistent black backdrop — always present, never unmounts */}
      <div className="fixed inset-0 z-[9998] bg-black" />

      <div className="relative min-h-[calc(100dvh-73px)] overflow-hidden bg-background w-full" style={{ position: "relative", zIndex: 9999 }}>
        <SignInOverlay open={showSignIn} onSignedIn={handleSignedIn} />

        {/* Full-screen loading bar while faces generate */}
        <AnimatePresence>
          {loading && (
            <motion.div
              key="face-loader"
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
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
                  duration={120000}
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

        {/* Face picker — shown after loading completes */}
        {!loading && faces.length > 0 && (
          <main className="mx-auto flex min-h-[calc(100dvh-57px)] w-full max-w-lg flex-col overflow-y-auto px-[14px] pt-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] md:max-w-3xl md:px-8">
            <div className="flex items-center gap-3 mb-5">
              <BackButton />
              <PageTitle className="mb-0">pick your face</PageTitle>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <Gem size={16} strokeWidth={2.5} className="text-gem-green" />
              <span className="text-sm font-[900] lowercase text-foreground">{gems} gems</span>
            </div>

            <div className="mx-auto mt-4 flex w-full max-w-[22rem] flex-col gap-4 md:max-w-xl">
              <div className="grid grid-cols-3 gap-3 md:gap-5" style={{ perspective: "800px" }}>
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
                      className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 transition-all duration-300 ease-out ${selectedIndex === i ? "border-accent" : "border-border"}`}
                    >
                      <img src={url} alt={`face ${i + 1}`} className="h-full w-full object-cover" />
                    </motion.button>

                    <AnimatePresence>
                      {selectedIndex === i && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => handleSelectFace(i)}
                          className="flex h-9 w-full items-center justify-center rounded-full bg-accent text-[12px] font-[900] lowercase text-accent-foreground transition-transform duration-150 active:scale-[0.96]"
                        >
                          use this face →
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              <button
                onClick={handleRegenerate}
                disabled={rerolling || isFreeUser}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-[900] lowercase text-accent-foreground transition-transform duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
              >
                {rerolling ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    <RefreshCw size={16} strokeWidth={2.5} />
                    regenerate
                    <Gem size={12} strokeWidth={2.5} className="text-accent-foreground" />
                    <span className="text-[11px]">1</span>
                  </>
                )}
              </button>
            </div>
          </main>
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
                  style={{ backgroundColor: "#facc15", color: "#000", borderRadius: 10 }}
                >
                  try again
                </button>
              )}
            </div>
          </main>
        )}
      </div>
    </>
  );
};

export default ChooseFace;
