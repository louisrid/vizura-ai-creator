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

  useEffect(() => {
    if (!prompt) { navigate("/"); return; }
    if (faces.length > 0) {
      setLoading(false);
      return;
    }
    generateFaces();
  }, []);

  useEffect(() => {
    if (showSignIn || !user || faces.length === 0 || sessionStorage.getItem(AUTH_RESUME_KEY) !== "1") return;

    const storedFace = Number(sessionStorage.getItem("vizura_selected_face") ?? "-1");
    if (storedFace < 0) return;

    setSelectedIndex(storedFace);
    void doFinalSave(storedFace);
  }, [user, faces.length, showSignIn]);

  const generateFaces = async () => {
    setLoading(true);
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
    if (!user) {
      setRerolling(true);
      setSelectedIndex(null);
      setTimeout(() => {
        setDemoEmojis(getRandomEmojis(3, demoEmojis));
        setShuffleKey((k) => k + 1);
        setRerolling(false);
      }, 400);
      return;
    }
    setRerolling(true);
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
    }
  };

  // Toggle selection — tap again to deselect
  const handleFaceClick = (i: number) => {
    setSelectedIndex((prev) => (prev === i ? null : i));
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

  // The actual save function - reads current user from auth context at call time
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

    let cId = characterId;
    
    // If no character ID exists, create from draft data
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
            description: sanitiseText(`${draft.chest || ""} chest, ${draft.hairStyle || ""} hair. ${draft.description || ""}`, 500),
            generation_prompt: prompt || "",
          };
          console.log("[ChooseFace] Creating character with data:", charData);
          const { data: inserted, error: insertError } = await supabase
            .from("characters")
            .insert(charData)
            .select("id")
            .single();
          if (insertError) {
            console.error("[ChooseFace] Insert error:", insertError);
            toast.error("failed to save character: " + insertError.message);
            return false;
          }
          if (inserted) {
            cId = inserted.id;
            setCharacterId(cId);
            sessionStorage.setItem("vizura_pending_char_id", cId);
            console.log("[ChooseFace] Character created with id:", cId);
          }
        } else {
          console.warn("[ChooseFace] No draft data in sessionStorage");
        }
      } catch (err) {
        console.error("[ChooseFace] Error creating character:", err);
        toast.error("failed to save character");
        return false;
      }
    }

    // Save face selection to character
    if (cId) {
      const faceUrl = faces[faceIdx] || null;
      try {
        const { error: updateError } = await supabase
          .from("characters")
          .update({ face_image_url: faceUrl, generation_prompt: prompt })
          .eq("id", cId)
          .eq("user_id", currentUser.id);
        if (updateError) throw updateError;
        console.log("[ChooseFace] Updated face for character:", cId);
      } catch (err) {
        console.error("[ChooseFace] Error updating face:", err);
        toast.error("failed to save selected face");
        return false;
      }
    }

    if (cId) {
      sessionStorage.setItem("vizura_new_char_highlight", cId);
    }

    // Cleanup
    sessionStorage.removeItem("vizura_selected_face");
    sessionStorage.removeItem("vizura_guided_prompt");
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem("vizura_pending_char_id");
    sessionStorage.removeItem(FACE_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_RESUME_KEY);

    toast.success("character added!");
    navigate("/characters");
    return true;
  };

  const handleSignedIn = useCallback(async () => {
    setShowSignIn(false);
    sessionStorage.removeItem(AUTH_RESUME_KEY);
    // Small delay to ensure auth state is fully propagated
    await new Promise((r) => setTimeout(r, 300));
    await doFinalSave();
  }, [selectedIndex, characterId, faces, prompt]);

  const handleCookingComplete = () => {
    setShowCooking(false);
    toast.success("character added!");
    navigate("/characters");
  };

  if (showPaywall) {
    return (
      <div className="relative min-h-screen bg-background">
        <PaywallOverlay open={true} onClose={() => navigate("/")} hasSubscription={subscribed} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <CookingOverlay open={showCooking} onComplete={handleCookingComplete} />
      <SignInOverlay open={showSignIn} onSignedIn={handleSignedIn} />

      <main className="mx-auto flex w-full max-w-lg flex-col px-4 pt-14 pb-12">
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
            <div className="grid grid-cols-3 gap-3 mt-4">
              {faces.length > 0 ? faces.map((url, i) => (
                <button
                  key={i}
                  onClick={() => handleFaceClick(i)}
                  className={`relative aspect-[3/4] overflow-hidden rounded-2xl border-[5px] transition-all duration-200 ${
                    selectedIndex === i
                      ? "border-neon-yellow"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  <img src={url} alt={`face ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              )) : (
                demoEmojis.map((emoji, i) => (
                  <AnimatePresence mode="wait" key={`slot-${i}`}>
                    <motion.button
                      key={`${shuffleKey}-${i}`}
                      onClick={() => handleFaceClick(i)}
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{ rotateY: -90, opacity: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.08 }}
                      className={`aspect-[3/4] rounded-2xl border-[5px] transition-all duration-200 flex items-center justify-center ${
                        selectedIndex === i
                          ? "border-neon-yellow bg-secondary"
                          : "border-border bg-secondary hover:border-foreground/40"
                      }`}
                    >
                      <span className="text-4xl leading-none">{emoji}</span>
                    </motion.button>
                  </AnimatePresence>
                ))
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleRegenerate}
                disabled={rerolling}
                className="flex-1 h-14 rounded-2xl bg-white text-sm font-extrabold lowercase text-black flex items-center justify-center gap-2 transition-colors active:bg-white/70 disabled:opacity-50"
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
          </>
        )}
      </main>
    </div>
  );
};

export default ChooseFace;
