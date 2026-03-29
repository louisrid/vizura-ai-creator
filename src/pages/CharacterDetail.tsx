import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Sparkles, Camera } from "lucide-react";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
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

const traits = (char: Character) => [
  { label: "style", value: char.style },
  { label: "hair", value: char.hair },
  { label: "eyes", value: char.eye },
  { label: "body", value: char.body },
  { label: "ethnicity", value: char.country },
];

const CharacterDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleCreatePhoto = () => {
    navigate("/create", {
      state: { preselectedCharacterId: character.id },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-lg px-4 pt-14 pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
        </div>

        {/* Name + Age */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold lowercase tracking-tight text-foreground leading-none">
            {character.name || "unnamed"}
          </h1>
          <span className="text-lg font-extrabold lowercase text-foreground/50 mt-1 block">
            age {character.age}
          </span>
        </div>

        {/* Image + Traits row */}
        <div className="flex gap-4 mb-6">
          {/* Image box */}
          <div
            className="shrink-0 flex items-center justify-center rounded-2xl border-[5px] border-border bg-card overflow-hidden"
            style={{ width: "45%", aspectRatio: "1/1" }}
          >
            {character.face_image_url ? (
              <img
                src={character.face_image_url}
                alt={character.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-yellow">
                <Sparkles size={24} strokeWidth={2.5} className="text-black" />
              </div>
            )}
          </div>

          {/* Trait boxes */}
          <div className="flex flex-1 flex-wrap gap-2 content-start">
            {traits(character).map((t) => (
              <div
                key={t.label}
                className="rounded-2xl bg-foreground px-3.5 py-2.5"
              >
                <span className="block text-[9px] font-extrabold lowercase text-background/50 leading-none mb-0.5">
                  {t.label}
                </span>
                <span className="block text-xs font-extrabold lowercase text-background leading-none">
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        {character.description?.trim() && (
          <div className="rounded-2xl border-[5px] border-border bg-card p-4 mb-6">
            <span className="block text-[10px] font-extrabold lowercase text-foreground/40 mb-1.5">
              description
            </span>
            <p className="text-sm font-extrabold lowercase text-foreground leading-relaxed">
              {character.description}
            </p>
          </div>
        )}
      </main>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 bg-background">
        <div className="mx-auto max-w-lg">
          <Button
            className="h-14 w-full text-sm bg-neon-yellow text-neon-yellow-foreground hover:bg-neon-yellow/90"
            onClick={handleCreatePhoto}
          >
            <Camera size={18} strokeWidth={2.5} />
            create photo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CharacterDetail;
