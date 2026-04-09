import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Loader2, Camera, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { supabase } from "@/integrations/supabase/client";
import DotDecal from "@/components/DotDecal";
import { AspectRatio } from "@/components/ui/aspect-ratio";

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
  const [newCharId, setNewCharId] = useState<string | null>(null);
  const [isFirstCharacter, setIsFirstCharacter] = useState(false);
  const [bounceActive, setBounceActive] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
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
          if (data.length === 1) {
            setIsFirstCharacter(true);
            setBounceActive(true);
            setTimeout(() => setBounceActive(false), 3500);
          }
          setTimeout(() => setNewCharId(null), 1500);
        }
      }
      setLoading(false);
    };
    if (user) fetchCharacters();
  }, [user]);

  if (!authLoading && !user) return null;

  const handleBottomButton = () => {
    if (characters.length === 0) {
      sessionStorage.setItem("vizura_internal_nav", "1");
      navigate("/");
      return;
    }
    if (characters.length === 1) {
      navigate("/create", { state: { preselectedCharacterId: characters[0].id } });
      return;
    }
    navigate("/create");
  };

  const hasCharacters = characters.length > 0;

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />

        <main className="relative z-[1] w-full max-w-lg md:max-w-5xl mx-auto px-[14px] md:px-10 pt-10 pb-[280px]">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
          <PageTitle className="mb-0">my characters</PageTitle>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-foreground" size={24} />
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-4">
            <button
              onClick={() => { sessionStorage.setItem("vizura_internal_nav", "1"); navigate("/"); }}
              className="overflow-hidden active:scale-[0.97] transition-transform"
              style={{ borderRadius: 16, backgroundColor: "#2a2a2a" }}
            >
              <AspectRatio ratio={3 / 4}>
                <div className="flex h-full w-full items-center justify-center">
                  <Plus size={28} strokeWidth={2.5} className="text-white" />
                </div>
              </AspectRatio>
            </button>

            <AnimatePresence>
              {characters.map((char) => {
                const isNew = newCharId === char.id;
                const hasFace = char.face_image_url && char.face_image_url.startsWith("http") && !char.face_image_url.startsWith("data:image/svg");
                return (
                  <motion.button
                    key={char.id}
                    layout
                    initial={isNew ? { opacity: 0, scale: 0.7 } : { opacity: 1, scale: 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={isNew ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0.3, ease: "easeOut" }}
                    onClick={() => navigate(`/characters/${char.id}`)}
                    className="relative overflow-hidden active:scale-[0.97] transition-all duration-200"
                    style={{
                      borderRadius: 16,
                      border: isNew ? "3px solid #facc15" : "2px solid #2a2a2a",
                      backgroundColor: "#2a2a2a",
                    }}
                  >
                    <AspectRatio ratio={3 / 4}>
                      {hasFace ? (
                        <img
                          src={char.face_image_url!}
                          alt={char.name}
                          className="h-full w-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: "#2a2a2a" }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)">
                            <circle cx="12" cy="8" r="5" />
                            <path d="M3.5 21.5a8.5 8.5 0 0 1 17 0c0 1.1-.9 2-2 2h-13a2 2 0 0 1-2-2Z" />
                          </svg>
                        </div>
                      )}
                    </AspectRatio>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-5">
                      <span className="block text-[11px] font-[900] lowercase text-white leading-tight truncate">
                        {char.name || "unnamed"}
                      </span>
                      <span className="block text-[9px] font-[800] lowercase" style={{ color: "rgba(255,255,255,0.35)" }}>
                        age {char.age}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {!loading && (
        <div className="fixed bottom-0 left-0 right-0 z-10 px-6 pb-[max(env(safe-area-inset-bottom),1rem)] pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="mx-auto max-w-lg md:max-w-5xl">
            <motion.button
              onClick={handleBottomButton}
              animate={bounceActive ? { y: [0, -6, 0] } : {}}
              transition={bounceActive ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
              className="flex h-14 md:h-16 w-full items-center justify-center gap-2 text-base md:text-lg font-[900] lowercase tracking-tight transition-all duration-200 active:scale-[0.97]"
              style={{ backgroundColor: "#facc15", color: "#000", borderRadius: 12 }}
            >
              {hasCharacters ? (
                <>create photo<Camera size={20} strokeWidth={2.5} /></>
              ) : (
                <>create character<Sparkles size={20} strokeWidth={2.5} /></>
              )}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCharacters;
