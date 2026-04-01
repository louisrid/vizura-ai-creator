import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Trash2, Camera, ArrowLeft } from "lucide-react";
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
}

const FACE_EMOJIS = ["😊", "😎", "🥰", "😏", "🤩", "😇", "🥳", "😍", "🤗", "😌", "🧐", "😜", "🤭", "🫣", "💅", "✨", "👸", "🦋", "🌸", "💃"];

const getCharacterEmoji = (char: Character): string => {
  const match = char.description?.match(/\[emoji:(.+?)\]/);
  if (match) return match[1];
  let hash = 0;
  for (let i = 0; i < char.id.length; i++) hash = ((hash << 5) - hash + char.id.charCodeAt(i)) | 0;
  return FACE_EMOJIS[Math.abs(hash) % FACE_EMOJIS.length];
};

/** Extract user-typed description, stripping trait prefix and emoji tag */
const getCleanDescription = (raw: string | null | undefined): string => {
  if (!raw) return "";
  let cleaned = raw.replace(/^[a-z]+ chest,\s*[a-z]+ hair\.\s*/i, "");
  cleaned = cleaned.replace(/\[emoji:.+?\]/g, "").trim();
  return cleaned;
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
      if (data) setCharacter(data as Character);
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
        <main className="mx-auto w-full max-w-lg px-4 pt-14 pb-12">
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

  // Parse description for chest and hair style
  const descParts = character.description?.match(/^(.*?) chest, (.*?) hair\./);
  const chestVal = descParts?.[1] || "";
  const hairStyleVal = descParts?.[2] || "";

  const allTraits = [
    { label: "skin", value: character.country },
    { label: "body type", value: character.body },
    { label: "chest", value: chestVal },
    { label: "hair", value: hairStyleVal },
    { label: "hair colour", value: character.hair },
    { label: "eyes", value: character.eye },
    { label: "makeup", value: character.style },
  ].filter((t) => t.value);

  const cleanDescription = getCleanDescription(character.description);

  return (
    <div className="h-[calc(100dvh-73px)] bg-background overflow-hidden fixed inset-x-0 bottom-0">
      <main className="mx-auto w-full max-w-lg px-4 pt-14 pb-3 flex flex-col h-full overflow-hidden">
        {/* Header — consistent pt-14 with all other pages */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <BackButton />
        </div>

        {/* Name + Age */}
        <div className="mb-3 shrink-0">
          <h1 className="text-xl font-extrabold lowercase tracking-tight text-foreground leading-[0.95]">
            {character.name || "unnamed"}
          </h1>
          <span className="text-sm font-extrabold lowercase text-foreground/50 mt-0.5 block">
            age {character.age}
          </span>
        </div>

        {/* Image + Traits row */}
        <div className="flex gap-3 mb-3 shrink-0">
          {/* Image box */}
          <div
            className="shrink-0 flex items-center justify-center rounded-2xl border-[5px] border-border bg-card overflow-hidden"
            style={{ width: "35%", aspectRatio: "1/1" }}
          >
            {character.face_image_url ? (
              <img
                src={character.face_image_url}
                alt={character.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl">{getCharacterEmoji(character)}</span>
            )}
          </div>

          {/* Trait boxes — yellow fill, black text */}
          <div className="flex flex-1 flex-wrap gap-1.5 content-start">
            {allTraits.map((t) => (
              <div
                key={t.label}
                className="rounded-xl bg-neon-yellow px-2.5 py-1.5"
              >
                <span className="block text-[7px] font-extrabold lowercase text-neon-yellow-foreground/50 leading-none mb-0.5">
                  {t.label}
                </span>
                <span className="block text-[10px] font-extrabold lowercase text-neon-yellow-foreground leading-none">
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Description — only show if user actually typed something */}
        {cleanDescription && (
          <div className="rounded-2xl border-[5px] border-border bg-card p-3 min-h-0 shrink overflow-hidden">
            <span className="block text-[8px] font-extrabold lowercase text-foreground/40 mb-1">
              description
            </span>
            <p className="text-[11px] font-extrabold lowercase text-foreground leading-relaxed overflow-hidden">
              {cleanDescription}
            </p>
          </div>
        )}

        {/* Create photo button */}
        <button
          onClick={() => {
            sessionStorage.setItem("vizura_internal_nav", "1");
            navigate("/create", { state: { preselectedCharacterId: character.id } });
          }}
          className="mt-4 flex items-center justify-center gap-2 h-12 w-full rounded-2xl bg-neon-yellow text-sm font-extrabold lowercase text-neon-yellow-foreground hover:opacity-90 transition-all shrink-0"
        >
          <Camera size={14} strokeWidth={2.5} />
          create photo
        </button>

        {/* Delete button */}
        <button
          onClick={() => setShowDelete(true)}
          className="mt-3 flex items-center justify-center gap-2 h-12 w-full rounded-2xl border-[5px] border-destructive/30 text-sm font-extrabold lowercase text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        >
          <Trash2 size={14} strokeWidth={2.5} />
          delete character
        </button>
      </main>

      {/* Delete confirmation overlay */}
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
