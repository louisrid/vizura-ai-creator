import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import BackButton from "@/components/BackButton";
import DotDecal from "@/components/DotDecal";

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
}

const SKIN_LABELS: Record<string, string> = {
  white: "white", pale: "pale", tan: "tan", asian: "asian", black: "black", dark: "dark",
};

const CharacterDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Poll for angle/body images if they're missing (background generation)
  useEffect(() => {
    if (!character || !user || !id) return;
    const needsAngle = !character.face_angle_url;
    const needsBody = !character.body_anchor_url;
    if (!needsAngle && !needsBody) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("characters")
        .select("face_angle_url, body_anchor_url")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (!data) return;
      let changed = false;
      if (data.face_angle_url && !character.face_angle_url) changed = true;
      if (data.body_anchor_url && !character.body_anchor_url) changed = true;
      if (changed) {
        setCharacter((prev) => prev ? { ...prev, ...data } : prev);
      }
      if (data.face_angle_url && data.body_anchor_url) clearInterval(interval);
    }, 5000);

    return () => clearInterval(interval);
  }, [character, user, id]);

  const handleDelete = async () => {
    if (!character) return;
    setDeleting(true);

    // Delete ALL generations linked to this character:
    // 1. Any generation whose image_urls overlap with character reference URLs
    // 2. Any generation created with this character's prompt
    const charUrls = [character.face_image_url, character.face_angle_url, character.body_anchor_url].filter(Boolean) as string[];
    const { data: allGens } = await supabase
      .from("generations")
      .select("id, image_urls, prompt")
      .eq("user_id", user!.id);
    if (allGens) {
      const genIdsToDelete = allGens
        .filter((g: any) => {
          // Match by overlapping URLs
          if (charUrls.length > 0 && (g.image_urls || []).some((u: string) => charUrls.includes(u))) return true;
          // Match by character reference prompt
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
        <main className="mx-auto w-full max-w-lg md:max-w-3xl px-[14px] md:px-8 pt-4 pb-[400px]">
          <div className="flex items-center gap-3 mb-5">
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

  // Build traits — exclude age (shown in header now)
  const traits: { label: string; value: string }[] = [];
  if (skinLabel) traits.push({ label: "skin", value: skinLabel });
  if (character.body) traits.push({ label: "body", value: character.body });
  if (hairStyle) traits.push({ label: "hair style", value: hairStyle });
  if (character.hair) traits.push({ label: "hair colour", value: character.hair });
  if (character.eye) traits.push({ label: "eyes", value: character.eye });
  if (character.style) traits.push({ label: "makeup", value: character.style });

  const isValidImg = (url: string | null | undefined) =>
    url && !url.startsWith("data:image/svg") && !url.includes("imgen.x.ai/xai-imgen/xai-tmp-imgen");

  const hasFace = isValidImg(character.face_image_url);
  const hasAngle = isValidImg(character.face_angle_url);
  const hasBody = isValidImg(character.body_anchor_url);

  const nameAge = [character.name || "unnamed", character.age].filter(Boolean).join(", ");

  const imgSlot = (url: string | null | undefined, label: string, caption: string, objectFit: "cover" | "contain" = "cover") => (
    <div className="flex flex-col items-center gap-1.5">
    <div className="aspect-[3/4] w-full overflow-hidden flex items-center justify-center p-2" style={{ borderRadius: 12, border: "2px solid #222", backgroundColor: "#111111" }}>
      {isValidImg(url) ? (
        <img src={url!} alt={label} className="h-full w-full" style={{ objectFit, borderRadius: 8 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <span className="text-[9px] font-[900] lowercase" style={{ color: "rgba(255,255,255,0.4)" }}>no photo</span>
      )}
    </div>
    <span className="text-[9px] font-[800] lowercase text-center" style={{ color: "rgba(255,255,255,0.45)" }}>{caption}</span>
    </div>
  );

  const content = (
    <>
      {/* Box 1: Name + Photos */}
      <div style={{ backgroundColor: "#111111", borderRadius: 16, border: "2px solid rgba(0,224,255,0.25)" }} className="p-5">
        <h1 className="text-[30px] font-[900] lowercase tracking-tight text-white leading-none mb-5">
          {nameAge}
        </h1>
        <div className="grid grid-cols-3 gap-2.5">
          {imgSlot(character.face_image_url, "front", "front")}
          {imgSlot(character.face_angle_url, "3/4 angle", "3/4 angle")}
          {imgSlot(character.body_anchor_url, "full body", "full body", "contain")}
        </div>
      </div>

      {/* Box 2: Details */}
      <div style={{ backgroundColor: "#111111", borderRadius: 16, border: "2px solid rgba(0,224,255,0.25)" }} className="p-4">
        <span className="block text-sm font-[900] lowercase text-white mb-3">details:</span>
        <div className="flex flex-wrap gap-2">
          {traits.map((t) => (
            <div key={t.label} className="rounded-[10px] px-3.5 py-2 text-center" style={{ backgroundColor: "#111111", border: "2px solid #222" }}>
              <span className="block text-[9px] font-[800] uppercase leading-none mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{t.label}</span>
              <span className="block text-[13px] font-[800] lowercase text-white leading-none">{t.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Delete button — pill style with red border */}
      <div className="pt-2">
        <button
          onClick={() => setShowDelete(true)}
          className="flex items-center justify-center gap-2 h-12 w-full text-sm font-[900] lowercase transition-colors active:scale-[0.98]"
          style={{
            color: "#ff4444",
            borderRadius: 14,
            backgroundColor: "rgba(255,68,68,0.06)",
            border: "2px solid rgba(255,68,68,0.25)",
          }}
        >
          <Trash2 size={14} strokeWidth={2.5} />
          delete character
        </button>
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      {/* Extra top padding under back arrow */}
      <main className="relative z-[1] mx-auto w-full max-w-lg px-[14px] pt-4 pb-[400px] md:hidden">
        <div className="flex items-center gap-3 mb-4">
          <BackButton />
        </div>
        <div className="flex flex-col gap-3">{content}</div>
      </main>

      <main className="hidden md:block relative z-[1] mx-auto w-full max-w-2xl px-8 pt-4 pb-[400px]">
        <div className="flex items-center gap-3 mb-4">
          <BackButton />
        </div>
        <div className="flex flex-col gap-3">{content}</div>
      </main>

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
