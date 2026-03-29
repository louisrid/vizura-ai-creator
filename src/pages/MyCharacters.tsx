import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Loader2, X } from "lucide-react";
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
}

const MyCharacters = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletedId, setDeletedId] = useState<string | null>(null);

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

  // Lock scroll when overlay is open
  useEffect(() => {
    if (!deleteTarget) return;
    const root = document.getElementById("root");
    const prev = {
      body: document.body.style.overflow,
      html: document.documentElement.style.overflow,
      root: root?.style.overflow ?? "",
    };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (root) root.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev.body;
      document.documentElement.style.overflow = prev.html;
      if (root) root.style.overflow = prev.root;
    };
  }, [deleteTarget]);

  if (!authLoading && !user) return null;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("characters")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast.error("failed to delete character");
      setDeleting(false);
      setDeleteTarget(null);
      return;
    }
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setDeleting(false);
    setDeletedId(id);
    toast.success("character deleted");
    // Remove from list after fade-out animation
    setTimeout(() => {
      setCharacters((prev) => prev.filter((c) => c.id !== id));
      setDeletedId(null);
    }, 350);
  };

  const openDelete = (e: React.MouseEvent, char: Character) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteTarget(char);
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
            <AnimatePresence>
              {characters.map((char) => (
                <motion.button
                  key={char.id}
                  layout
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{
                    opacity: deletedId === char.id ? 0 : 1,
                    scale: deletedId === char.id ? 0.9 : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onClick={() => navigate(`/characters/${char.id}`)}
                  className="relative aspect-[3/4] rounded-2xl bg-card border-[5px] border-border flex flex-col items-center justify-center overflow-hidden text-left transition-colors hover:border-foreground/40 active:scale-[0.97]"
                >
                  <span className="text-sm font-extrabold lowercase text-foreground leading-tight text-center px-2 truncate w-full">
                    {char.name || "unnamed"}
                  </span>
                  <span className="text-[10px] font-extrabold lowercase text-foreground/50 mt-0.5">
                    age {char.age}
                  </span>

                  {/* Delete X button */}
                  <div
                    onClick={(e) => openDelete(e, char)}
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/60 text-background transition-colors hover:bg-foreground/80"
                    role="button"
                    aria-label={`delete ${char.name || "character"}`}
                  >
                    <X size={12} strokeWidth={3} />
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Fullscreen delete confirmation overlay */}
      <AnimatePresence>
        {deleteTarget && (
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
              <h2 className="text-xl font-extrabold lowercase text-white leading-snug mb-2">
                are you sure you want to<br />delete this character?
              </h2>
              <p className="text-base font-extrabold lowercase text-white/50 mb-10">
                {deleteTarget.name || "unnamed"}
              </p>

              <div className="flex gap-3 w-full max-w-xs">
                <button
                  onClick={() => !deleting && setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 h-14 rounded-2xl bg-foreground/20 text-sm font-extrabold lowercase text-white transition-colors hover:bg-foreground/30 disabled:opacity-50"
                >
                  go back
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 h-14 rounded-2xl bg-destructive text-sm font-extrabold lowercase text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="animate-spin mx-auto" size={18} />
                  ) : (
                    "delete"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyCharacters;
