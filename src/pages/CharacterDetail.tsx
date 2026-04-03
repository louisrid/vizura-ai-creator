import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Trash2, Lock } from "lucide-react";
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
  face_side_url?: string | null;
  face_angle_url?: string | null;
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

  const handleDelete = async () => {
    if (!character) return;
    setDeleting(true);
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
        <main className="mx-auto w-full max-w-lg md:max-w-3xl px-[14px] md:px-8 pt-14 pb-8">
          <div className="flex items-center gap-3 mb-5">
            <BackButton />
          </div>
          <p className="text-sm font-[900] lowercase text-center mt-16" style={{ color: "rgba(255,255,255,0.35)" }}>
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
  if (character.age) traits.push({ label: "age", value: character.age });
  if (skinLabel) traits.push({ label: "skin", value: skinLabel });
  if (character.body) traits.push({ label: "body", value: character.body });
  if (hairStyle) traits.push({ label: "hair style", value: hairStyle });
  if (character.hair) traits.push({ label: "hair colour", value: character.hair });
  if (character.eye) traits.push({ label: "eyes", value: character.eye });
  if (character.style) traits.push({ label: "makeup", value: character.style });

  const hasFace = character.face_image_url &&
    !character.face_image_url.startsWith("data:image/svg") &&
    !character.face_image_url.includes("imgen.x.ai/xai-imgen/xai-tmp-imgen");

  const content = (
    <>
      {/* Box 1: Name + Photos */}
      <div style={{ backgroundColor: "#000", borderRadius: 16, border: "2px solid #222" }} className="p-4">
        <h1 className="text-[24px] font-[900] lowercase tracking-tight text-white leading-none mb-4">
          {character.name || "unnamed"}
        </h1>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="aspect-[3/4] overflow-hidden flex items-center justify-center" style={{ borderRadius: 12, border: "2px solid #222", backgroundColor: "#111111" }}>
            {hasFace ? (
              <img src={character.face_image_url!} alt="front" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <span className="text-[9px] font-[900] lowercase" style={{ color: "rgba(255,255,255,0.25)" }}>no photo</span>
            )}
          </div>
          <div className="aspect-[3/4] overflow-hidden flex flex-col items-center justify-center gap-1.5" style={{ borderRadius: 12, border: "2px solid #222", backgroundColor: "rgba(255,255,255,0.03)" }}>
            <Lock size={16} strokeWidth={2.5} style={{ color: "rgba(255,255,255,0.2)" }} />
            <span className="text-[8px] font-[900] lowercase text-center leading-tight px-1" style={{ color: "rgba(255,255,255,0.2)" }}>left profile</span>
          </div>
          <div className="aspect-[3/4] overflow-hidden flex flex-col items-center justify-center gap-1.5" style={{ borderRadius: 12, border: "2px solid #222", backgroundColor: "rgba(255,255,255,0.03)" }}>
            <Lock size={16} strokeWidth={2.5} style={{ color: "rgba(255,255,255,0.2)" }} />
            <span className="text-[8px] font-[900] lowercase text-center leading-tight px-1" style={{ color: "rgba(255,255,255,0.2)" }}>right profile</span>
          </div>
        </div>
      </div>

      {/* Box 2: Details */}
      <div style={{ backgroundColor: "#000", borderRadius: 16, border: "2px solid #222" }} className="p-4">
        <span className="block text-sm font-[900] lowercase text-white mb-3">details:</span>
        <div className="flex flex-wrap gap-2">
          {traits.map((t) => (
            <div key={t.label} className="rounded-[10px] px-3.5 py-2 text-center" style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "2px solid #222" }}>
              <span className="block text-[9px] font-[800] uppercase leading-none mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{t.label}</span>
              <span className="block text-[13px] font-[800] lowercase text-white leading-none">{t.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => setShowDelete(true)}
        className="flex items-center justify-center gap-2 h-10 w-full text-sm font-[900] lowercase transition-colors"
        style={{ color: "#ff4444", borderRadius: 12 }}
      >
        <Trash2 size={13} strokeWidth={2.5} />
        delete character
      </button>
    </>
  );

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="relative z-[1] mx-auto w-full max-w-lg px-[14px] pt-14 pb-8 md:hidden">
        <div className="flex items-center gap-3 mb-5">
          <BackButton />
        </div>
        <div className="flex flex-col gap-3">{content}</div>
      </main>

      <main className="hidden md:block relative z-[1] mx-auto w-full max-w-2xl px-8 pt-14 pb-8">
        <div className="flex items-center gap-3 mb-5">
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
              <p className="text-base font-[900] lowercase mb-10" style={{ color: "rgba(255,255,255,0.35)" }}>
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
