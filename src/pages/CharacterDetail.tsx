import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import BackButton from "@/components/BackButton";
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

  return (
    <div className="h-[calc(100dvh-73px)] bg-background overflow-hidden fixed inset-x-0 bottom-0">
      <main className="mx-auto w-full max-w-lg px-4 pt-6 pb-3 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <BackButton />
        </div>

        {/* Name + Age */}
        <div className="mb-3 shrink-0">
          <h1 className="text-xl font-extrabold lowercase tracking-tight text-foreground leading-none">
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-yellow">
                <Sparkles size={16} strokeWidth={2.5} className="text-black" />
              </div>
            )}
          </div>

          {/* Trait boxes */}
          <div className="flex flex-1 flex-wrap gap-1.5 content-start">
            {traits(character).map((t) => (
              <div
                key={t.label}
                className="rounded-xl bg-foreground px-2.5 py-1.5"
              >
                <span className="block text-[7px] font-extrabold lowercase text-background/50 leading-none mb-0.5">
                  {t.label}
                </span>
                <span className="block text-[10px] font-extrabold lowercase text-background leading-none">
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Description — takes remaining space, clipped if too long */}
        {character.description?.trim() && (
          <div className="rounded-2xl border-[5px] border-border bg-card p-3 min-h-0 shrink overflow-hidden">
            <span className="block text-[8px] font-extrabold lowercase text-foreground/40 mb-1">
              description
            </span>
            <p className="text-[11px] font-extrabold lowercase text-foreground leading-relaxed overflow-hidden">
              {character.description}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CharacterDetail;
