import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Trash2, Camera } from "lucide-react";
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

/** Extract only user-written description, stripping auto-generated trait prefix */
const getUserDescription = (raw: string | null | undefined): string => {
  if (!raw) return "";
  // The description is stored as "{hairStyle} hair. {userDescription}"
  // Strip everything up to and including the first "hair." or "hair. "
  let cleaned = raw.replace(/^.*?\bhair\.\s*/i, "");
  cleaned = cleaned.replace(/\[emoji:.+?\]/g, "").trim();
  return cleaned;
};

const FaceImage = ({ url, label }: { url: string | null | undefined; label: string }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl border-[4px] border-border bg-card flex items-center justify-center">
      {url ? (
        <img src={url} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[9px] font-extrabold lowercase text-foreground/25 text-center px-1">pending</span>
      )}
    </div>
    <span className="text-[9px] font-extrabold lowercase text-foreground/35">{label}</span>
  </div>
);

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
        <main className="mx-auto w-full max-w-lg md:max-w-3xl px-4 md:px-8 pt-6 pb-12">
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

  const hairStyleMatch = character.description?.match(/^(?:.*?chest,\s*)?(.*?)\s*hair\./i);
  const hairStyleVal = hairStyleMatch?.[1] || "";

  const allTraits = [
    { label: "skin", value: character.country },
    { label: "body", value: character.body },
    { label: "hair", value: hairStyleVal },
    { label: "hair colour", value: character.hair },
    { label: "eyes", value: character.eye },
    { label: "makeup", value: character.style },
  ].filter((t) => t.value);

  const userDescription = getUserDescription(character.description);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Mobile layout ── */}
      <main className="mx-auto w-full max-w-lg px-4 pt-6 pb-12 md:hidden">
        <div className="flex items-center gap-3 mb-5">
          <BackButton />
        </div>

        {/* Name + age */}
        <h1 className="text-center text-[2.8rem] font-[900] lowercase tracking-tight text-foreground leading-[1.1] mt-2">
          {character.name || "unnamed"}, {character.age}
        </h1>

        {/* Three face images in a row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <FaceImage url={character.face_side_url} label="side" />
          <FaceImage url={character.face_image_url} label="front" />
          <FaceImage url={character.face_angle_url} label="angle" />
        </div>

        {/* Trait pills — centered, balanced rows */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {allTraits.map((t) => (
            <div key={t.label} className="rounded-xl bg-primary px-4 py-2.5">
              <span className="block text-[8px] font-extrabold lowercase text-primary-foreground/50 leading-none mb-0.5">
                {t.label}
              </span>
              <span className="block text-[13px] font-extrabold lowercase text-primary-foreground leading-none">
                {t.value}
              </span>
            </div>
          ))}
        </div>

        {/* Description — only user-written text */}
        <div className="mt-5 rounded-2xl border-[5px] border-border bg-card p-4">
          <span className="block text-[9px] font-extrabold lowercase text-foreground/40 mb-1">
            description
          </span>
          {userDescription ? (
            <p className="text-sm font-extrabold lowercase text-foreground leading-relaxed">
              {userDescription}
            </p>
          ) : (
            <p className="text-sm font-extrabold lowercase text-foreground/25 leading-relaxed">
              no description added
            </p>
          )}
        </div>
      </main>

      {/* ── Desktop layout ── */}
      <main className="hidden md:block mx-auto w-full max-w-3xl px-8 pt-6 pb-12">
        <div className="flex items-center gap-3 mb-5">
          <BackButton />
        </div>

        <div className="grid grid-cols-5 gap-8">
          {/* Left: three face images stacked or row */}
          <div className="col-span-2 flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <FaceImage url={character.face_side_url} label="side" />
              <FaceImage url={character.face_image_url} label="front" />
              <FaceImage url={character.face_angle_url} label="angle" />
            </div>
          </div>

          {/* Right: details */}
          <div className="col-span-3 flex flex-col">
            <h1 className="text-[2.4rem] font-[900] lowercase tracking-tight text-foreground leading-[1.1] mb-4">
              {character.name || "unnamed"}, {character.age}
            </h1>

            <div className="flex flex-wrap gap-2 mb-4">
              {allTraits.map((t) => (
                <div key={t.label} className="rounded-xl bg-primary px-4 py-2.5">
                  <span className="block text-[8px] font-extrabold lowercase text-primary-foreground/50 leading-none mb-0.5">
                    {t.label}
                  </span>
                  <span className="block text-[13px] font-extrabold lowercase text-primary-foreground leading-none">
                    {t.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border-[5px] border-border bg-card p-4 mb-5">
              <span className="block text-[9px] font-extrabold lowercase text-foreground/40 mb-1">
                description
              </span>
              {userDescription ? (
                <p className="text-sm font-extrabold lowercase text-foreground leading-relaxed">
                  {userDescription}
                </p>
              ) : (
                <p className="text-sm font-extrabold lowercase text-foreground/25 leading-relaxed">
                  no description added
                </p>
              )}
            </div>

            <button
              onClick={() => {
                sessionStorage.setItem("vizura_internal_nav", "1");
                navigate("/create", { state: { preselectedCharacterId: character.id } });
              }}
              className="flex items-center justify-center gap-2 h-14 w-full rounded-2xl bg-neon-yellow text-sm font-extrabold lowercase text-neon-yellow-foreground hover:opacity-90 transition-all"
            >
              <Camera size={16} strokeWidth={2.5} />
              create photo
            </button>

            <button
              onClick={() => setShowDelete(true)}
              className="mt-3 flex items-center justify-center gap-2 h-14 w-full rounded-2xl border-[5px] border-destructive/30 text-sm font-extrabold lowercase text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={14} strokeWidth={2.5} />
              delete character
            </button>
          </div>
        </div>
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