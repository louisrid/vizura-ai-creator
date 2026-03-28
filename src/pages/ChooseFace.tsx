import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SubscribeOverlay from "@/components/SubscribeOverlay";

const ChooseFace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { prompt, characterId } = (location.state as {
    prompt?: string;
    characterId?: string;
  }) || {};

  const [faces, setFaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSubscribe, setShowSubscribe] = useState(false);

  useEffect(() => {
    if (!prompt || !user) {
      navigate("/");
      return;
    }
    generateFaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateFaces = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "generate",
        { body: { prompt, free_gen: true } }
      );

      if (fnError) throw fnError;

      if (data?.error) {
        if (
          data.code === "FREE_GEN_USED" ||
          data.code === "IP_USED"
        ) {
          setShowSubscribe(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error);
      }

      setFaces(data.images || []);
    } catch (err: any) {
      const msg = err?.message || "generation failed";
      if (msg.includes("Free generation already used") || msg.includes("IP_USED") || msg.includes("FREE_GEN_USED")) {
        setShowSubscribe(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async () => {
    if (selectedIndex === null || !characterId || !user) return;
    setSaving(true);
    try {
      const selectedUrl = faces[selectedIndex];
      const { error: updateError } = await supabase
        .from("characters")
        .update({
          face_image_url: selectedUrl,
          generation_prompt: prompt,
        } as any)
        .eq("id", characterId);

      if (updateError) throw updateError;

      toast({
        title: "face selected",
        description: "your character's face has been saved",
      });
      navigate("/characters");
    } catch (err: any) {
      toast({
        title: "error",
        description: err.message || "failed to save face",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribe = async () => {
    navigate("/account/membership");
  };

  if (showSubscribe) {
    return (
      <div className="relative min-h-screen bg-background">
        <SubscribeOverlay
          open={true}
          onDismiss={() => navigate("/")}
          onSubscribe={handleSubscribe}
          buying={false}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-lg flex-col px-4 pt-32 pb-12">
        <h1 className="text-heading font-extrabold lowercase text-foreground text-center">
          choose your face
        </h1>
        <p className="mt-2 text-center text-sm font-extrabold lowercase text-muted-foreground">
          tap one to select it as your character's face
        </p>

        {loading && (
          <div className="mt-16 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-foreground" size={40} />
            <p className="text-sm font-extrabold lowercase text-muted-foreground">
              generating faces...
            </p>
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-2xl border-[5px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive text-center">
            {error}
          </div>
        )}

        {!loading && faces.length > 0 && (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {faces.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={`relative aspect-[3/4] overflow-hidden rounded-2xl border-[5px] transition-all ${
                    selectedIndex === i
                      ? "border-neon-yellow ring-2 ring-neon-yellow/40 scale-[1.02]"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  <img
                    src={url}
                    alt={`face option ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {selectedIndex === i && (
                    <div className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-neon-yellow">
                      <Check size={18} strokeWidth={3} className="text-neon-yellow-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-surface-dark/20 pointer-events-none" />
                </button>
              ))}
            </div>

            <Button
              className="mt-8 h-14 w-full text-sm"
              onClick={handleSelect}
              disabled={selectedIndex === null || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  saving...
                </>
              ) : (
                "select this face"
              )}
            </Button>
          </>
        )}
      </main>
    </div>
  );
};

export default ChooseFace;
