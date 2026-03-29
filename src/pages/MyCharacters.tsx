import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Loader2, X, Trash2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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
}

const MyCharacters = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      if (data) setCharacters(data as Character[]);
      setLoading(false);
    };
    if (user) fetchCharacters();
  }, [user]);

  if (!authLoading && !user) return null;

  const handleEdit = (char: Character) => {
    const params = new URLSearchParams({
      editId: char.id,
      name: char.name,
      country: char.country,
      age: char.age,
      hair: char.hair,
      eye: char.eye,
      body: char.body,
      style: char.style,
      description: char.description,
    });
    navigate(`/?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("characters")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast.error("failed to delete character");
    } else {
      setCharacters((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success("character deleted");
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-14 pb-12">
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
            {/* Always-visible + button */}
            <button
              onClick={() => navigate("/")}
              className="aspect-[3/4] rounded-2xl bg-card border-[5px] border-border flex items-center justify-center hover:border-foreground/40 transition-colors active:scale-[0.97]"
            >
              <Plus size={36} strokeWidth={3} className="text-foreground" />
            </button>

            {/* Character cards */}
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => navigate(`/characters/${char.id}`)}
                className="group relative aspect-[3/4] rounded-2xl bg-card border-[5px] border-border flex flex-col items-center justify-center overflow-hidden text-left transition-colors hover:border-foreground/40 active:scale-[0.97]"
              >
                <span className="text-sm font-extrabold lowercase text-foreground leading-tight text-center px-2 truncate w-full">
                  {char.name || "unnamed"}
                </span>
                <span className="text-[10px] font-extrabold lowercase text-foreground/50 mt-0.5">
                  age {char.age}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm px-4"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-card border-[5px] border-border rounded-2xl shadow-medium w-full max-w-xs overflow-hidden p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold lowercase text-foreground">delete character</h2>
                <button
                  onClick={() => !deleting && setDeleteTarget(null)}
                  className="w-8 h-8 rounded-2xl bg-foreground/10 flex items-center justify-center hover:bg-foreground/20 transition-colors"
                >
                  <X size={14} strokeWidth={2.5} className="text-foreground" />
                </button>
              </div>
              <p className="text-xs font-extrabold lowercase text-foreground/60 mb-6">
                delete "{deleteTarget.name || "unnamed"}" permanently?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-sm"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  cancel
                </Button>
                <Button
                  className="flex-1 h-12 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="animate-spin" size={16} /> : "delete"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyCharacters;
