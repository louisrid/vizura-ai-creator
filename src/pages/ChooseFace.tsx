import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, Gem } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import CookingOverlay from "@/components/CookingOverlay";
import { SignInOverlay } from "@/components/GuidedCreator";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useGems } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import PaywallOverlay from "@/components/PaywallOverlay";
import { sanitiseText } from "@/lib/sanitise";

const STORAGE_KEY = "vizura_character_draft";
const FACE_STORAGE_KEY = "vizura_face_options";
const AUTH_RESUME_KEY = "vizura_resume_after_auth";
const SELECTED_EMOJI_KEY = "vizura_selected_emoji";

const FACE_EMOJIS = ["😊", "😎", "🥰", "😏", "🤩", "😇", "🥳", "😍", "🤗", "😌", "🧐", "😜", "🤭", "🫣", "💅", "✨", "👸", "🦋", "🌸", "💃"];

const getRandomEmojis = (count: number, exclude?: string[]): string[] => {
  const pool = exclude ? FACE_EMOJIS.filter((e) => !exclude.includes(e)) : [...FACE_EMOJIS];
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0] || "😊");
  }
  return result;
};

const ChooseFace = () => {
  const { user } = useAuth();
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
  const [demoEmojis, setDemoEmojis] = useState<string[]>(() => getRandomEmojis(3));
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCooking, setShowCooking] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [cardsRevealed, setCardsRevealed] = useState(false);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);

  const isFreeUser = !subscribed && gems <= 0;

  useEffect(() => {
    if (!prompt) { navigate("/"); return; }
    if (faces.length > 0) {
      setLoading(false);
      return;
    }
    generateFaces();
  }, []);

  useEffect(() => {
    if (!loading && !cardsRevealed) {
      const t = setTimeout(() => setCardsRevealed(true), 100);
      return () => clearTimeout(t);
    }
  }, [loading, cardsRevealed]);

  useEffect(() => {
    if (showSignIn || !user || faces.length === 0 || sessionStorage.getItem(AUTH_RESUME_KEY) !== "1") return;

    const storedFace = Number(sessionStorage.getItem("vizura_selected_face") ?? "-1");
    if (storedFace < 0) return;

    setSelectedIndex(storedFace);
    void doFinalSave(storedFace);
  }, [user, faces.length, showSignIn]);

  const generateFaces = async () => {
    setLoading(true);
    setCardsRevealed(false);
    try {
      if (!user) {
        setFaces([]);
        setDemoEmojis(getRandomEmojis(3));
        setSelectedIndex(null);
        setLoading(false);
        return;
      }
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: { prompt, free_gen: true },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        if (data.code === "FREE_GEN_USED" || data.code === "IP_USED") {
          setShowPaywall(true);
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
    } catch (err: any) {
      const msg = err?.message || "generation failed";
      if (msg.includes("Free generation") || msg.includes("IP_USED") || msg.includes("FREE_GEN_USED")) {
        setShowPaywall(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (isFreeUser) {
      toast("please add gems");
      return;
    }

    if (!user) {
      setRerolling(true);
      setSelectedIndex(null);
      setCardsRevealed(false);
      setTimeout(() => {
        setDemoEmojis(getRandomEmojis(3, demoEmojis));
        setShuffleKey((k) => k + 1);
        setRerolling(false);
        setTimeout(() => setCardsRevealed(true), 100);
      }, 400);
      return;
    }
    setRerolling(true);
    setCardsRevealed(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: { prompt },
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
      toast.error(err?.message || "regeneration failed");
    } finally {
      setRerolling(false);
      setTimeout(() => setCardsRevealed(true), 100);
    }
  };

  const handleFaceClick = (i: number) => {
    setSelectedIndex((prev) => (prev === i ? null : i));
    setPulseIndex(i);
    window.setTimeout(() => setPulseIndex((current) => (current === i ? null : current)), 360);
  };

  const handleConfirm = async () => {
    if (selectedIndex === null) return;

    const isEmojiMode = faces.length === 0;
    if (isEmojiMode) {
      sessionStorage.setItem(SELECTED_EMOJI_KEY, demoEmojis[selectedIndex]);
    }

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

    const selectedEmoji = sessionStorage.getItem(SELECTED_EMOJI_KEY) || (faces.length === 0 ? demoEmojis[faceIdx] : null);

    let cId = characterId;
    
    if (!cId) {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          const descParts: string[] = [`${draft.chest || ""} chest, ${draft.hairStyle || ""} hair. ${draft.description || ""}`];
          if (selectedEmoji) descParts.push(`[emoji:${selectedEmoji}]`);
          const charData = {
            user_id: currentUser.id,
            name: sanitiseText(draft.characterName || "", 100) || "new character",
            country: sanitiseText(draft.skin || "", 50),
            age: draft.age || "25",
            hair: sanitiseText(draft.hairColour || "", 50),
            eye: sanitiseText(draft.eye || "", 50),
            body: sanitiseText(draft.bodyType || "", 50),
            style: sanitiseText(draft.makeup || "", 50),
            description: sanitiseText(descParts.join(" "), 500),
            generation_prompt: prompt || "",
          };
          const { data: inserted, error: insertError } = await supabase
            .from("characters")
            .insert(charData)
            .select("id")
            .single();
          if (insertError) {
            toast.error("failed to save character: " + insertError.message);
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
    }

    if (cId) {
      const faceUrl = faces[faceIdx] || null;
      try {
        const updateData: any = { face_image_url: faceUrl, generation_prompt: prompt };
        if (!faceUrl && selectedEmoji) {
          const { data: existing } = await supabase
            .from("characters")
            .select("description")
            .eq("id", cId)
            .single();
          if (existing && !existing.description?.includes("[emoji:")) {
            updateData.description = (existing.description || "") + ` [emoji:${selectedEmoji}]`;
          }
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

    if (cId) {
      sessionStorage.setItem("vizura_new_char_highlight", cId);
    }

    sessionStorage.removeItem("vizura_selected_face");
    sessionStorage.removeItem("vizura_guided_prompt");
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem("vizura_pending_char_id");
    sessionStorage.removeItem(FACE_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_RESUME_KEY);
    sessionStorage.removeItem(SELECTED_EMOJI_KEY);

    toast.success("character added!");
    navigate("/characters", { replace: true });
    return true;
  };

  const handleSignedIn = useCallback(async () => {
    // Don't hide the sign-in overlay yet — save first, then navigate directly
    sessionStorage.removeItem(AUTH_RESUME_KEY);
    await new Promise((r) => setTimeout(r, 300));
    const saved = await doFinalSave();
    if (!saved) {
      // Only hide overlay if save failed so user can retry
      setShowSignIn(false);
    }
    // If saved, doFinalSave already navigated to /characters
  }, [selectedIndex, characterId, faces, prompt, demoEmojis]);

  const handleCookingComplete = () => {
    setShowCooking(false);
    toast.success("character added!");
    navigate("/characters", { replace: true });
  };

  if (showPaywall) {
    return (
      <div className="relative min-h-screen bg-background">
        <PaywallOverlay open={true} onClose={() => navigate("/")} hasSubscription={subscribed} />
      </div>
    );
  }

  const cardDelays = [0, 0.2, 0.4];

  return (
    <div className="relative h-[calc(100dvh-73px)] overflow-hidden" style={{ backgroundColor: "#000000" }}>
      <CookingOverlay open={showCooking} onComplete={handleCookingComplete} />
      <SignInOverlay open={showSignIn} onSignedIn={handleSignedIn} />

      <main className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pt-14 pb-0 overflow-hidden" style={{ backgroundColor: "hsl(var(--background))" }}>
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <PageTitle className="mb-0">pick your face</PageTitle>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Gem size={16} strokeWidth={2.5} className="text-gem-green" />
          <span className="text-sm font-extrabold lowercase text-foreground">{gems} gems</span>
        </div>

        {loading && (
          <div className="mt-16 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-foreground" size={40} />
            <p className="text-sm font-extrabold lowercase text-muted-foreground">generating faces...</p>
          </div>
        )}

        {!loading && (
          <>
            <div className="grid grid-cols-3 gap-3 mt-4 shrink-0" style={{ perspective: "800px" }}>
              {faces.length > 0 ? faces.map((url, i) => (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => handleFaceClick(i)}
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={cardsRevealed ? { rotateY: 0, opacity: 1 } : { rotateY: 90, opacity: 0 }}
                  whileTap={{ scale: 1.12 }}
                  transition={{
                    rotateY: { duration: 0.5, delay: cardDelays[i], ease: [0.34, 1.56, 0.64, 1] },
                    opacity: { duration: 0.5, delay: cardDelays[i], ease: [0.34, 1.56, 0.64, 1] },
                  }}
                  className={`relative aspect-[3/4] overflow-hidden rounded-2xl border-[5px] transition-colors duration-200 ${
                    selectedIndex === i
                      ? "border-neon-yellow"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  <img src={url} alt={`face ${i + 1}`} className="h-full w-full object-cover" />
                  {selectedIndex === i && pulseIndex === i && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl border-[5px] border-neon-yellow"
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.08, 0.98, 1.03, 1] }}
                      transition={{ duration: 0.34, times: [0, 0.35, 0.58, 0.8, 1] }}
                    />
                  )}
                </motion.button>
              )) : (
                demoEmojis.map((emoji, i) => (
                  <motion.button
                    key={`${shuffleKey}-${i}`}
                    type="button"
                    onClick={() => handleFaceClick(i)}
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={cardsRevealed ? { rotateY: 0, opacity: 1 } : { rotateY: 90, opacity: 0 }}
                    whileTap={{ scale: 1.12 }}
                    transition={{
                      rotateY: { duration: 0.5, delay: cardDelays[i], ease: [0.34, 1.56, 0.64, 1] },
                      opacity: { duration: 0.5, delay: cardDelays[i], ease: [0.34, 1.56, 0.64, 1] },
                    }}
                    className={`aspect-[3/4] rounded-2xl border-[5px] transition-colors duration-200 flex items-center justify-center bg-card ${
                      selectedIndex === i
                        ? "border-neon-yellow"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <span className="text-4xl leading-none">{emoji}</span>
                  </motion.button>
                ))
              )}
            </div>

            {/* Balanced spacing before divider */}
            <div className="flex-1 min-h-[2.5rem]" />

            {/* White divider + pure black bottom area */}
            <div className="-mx-4 shrink-0">
              <div className="border-t-[5px] border-white" />
              <div className="px-4 pt-6 pb-[max(env(safe-area-inset-bottom),2rem)]" style={{ backgroundColor: "#000000" }}>
                <div className="flex gap-3">
                  <button
                    onClick={handleRegenerate}
                    disabled={rerolling}
                    className={`flex-1 h-14 rounded-2xl text-sm font-extrabold lowercase flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                      isFreeUser
                        ? "text-white cursor-not-allowed"
                        : "bg-white text-black active:bg-white/70"
                    }`}
                    style={isFreeUser ? { backgroundColor: "hsl(0 0% 18%)" } : undefined}
                  >
                    {rerolling ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <RefreshCw size={16} strokeWidth={2.5} />
                        regenerate
                        <Gem size={12} strokeWidth={2.5} className="text-gem-green" />
                        <span className="text-[11px]">1</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={selectedIndex === null}
                    className="flex-1 h-14 rounded-2xl bg-neon-yellow text-sm font-extrabold lowercase text-neon-yellow-foreground flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                  >
                    confirm
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ChooseFace;
