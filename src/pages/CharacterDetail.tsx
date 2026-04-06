import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Trash2, RefreshCw, Gem } from "lucide-react";
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
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

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
    if (!character || !character.face_image_url || !user) return;
    setShowRegenConfirm(false);
    setRegenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate", {
        body: {
          prompt: character.generation_prompt || character.description || "character",
          generate_angles: true,
          selected_face_url: character.face_image_url,
          body_type: character.body || "regular",
          angle_character_id: character.id,
        },
      });

      if (error) throw error;

      // Refresh character data
      const { data: updated } = await supabase
        .from("characters")
        .select("*")
        .eq("id", character.id)
        .eq("user_id", user.id)
        .single();
      if (updated) setCharacter(updated as unknown as Character);

      await refetchGems();
      toast("1 gem used");
    } catch (err) {
      console.error("Regenerate angle+body error:", err);
      toast.error("regeneration failed, please try again");
    } finally {
      setRegenerating(false);
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
        <main className="mx-auto w-full max-w-lg md:max-w-3xl px-[14px] md:px-8 pt-1 pb-[250px]">
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

  const imgSlot = (url: string | null | undefined, label: string, objectFit: "cover" | "contain" = "cover", showSpinner = false) => (
    <div className="aspect-[3/4] w-full overflow-hidden flex items-center justify-center" style={{ borderRadius: 12, backgroundColor: "#111111" }}>
      {showSpinner ? (
        <Loader2 className="animate-spin" size={18} style={{ color: "rgba(255,255,255,0.4)" }} />
      ) : isValidImg(url) ? (
        <img src={url!} alt={label} className="h-full w-full" style={{ objectFit, borderRadius: 12 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <span className="text-[9px] font-[900] lowercase" style={{ color: "rgba(255,255,255,0.4)" }}>no photo</span>
      )}
    </div>
  );

  const content = (isMobile: boolean) => (
    <>
      {/* Box 1: Name + Photos */}
      <div style={{ backgroundColor: "#111111", borderRadius: 16, border: "2px solid rgba(250,204,21,0.25)" }} className={isMobile ? "p-5" : "p-6"}>
        <h1 className={`font-[900] lowercase tracking-tight text-white leading-none ${isMobile ? "text-[30px] mb-5" : "text-[36px] mb-6"}`}>
          {nameAge}
        </h1>
        <div className={`grid grid-cols-3 ${isMobile ? "gap-2" : "gap-3"}`}>
          {imgSlot(character.face_image_url, "front")}
          {imgSlot(character.face_angle_url, "3/4 angle", "cover", regenerating)}
          {imgSlot(character.body_anchor_url, "full body", "contain", regenerating)}
        </div>
      </div>

      {/* Regenerate photos 2 & 3 button */}
      <button
        onClick={() => setShowRegenConfirm(true)}
        disabled={regenerating || !character.face_image_url}
        className={`flex items-center justify-center gap-2 w-full font-[900] lowercase transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? "h-10 text-xs" : "h-12 text-sm"}`}
        style={{
          borderRadius: 12,
          backgroundColor: "#111111",
          border: "2px solid rgba(0,224,255,0.25)",
          color: "#00e0ff",
        }}
      >
        {regenerating ? (
          <Loader2 className="animate-spin" size={14} />
        ) : (
          <RefreshCw size={14} strokeWidth={2.5} />
        )}
        {regenerating ? "regenerating…" : "regenerate photos 2 & 3"}
        <Gem size={11} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
        <span className="text-[10px]">1</span>
      </button>

      {/* Details — compact */}
      <div style={{ backgroundColor: "#111111", borderRadius: 16, border: "2px solid rgba(250,204,21,0.25)" }} className={isMobile ? "px-4 py-3" : "p-4"}>
        <div className={`flex flex-wrap ${isMobile ? "gap-1.5" : "gap-2"}`}>
          {traits.map((t) => (
            <div key={t.label} className="rounded-[10px] px-3 py-1.5 text-center" style={{ backgroundColor: "#111111", border: "2px solid #222" }}>
              <span className={`block font-[800] uppercase leading-none mb-0.5 ${isMobile ? "text-[8px]" : "text-[10px]"}`} style={{ color: "rgba(255,255,255,0.4)" }}>{t.label}</span>
              <span className={`block font-[800] lowercase text-white leading-none ${isMobile ? "text-[12px]" : "text-[14px]"}`}>{t.value}</span>
            </div>
          ))}
        </div>
      </div>

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
      </button>

      {/* Delete button */}
      <button
        onClick={() => setShowDelete(true)}
        className={`flex items-center justify-center gap-2 w-full font-[900] lowercase transition-colors active:scale-[0.98] ${isMobile ? "h-10 text-xs" : "h-12 text-sm"}`}
        style={{
          color: "#ff4444",
          borderRadius: 12,
          backgroundColor: "#1a0808",
          border: "2px solid rgba(255,68,68,0.25)",
        }}
      >
        <Trash2 size={14} strokeWidth={2.5} />
        delete character
      </button>
    </>
  );

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="relative z-[1] mx-auto w-full max-w-lg px-[14px] pt-1 pb-[250px] md:hidden">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
        </div>
        <div className="flex flex-col gap-3">{content(true)}</div>
      </main>

      <main className="hidden md:block relative z-[1] mx-auto w-full max-w-3xl px-10 pt-1 pb-[250px]">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
        </div>
        <div className="flex flex-col gap-4">{content(false)}</div>
      </main>

      {/* Regenerate confirmation */}
      <RegenerateConfirmDialog
        open={showRegenConfirm}
        onConfirm={handleRegenerate}
        onCancel={() => setShowRegenConfirm(false)}
      />

      <AnimatePresence>
        {showDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-black px-6"
          >
            <motion.div
              className="flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
            >
              <h2 className="text-xl font-[900] lowercase text-white leading-[0.95] mb-2">
                are you sure you want to<br />delete this character?
              </h2>
              <p className="text-base font-[900] lowercase mb-10" style={{ color: "rgba(255,255,255,0.4)" }}>
                {character.name || "unnamed"}
              </p>
              <div className="flex gap-3 w-full max-w-xs">
                <button
                  onClick={() => !deleting && setShowDelete(false)}
                  disabled={deleting}
                  className="flex-1 h-14 text-sm font-[900] lowercase text-black transition-colors active:bg-white/70 disabled:opacity-50"
                  style={{ backgroundColor: "#fff", borderRadius: 12 }}
                >
                  go back
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 h-14 text-sm font-[900] lowercase text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "hsl(var(--destructive))", borderRadius: 12 }}
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
