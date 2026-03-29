import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, Trash2, X, Calendar, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface StorageImage {
  id: string;
  genId: string;
  url: string;
  prompt: string;
  created_at: string;
}

const Storage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [images, setImages] = useState<StorageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<StorageImage | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate(`/account?redirect=${encodeURIComponent(location.pathname)}`);
  }, [user, authLoading, navigate, location.pathname]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const allImages: StorageImage[] = [];
      (data || []).forEach((gen: any) => {
        (gen.image_urls || []).forEach((url: string, i: number) => {
          allImages.push({
            id: `${gen.id}-${i}`,
            genId: gen.id,
            url,
            prompt: gen.prompt || "",
            created_at: gen.created_at,
          });
        });
      });
      setImages(allImages);
      setLoading(false);
    };
    if (user) fetchAll();
  }, [user]);

  if (!authLoading && !user) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toLowerCase();
  };

  const handleDelete = (img: StorageImage) => {
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    if (expanded?.id === img.id) setExpanded(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-14 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <PageTitle className="mb-0">storage</PageTitle>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-foreground" size={24} />
          </div>
        ) : images.length === 0 ? (
          <div className="border-[5px] border-border rounded-2xl p-8 text-center">
            <Wand2 size={28} className="text-foreground/30 mx-auto mb-3" />
            <p className="text-xs font-extrabold lowercase mb-4 text-foreground">no photos yet</p>
            <Button
              variant="outline"
              className="h-14"
              onClick={() => navigate("/create")}
            >
              create a photo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => setExpanded(img)}
                className="group relative rounded-2xl border-[5px] border-border overflow-hidden bg-card transition-all hover:border-foreground/60 active:scale-[0.98] text-left"
              >
                <img src={img.url} alt="" className="w-full aspect-[3/4] object-cover" />
                <div className="p-3">
                  <p className="text-[10px] font-extrabold lowercase text-foreground/60 line-clamp-2 leading-relaxed mb-2">
                    {img.prompt || "no prompt"}
                  </p>
                  <div className="flex items-center gap-1 text-[9px] font-extrabold lowercase text-foreground/30">
                    <Calendar size={10} strokeWidth={2.5} />
                    {formatDate(img.created_at)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Expanded view */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm px-4"
            onClick={() => setExpanded(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-card border-[5px] border-border rounded-2xl shadow-medium w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <img src={expanded.url} alt="" className="w-full aspect-[3/4] object-cover" />
                <button
                  onClick={() => setExpanded(null)}
                  className="absolute top-3 right-3 w-9 h-9 rounded-2xl bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-[10px] font-extrabold lowercase text-foreground/60 leading-relaxed">
                  {expanded.prompt || "no prompt"}
                </p>
                <div className="flex items-center gap-1 text-[9px] font-extrabold lowercase text-foreground/30">
                  <Calendar size={10} strokeWidth={2.5} />
                  {formatDate(expanded.created_at)}
                </div>
                <div className="flex gap-2">
                  <a href={expanded.url} download={`vizura-${expanded.id}.png`} target="_blank" className="flex-1">
                    <Button variant="outline" className="w-full h-12">
                      <Download size={14} strokeWidth={2.5} /> download
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    className="h-12 px-4 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleDelete(expanded)}
                  >
                    <Trash2 size={14} strokeWidth={2.5} />
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Storage;
