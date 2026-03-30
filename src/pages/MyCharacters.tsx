import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Loader2, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { supabase } from "@/integrations/supabase/client";

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

const getStableEmoji = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return FACE_EMOJIS[Math.abs(hash) % FACE_EMOJIS.length];
};

const MyCharacters = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCharId, setNewCharId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate(`/account?redirect=${encodeURIComponent(location.pathname)}`);
  }, [user, authLoading, navigate, location.pathname]);

  useEffect(() => {
    const fetchCharacters = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);
      if (data) {
        setCharacters(data as Character[]);
        const pendingNew = sessionStorage.getItem("vizura_new_char_highlight");
        if (pendingNew) {
          sessionStorage.removeItem("vizura_new_char_highlight");
          setNewCharId(pendingNew);
          setTimeout(() => setNewCharId(null), 1500);
        }
      }
      setLoading(false);
    };
    if (user) fetchCharacters();
  }, [user]);

  if (!authLoading && !user) return null;

  const isBuilding = (char: Character) => !char.face_image_url;

  const handleCreatePhoto = () => {
    // If only one character, auto-select and go directly
    if (characters.length === 1) {
      navigate("/create", { state: { characterId: characters[0].id } });
      return;
    }
    // Otherwise go to create page to choose
    navigate("/create");
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-14 pb-32">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <PageTitle className="mb-0">my characters</PageTitle>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-foreground" size={24} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => navigate("/")}
              className="aspect-[3/4] rounded-2xl bg-card border-[5px] border-border flex items-center justify-center hover:border-foreground/40 transition-colors active:scale-[0.97]"
            >
              <Plus size={36} strokeWidth={3} className="text-foreground" />
            </button>

            <AnimatePresence>
              {characters.map((char) => {
                const building = isBuilding(char);
                const isNew = newCharId === char.id;
                return (
                  <motion.button
                    key={char.id}
                    layout
                    initial={isNew ? { opacity: 0, scale: 0.7 } : { opacity: 1, scale: 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={isNew ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0.3, ease: "easeOut" }}
                    onClick={() => !building && navigate(`/characters/${char.id}`)}
                    className={`relative aspect-[3/4] rounded-2xl bg-card flex flex-col items-center justify-center overflow-hidden text-left transition-all active:scale-[0.97] ${
                      building
                        ? "border-[5px] border-neon-yellow/60 animate-pulse cursor-default"
                        : isNew
                          ? "border-[5px] border-neon-yellow"
                          : "border-[5px] border-border hover:border-foreground/40"
                    }`}
                  >
                    {building ? (
                      <span className="text-xs font-extrabold lowercase text-neon-yellow">building…</span>
                    ) : (
                      <>
                        {char.face_image_url ? (
                          <img
                            src={char.face_image_url}
                            alt={char.name}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl mb-1">{getStableEmoji(char.id)}</span>
                        )}
                        {/* Name/age overlay at bottom */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6">
                          <span className="block text-[11px] font-extrabold lowercase text-white leading-tight truncate">
                            {char.name || "unnamed"}
                          </span>
                          <span className="block text-[9px] font-extrabold lowercase text-white/60">
                            age {char.age}
                          </span>
                        </div>
                      </>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Fixed bottom Create Photo button — always active */}
      <div className="fixed bottom-0 left-0 right-0 z-10 px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="mx-auto max-w-lg">
          <button
            onClick={handleCreatePhoto}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-base font-[900] lowercase tracking-tight transition-all active:scale-[0.97] bg-neon-yellow text-neon-yellow-foreground"
          >
            <Camera size={20} strokeWidth={2.5} />
            create photo
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyCharacters;
