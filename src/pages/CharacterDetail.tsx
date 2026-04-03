import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Trash2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import BackButton from "@/components/BackButton";

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

/** Extract hair style from the description prefix (e.g. "bangs hair. ...") */
const getHairStyle = (desc: string | null | undefined): string => {
  if (!desc) return "";
  const match = desc.match(/^(.*?)\s*hair\./i);
  return match?.[1]?.trim() || "";
};

const SKIN_LABELS: Record<string, string> = {
  white: "white",
  pale: "pale",
  tan: "tan",
  asian: "asian",
  black: "black",
  dark: "dark",
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
      navigate(`/account?redirect=${encodeURIComponent(`/characters/${id}`)}`);
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
        <main className="mx-auto w-full max-w-lg md:max-w-3xl px-4 md:px-8 pt-14 pb-12">
          <div className="flex items-center gap-3 mb-8">
            <BackButton />
          </div>
          <p className="text-sm font-extrabold lowercase text-foreground/50 text-center mt-16">
            character not found
          </p>
        </main>
      </div>
    );
  }

  const hairStyle = getHairStyle(character.description);
  const skinLabel = SKIN_LABELS[(character.country || "").toLowerCase()] || character.country;

  // Build trait pills: age first, then all traits
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
      {/* ── Box 1: Name + Photos ── */}
      <div className="rounded-2xl bg-black p-5">
        <h1 className="text-[2rem] font-[900] lowercase tracking-tight text-white leading-none mb-5">
          {character.name || "unnamed"}
        </h1>

        <div className="grid grid-cols-3 gap-3">
          {/* Front face — main selected photo */}
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-card flex items-center justify-center border-[3px] border-white/10">
            {hasFace ? (
              <img
                src={character.face_image_url!}
                alt="front"
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <span className="text-[9px] font-extrabold lowercase text-white/25">no photo</span>
            )}
          </div>

          {/* Left profile — greyed out locked */}
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-white/5 flex flex-col items-center justify-center gap-2 border-[3px] border-white/10">
            <Lock size={18} strokeWidth={2.5} className="text-white/20" />
            <span className="text-[8px] font-extrabold lowercase text-white/20 text-center leading-tight px-1">
              left profile
            </span>
          </div>

          {/* Right profile — greyed out locked */}
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-white/5 flex flex-col items-center justify-center gap-2 border-[3px] border-white/10">
            <Lock size={18} strokeWidth={2.5} className="text-white/20" />
            <span className="text-[8px] font-extrabold lowercase text-white/20 text-center leading-tight px-1">
              right profile
            </span>
          </div>
        </div>
      </div>

      {/* ── Box 2: Details / Trait pills ── */}
      <div className="rounded-2xl bg-black p-5">
        <span className="block text-base font-[900] lowercase text-white mb-4">details:</span>
        <div className="flex flex-wrap gap-2">
          {traits.map((t) => (
            <div
              key={t.label}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-center"
            >
              <span className="block text-[8px] font-extrabold lowercase text-white/40 leading-none mb-1">
                {t.label}
              </span>
              <span className="block text-xs font-[900] lowercase text-white leading-none">
                {t.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Delete button ── */}
      <button
        onClick={() => setShowDelete(true)}
        className="flex items-center justify-center gap-2 h-12 w-full rounded-2xl text-sm font-extrabold lowercase text-destructive/60 hover:text-destructive transition-colors"
      >
        <Trash2 size={13} strokeWidth={2.5} />
        delete character
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ── Mobile layout ── */}
      <main className="mx-auto w-full max-w-lg px-4 pt-14 pb-12 md:hidden">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
        </div>
        <div className="flex flex-col gap-4">
          {content}
        </div>
      </main>

      {/* ── Desktop layout ── */}
      <main className="hidden md:block mx-auto w-full max-w-2xl px-8 pt-14 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
        </div>
        <div className="flex flex-col gap-4">
          {content}
        </div>
      </main>

      {/* ── Delete confirmation overlay ── */}
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
              <h2 className="text-xl font-extrabold lowercase text-white leading-[0.95] mb-2">
                are you sure you want to<br />delete this character?
              </h2>
              <p className="text-base font-extrabold lowercase text-white/50 mb-10">
                {character.name || "unnamed"}
              </p>
              <div className="flex gap-3 w-full max-w-xs">
                <button
                  onClick={() => !deleting && setShowDelete(false)}
                  disabled={deleting}
                  className="flex-1 h-14 rounded-2xl bg-white text-sm font-extrabold lowercase text-black transition-colors active:bg-white/70 disabled:opacity-50"
                >
                  go back
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 h-14 rounded-2xl bg-destructive text-sm font-extrabold lowercase text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
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
