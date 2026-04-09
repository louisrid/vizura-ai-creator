import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Trash2, Lock, RefreshCw, Camera, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useGems } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import BackButton from "@/components/BackButton";
import DotDecal from "@/components/DotDecal";
import RegenerateConfirmDialog from "@/components/RegenerateConfirmDialog";

interface Character {
  id: string;
  name: string;
  age: string;
  country: string;
  hair: string;
  eye: string;
  body: string;
  style: string;
  description: string;
  face_image_url: string | null;
  face_angle_url?: string | null;
  body_anchor_url?: string | null;
  generation_prompt?: string | null;
}

const SKIN_LABELS: Record<string, string> = {
  white: "white", pale: "pale", tan: "tan", asian: "asian", black: "black", dark: "dark",
};

const CharacterDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { gems, refetch: refetchGems } = useGems();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regeneratingAngle, setRegeneratingAngle] = useState(false);
  const [regeneratingBody, setRegeneratingBody] = useState(false);
  const [regenTarget, setRegenTarget] = useState<"angle" | "body" | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/characters/${id}`)}`, { replace: true });
    }
  }, [user, authLoading, navigate, id]);

  useEffect(() => {
    const fetch = async () => {
      if (!user || !id) return;
      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (data) setCharacter(data as unknown as Character);
      setLoading(false);
    };
    if (user) fetch();
  }, [user, id]);

  // Poll for character updates (angle/body images arriving after creation)
  useEffect(() => {
    if (!user || !id || !character) return;
    const needsUpdate = !character.face_angle_url || !character.body_anchor_url;
    if (!needsUpdate) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (data) setCharacter(data as unknown as Character);
      if (data?.face_angle_url && data?.body_anchor_url) clearInterval(interval);
    }, 3000);

    return () => clearInterval(interval);
  }, [user, id, character?.face_angle_url, character?.body_anchor_url]);

  const handleRegenerate = async () => {
    if (!character || !character.face_image_url || !user || !regenTarget) return;
    const target = regenTarget;
    setRegenTarget(null);

    if (target === "angle") setRegeneratingAngle(true);
    else setRegeneratingBody(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate", {
        body: {
          regenerate_single: target,
          character_id: character.id,
          selected_face_url: character.face_image_url,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update only the regenerated photo
      setCharacter((prev) => {
        if (!prev) return prev;
        if (target === "angle" && data?.angle_url) {
          return { ...prev, face_angle_url: data.angle_url };
        }
        if (target === "body" && data?.body_anchor_url) {
          return { ...prev, body_anchor_url: data.body_anchor_url };
        }
        return prev;
      });

      await refetchGems();
      toast("1 gem used");
    } catch (err) {
      console.error("Regenerate error:", err);
      toast.error("regeneration failed, please try again");
    } finally {
      setRegeneratingAngle(false);
      setRegeneratingBody(false);
    }
  };

  const handleDelete = async () => {
    if (!character) return;
    setDeleting(true);

    const charUrls = [character.face_image_url, character.face_angle_url, character.body_anchor_url].filter(Boolean) as string[];
    const { data: allGens } = await supabase
      .from("generations")
      .select("id, image_urls, prompt")
      .eq("user_id", user!.id);
    if (allGens) {
      const genIdsToDelete = allGens
        .filter((g: any) => {
          if (charUrls.length > 0 && (g.image_urls || []).some((u: string) => charUrls.includes(u))) return true;
          if (g.prompt === "character references" || g.prompt === "face generation") return true;
          return false;
        })
        .map((g: any) => g.id);
      if (genIdsToDelete.length > 0) {
        await supabase.from("generations").delete().in("id", genIdsToDelete);
      }
    }

    const { error } = await supabase.from("characters").delete().eq("id", character.id);
    if (error) {
      toast.error("failed to delete character");
      setDeleting(false);
      setShowDelete(false);
      return;
    }
    toast.success("character deleted");
    navigate("/characters", { replace: true });
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-foreground" size={28} />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto w-full max-w-lg md:max-w-3xl px-[14px] md:px-8 pt-10 pb-[280px]">
          <div className="flex items-center gap-3 mb-7">
            <BackButton />
          </div>
          <p className="text-sm font-[900] lowercase text-center mt-16" style={{ color: "rgba(255,255,255,0.4)" }}>
            character not found
          </p>
        </main>
      </div>
    );
  }

  const skinLabel = SKIN_LABELS[(character.country || "").toLowerCase()] || character.country;
  const getHairStyle = (desc: string | null | undefined): string => {
    if (!desc) return "";
    const match = desc.match(/^(.*?)\s*hair\./i);
    return match?.[1]?.trim() || "";
  };
  const hairStyle = getHairStyle(character.description);

  const traits: { label: string; value: string }[] = [];
  if (skinLabel) traits.push({ label: "skin", value: skinLabel });
  if (character.body) traits.push({ label: "body", value: character.body });
  if (hairStyle) traits.push({ label: "hair style", value: hairStyle });
  if (character.hair) traits.push({ label: "hair colour", value: character.hair });
  if (character.eye) traits.push({ label: "eyes", value: character.eye });
  if (character.style) traits.push({ label: "makeup", value: character.style });

  const isValidImg = (url: string | null | undefined) =>
    url && !url.startsWith("data:image/svg") && !url.includes("imgen.x.ai/xai-imgen/xai-tmp-imgen");

  const nameAge = [character.name || "unnamed", character.age].filter(Boolean).join(", ");

  const imgSlot = (
    url: string | null | undefined,
    label: string,
    overlay: "lock" | "regenerate" | null,
    showSpinner = false,
    onRegenClick?: () => void,
  ) => (
    <div className="relative aspect-[3/4] w-full flex items-center justify-center" style={{ borderRadius: 12, backgroundColor: "#000000" }}>
      {showSpinner ? (
        <Loader2 className="animate-spin" size={18} style={{ color: "rgba(255,255,255,0.4)" }} />
      ) : isValidImg(url) ? (
        <img src={url!} alt={label} className="h-full w-full absolute inset-0" style={{ objectFit: "cover", borderRadius: 12 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <span className="text-[9px] font-[900] lowercase" style={{ color: "rgba(255,255,255,0.4)" }}>no photo</span>
      )}
      {overlay === "lock" && (
        <div
          className="absolute flex items-center justify-center"
          style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#facc15", top: -6, right: -6 }}
        >
          <Lock size={14} strokeWidth={3} color="#000" fill="none" />
        </div>
      )}
      {overlay === "regenerate" && (
        <button
          onClick={(e) => { e.stopPropagation(); onRegenClick?.(); }}
          className="absolute flex items-center justify-center transition-transform active:scale-90"
          style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#050a10", border: "2px solid #00e0ff", top: -6, right: -6 }}
        >
          <RefreshCw size={13} strokeWidth={3} color="#fff" />
        </button>
      )}
    </div>
  );

  const contentTop = (isMobile: boolean) => (
    <>
      {/* Box 1: Name + Photos */}
      <div style={{ backgroundColor: "#1e1e1e", borderRadius: 16 }} className={isMobile ? "p-5" : "p-6"}>
        <h1 className={`font-[900] lowercase tracking-tight text-white leading-none ${isMobile ? "text-[30px] mb-5" : "text-[36px] mb-6"}`}>
          {nameAge}
        </h1>
        <div className={`grid grid-cols-3 ${isMobile ? "gap-2" : "gap-3"}`} style={{ overflow: "visible" }}>
          {imgSlot(character.face_image_url, "front", "lock")}
          {imgSlot(character.face_angle_url, "3/4 angle", "regenerate", regeneratingAngle, () => setRegenTarget("angle"))}
          {imgSlot(character.body_anchor_url, "full body", "regenerate", regeneratingBody, () => setRegenTarget("body"))}
        </div>
      </div>

      {/* Details — compact */}
      <div style={{ backgroundColor: "#1e1e1e", borderRadius: 16 }} className={isMobile ? "px-4 py-3" : "p-4"}>
        <div className={`flex flex-wrap ${isMobile ? "gap-1.5" : "gap-2"}`}>
          {traits.map((t) => (
            <div key={t.label} className="rounded-[10px] px-3 py-1.5 text-center" style={{ backgroundColor: "#1e1e1e", border: "2px solid #1e1e1e" }}>
              <span className={`block font-[800] uppercase leading-none mb-0.5 ${isMobile ? "text-[8px]" : "text-[10px]"}`} style={{ color: "rgba(255,255,255,0.4)" }}>{t.label}</span>
              <span className={`block font-[800] lowercase text-white leading-none ${isMobile ? "text-[12px]" : "text-[14px]"}`}>{t.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const contentBottom = (isMobile: boolean) => (
    <>
      {/* Create Photo button */}
      <button
        onClick={() => navigate("/create", { state: { preselectedCharacterId: character.id } })}
        className={`flex items-center justify-center gap-2 w-full font-[900] lowercase transition-all active:scale-[0.98] ${isMobile ? "h-12 text-sm" : "h-14 text-base"}`}
        style={{
          color: "#000",
          borderRadius: 12,
          backgroundColor: "#facc15",
        }}
      >
        create photo
        <Camera size={16} strokeWidth={2.5} />
      </button>

      {/* Delete button */}
      <button
        onClick={() => setShowDelete(true)}
        className={`flex items-center justify-center gap-2 w-full font-[900] lowercase transition-colors active:scale-[0.98] ${isMobile ? "h-10 text-xs" : "h-12 text-sm"}`}
        style={{
          color: "#ff4444",
          borderRadius: 12,
          backgroundColor: "#100505",
          border: "2px solid #ff4444",
        }}
      >
        delete character
        <Trash2 size={14} strokeWidth={2.5} />
      </button>
    </>
  );

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />

      {/* Mobile layout */}
      <main className="relative z-[1] mx-auto w-full max-w-lg px-[14px] pt-1 pb-[132px] md:hidden" style={{ minHeight: "100dvh" }}>
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
        </div>
        <div className="flex flex-col gap-3">
          {contentTop(true)}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-[2] md:hidden">
        <div className="mx-auto w-full max-w-lg bg-gradient-to-t from-background via-background to-transparent px-[14px] pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3">
          <div className="flex flex-col gap-3">
          {contentBottom(true)}
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <main className="hidden md:flex relative z-[1] mx-auto w-full max-w-3xl px-10 pt-1 pb-10 flex-col min-h-screen">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
        </div>
        <div className="flex flex-col gap-4">
          {contentTop(false)}
        </div>
        <div className="flex-1 min-h-[80px]" />
        <div className="flex flex-col gap-4 mb-0">
          {contentBottom(false)}
        </div>
      </main>

      {/* Regenerate confirmation */}
      <RegenerateConfirmDialog
        open={regenTarget !== null}
        onConfirm={handleRegenerate}
        onCancel={() => setRegenTarget(null)}
        message="regenerate this photo?"
        confirmLabel="yes • 1"
        gemCost
      />

      <AnimatePresence>
        {showDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[9998] flex items-center justify-center px-5"
            style={{ backgroundColor: "rgba(0,0,0,0.83)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowDelete(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-sm"
              style={{
                backgroundColor: "#000000",
                borderRadius: 16,
                border: "2px solid #1e1e1e",
                padding: "28px 24px 24px",
              }}
            >
              <button
                onClick={() => setShowDelete(false)}
                className="absolute flex items-center justify-center"
                style={{ top: -10, right: -10, width: 28, height: 28, borderRadius: "50%", backgroundColor: "#1e1e1e" }}
              >
                <X size={14} strokeWidth={3} color="#fff" />
              </button>

              <h2 className="text-lg font-[900] lowercase text-white leading-[1.1] mb-2 text-center">
                delete this character?
              </h2>
              <p className="text-sm font-[900] lowercase mb-6 text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                {character.name || "unnamed"}
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => !deleting && setShowDelete(false)}
                  disabled={deleting}
                  className="flex-1 h-12 text-sm font-[900] lowercase text-white transition-colors active:opacity-70 disabled:opacity-50"
                  style={{ backgroundColor: "#1e1e1e", borderRadius: 12 }}
                >
                  no
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 h-12 text-sm font-[900] lowercase transition-colors disabled:opacity-50 flex items-center justify-center"
                  style={{ backgroundColor: "#1a0505", borderRadius: 12, border: "2px solid #ff4444", color: "#ff4444" }}
                >
                  {deleting ? <Loader2 className="animate-spin mx-auto" size={18} /> : "delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CharacterDetail;
