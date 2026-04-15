import { useEffect, useLayoutEffect, useState } from "react";
import { registerBlockingLoader } from "@/lib/startupSplash";

const SilentLoader = () => {
  useLayoutEffect(() => {
    const unregister = registerBlockingLoader();
    return unregister;
  }, []);
  return <div className="min-h-screen bg-background" />;
};
import { displayAge } from "@/lib/displayAge";
import { useLocation } from "react-router-dom";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { Plus, Loader2 } from "lucide-react";
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
  const navigate = useTransitionNavigate();
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
        .limit(50);
      if (data) {
        const allChars = data as (Character & { face_angle_url?: string | null; body_anchor_url?: string | null })[];
        // Delete incomplete characters (missing any of the 3 reference photos)
        const incomplete = allChars.filter(
          (c) => !c.face_image_url || !c.face_angle_url || !c.body_anchor_url
        );
        if (incomplete.length > 0) {
          const ids = incomplete.map((c) => c.id);
          supabase.from("characters").delete().in("id", ids).then(() => {});
        }
        const complete = allChars.filter(
          (c) => c.face_image_url && c.face_angle_url && c.body_anchor_url
        );
        setCharacters(complete.slice(0, 12) as Character[]);
        const pendingNew = sessionStorage.getItem("facefox_new_char_highlight");
        if (pendingNew) {
          sessionStorage.removeItem("facefox_new_char_highlight");
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
  if (loading) return <SilentLoader />;

  const handleCreateCharacter = () => {
    sessionStorage.removeItem("facefox_creator_dismissed");
    sessionStorage.setItem("facefox_internal_nav", "1");
    navigate("/", { state: { openCreator: true } });
  };

  const handleBottomButton = () => {
    if (characters.length === 0) {
      handleCreateCharacter();
      return;
    }
    if (characters.length === 1) {
      navigate("/create", { state: { preselectedCharacterId: characters[0].id } });
      return;
    }
    navigate("/create");
  };

  

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />

        <main className="relative z-[1] w-full max-w-lg md:max-w-6xl mx-auto px-4 md:px-10 pt-10 pb-[280px]">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
          <PageTitle className="mb-0">my characters</PageTitle>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} style={{ borderRadius: 10, overflow: "hidden", backgroundColor: "hsl(var(--card))" }}>
                <AspectRatio ratio={3 / 4}>
                  <div className="h-full w-full" style={{ backgroundColor: "hsl(var(--card))" }} />
                </AspectRatio>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-4">
            <button
              onClick={handleCreateCharacter}
              className="overflow-hidden active:scale-[0.97] transition-transform hover-lift"
              style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))", border: "2px solid hsl(var(--border-mid))" }}
            >
              <AspectRatio ratio={3 / 4}>
                <div className="flex h-full w-full items-center justify-center">
                  <Plus size={28} strokeWidth={2.5} className="text-white md:w-8 md:h-8" />
                </div>
              </AspectRatio>
            </button>

              {characters.map((char) => {
                const isNew = newCharId === char.id;
                const hasFace = char.face_image_url && char.face_image_url.startsWith("http") && !char.face_image_url.startsWith("data:image/svg");
                return (
                  <button
                    key={char.id}
                    onClick={() => navigate(`/characters/${char.id}`)}
                    className="relative overflow-hidden active:scale-[0.97] transition-all duration-200 hover-lift"
                    style={{
                      borderRadius: 10,
                      border: isNew ? "3px solid #ffe603" : "2px solid hsl(var(--border-mid))",
                      backgroundColor: "hsl(var(--card))",
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
                        <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: "hsl(var(--card))" }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="hsl(var(--border-mid))">
                            <circle cx="12" cy="8" r="5" />
                            <path d="M3.5 21.5a8.5 8.5 0 0 1 17 0c0 1.1-.9 2-2 2h-13a2 2 0 0 1-2-2Z" />
                          </svg>
                        </div>
                      )}
                    </AspectRatio>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-5">
                      <span className="block text-[11px] md:text-[13px] font-[900] lowercase text-white leading-tight truncate">
                        {char.name || "unnamed"}
                      </span>
                      <span className="block text-[9px] md:text-[11px] font-[800] lowercase text-white">
                        age {displayAge(char.id, char.age)}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </main>

    </div>
  );
};

export default MyCharacters;
