import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Loader2, Camera, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

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

const MyCharacters = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
        // Check if there's a newly added character (from session storage)
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

  const handleCardClick = (char: Character) => {
    if (isBuilding(char)) return;
    setSelectedId((prev) => (prev === char.id ? null : char.id));
  };

  const handleCreatePhoto = () => {
    if (!selectedId) return;
    navigate("/create", { state: { characterId: selectedId } });
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
                const isSelected = selectedId === char.id;
                const isNew = newCharId === char.id;
                return (
                  <motion.div
                    key={char.id}
                    layout
                    initial={isNew ? { opacity: 0, scale: 0.7 } : { opacity: 1, scale: 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={isNew ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0.3, ease: "easeOut" }}
                    className="flex flex-col gap-1.5"
                  >
                    <button
                      onClick={() => handleCardClick(char)}
                      className={`relative aspect-[3/4] rounded-2xl bg-card flex flex-col items-center justify-center overflow-hidden text-left transition-all active:scale-[0.97] ${
                        building
                          ? "border-[5px] border-neon-yellow/60 animate-pulse cursor-default"
                          : isSelected
                            ? "border-[5px] border-neon-yellow"
                            : "border-[5px] border-border hover:border-foreground/40"
                      }`}
                    >
                      {building ? (
                        <span className="text-xs font-extrabold lowercase text-neon-yellow">building…</span>
                      ) : (
                        <>
                          <span className="text-sm font-extrabold lowercase text-foreground leading-tight text-center px-2 truncate w-full">
                            {char.name || "unnamed"}
                          </span>
                          <span className="text-[10px] font-extrabold lowercase text-foreground/50 mt-0.5">
                            age {char.age}
                          </span>
                          {isSelected && (
                            <motion.div
                              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-neon-yellow"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
                            >
                              <Zap size={12} strokeWidth={3} className="text-neon-yellow-foreground" />
                            </motion.div>
                          )}
                        </>
                      )}
                    </button>

                    {!building && (
                      <button
                        onClick={() => navigate(`/characters/${char.id}`)}
                        className="h-8 w-full rounded-xl bg-[hsl(210_80%_55%)] text-[10px] font-[900] lowercase text-white flex items-center justify-center gap-1 transition-colors hover:bg-[hsl(210_80%_48%)] active:bg-[hsl(210_80%_42%)]"
                      >
                        details
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Fixed bottom Create Photo button */}
      <div className="fixed bottom-0 left-0 right-0 z-10 px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="mx-auto max-w-lg">
          <button
            onClick={handleCreatePhoto}
            disabled={!selectedId}
            className={`flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-base font-[900] lowercase tracking-tight transition-all active:scale-[0.97] ${
              selectedId
                ? "bg-neon-yellow text-neon-yellow-foreground"
                : "bg-neon-yellow/30 text-neon-yellow-foreground/40 cursor-not-allowed"
            }`}
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
