import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Check, RefreshCw, Gem } from "lucide-react";
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

  // Try sessionStorage fallback for prompt (e.g. after sign-in redirect)
  const prompt = statePrompt || sessionStorage.getItem("vizura_guided_prompt") || undefined;
  const [characterId, setCharacterId] = useState<string | undefined>(stateCharId || sessionStorage.getItem("vizura_pending_char_id") || undefined);

  const [faces, setFaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCooking, setShowCooking] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [rerolling, setRerolling] = useState(false);

  useEffect(() => {
    if (!prompt) { navigate("/"); return; }
    generateFaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateFaces = async () => {
    setLoading(true);
    try {
      // For demo / non-auth: show placeholder boxes
      if (!user) {
        // Simulate with placeholders
        setFaces([]);
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
      setFaces(imgs.slice(0, 3));
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
    setRerolling(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: { prompt },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setFaces((data.images || []).slice(0, 3));
      setSelectedIndex(null);
      await refetchGems();
      toast("1 gem used");
    } catch (err: any) {
      toast.error(err?.message || "regeneration failed");
    } finally {
      setRerolling(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedIndex === null) return;

    // If not logged in, require sign-in after face selection
    if (!user) {
      // Store selected face index in session
      sessionStorage.setItem("vizura_selected_face", String(selectedIndex));
      setShowSignIn(true);
      return;
    }

    await finalizeConfirm();
  };

  const finalizeConfirm = async () => {
    const faceIdx = selectedIndex ?? Number(sessionStorage.getItem("vizura_selected_face") ?? "0");

    // If we still don't have a character, create one from stored draft
    let cId = characterId;
    if (!cId && user) {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          const charData = {
            user_id: user.id,
            name: sanitiseText(draft.characterName, 100) || "new character",
            country: sanitiseText(draft.skin, 50),
            age: draft.age || "25",
            hair: sanitiseText(draft.hairColour, 50),
            eye: sanitiseText(draft.eye, 50),
            body: sanitiseText(draft.bodyType, 50),
            style: sanitiseText(draft.makeup, 50),
            description: sanitiseText(`${draft.chest} chest, ${draft.hairStyle} hair.`, 500),
            generation_prompt: prompt || "",
          };
          const { data: inserted, error: insertError } = await supabase
            .from("characters")
            .insert(charData)
            .select("id")
            .single();
          if (!insertError && inserted) {
            cId = inserted.id;
            setCharacterId(cId);
            sessionStorage.setItem("vizura_pending_char_id", cId);
          }
        }
      } catch {}
    }

    // Save face to character if we have faces
    if (cId && faces[faceIdx]) {
      try {
        await supabase
          .from("characters")
          .update({ face_image_url: faces[faceIdx], generation_prompt: prompt } as any)
          .eq("id", cId);
      } catch {}
    }

    // Clean up session
    sessionStorage.removeItem("vizura_selected_face");
    sessionStorage.removeItem("vizura_guided_prompt");
    sessionStorage.removeItem(STORAGE_KEY);

    // Start cooking for subscribed users, free trial path otherwise
    if (subscribed) {
      setShowCooking(true);
    } else {
      // Free trial: show paywall after this
      toast.success("character added!");
      navigate("/characters");
    }
  };

  const handleSignedIn = useCallback(() => {
    setShowSignIn(false);
    finalizeConfirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, characterId, faces, prompt, subscribed]);

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

        {/* Gem balance */}
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
            {/* 3 portrait boxes */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {faces.length > 0 ? faces.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={`relative aspect-[3/4] overflow-hidden rounded-2xl border-[5px] transition-all ${
                    selectedIndex === i
                      ? "border-neon-yellow"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  <img src={url} alt={`face ${i + 1}`} className="h-full w-full object-cover" />
                  {selectedIndex === i && (
                    <div className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-neon-yellow">
                      <Check size={14} strokeWidth={3} className="text-neon-yellow-foreground" />
                    </div>
                  )}
                </button>
              )) : (
                // Placeholder boxes for non-auth users
                [0, 1, 2].map((i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    className={`aspect-[3/4] rounded-2xl border-[5px] transition-all ${
                      selectedIndex === i
                        ? "border-neon-yellow bg-card"
                        : "border-border bg-card hover:border-foreground/40"
                    }`}
                  >
                    {selectedIndex === i && (
                      <div className="flex h-full w-full items-center justify-center">
                        <Check size={24} strokeWidth={3} className="text-neon-yellow" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleRegenerate}
                disabled={rerolling || !user}
                className="flex-1 h-14 rounded-2xl border-[5px] border-border bg-card text-sm font-extrabold lowercase text-foreground flex items-center justify-center gap-2 transition-colors hover:border-foreground/40 disabled:opacity-50"
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
                className="flex-1 h-14 rounded-2xl bg-neon-yellow text-sm font-extrabold lowercase text-neon-yellow-foreground flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
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
