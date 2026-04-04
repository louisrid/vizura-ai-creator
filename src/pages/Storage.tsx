import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, Trash2, X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DotDecal from "@/components/DotDecal";

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
    if (!authLoading && !user) navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
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
          if (!url || url.startsWith("data:image/svg") || url.includes("imgen.x.ai/xai-imgen/xai-tmp-imgen")) return;
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

  const handleDelete = (img: StorageImage) => {
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    if (expanded?.id === img.id) setExpanded(null);
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="w-full max-w-lg md:max-w-6xl mx-auto px-4 md:px-8 pt-4 pb-[200px]">
        <div className="flex items-center gap-3 mb-4">
          <BackButton />
          <PageTitle className="mb-0">storage</PageTitle>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-foreground" size={24} />
          </div>
        ) : images.length === 0 ? (
          <div className="border-2 border-[#1a1a1a] rounded-2xl p-8 text-center" style={{ backgroundColor: "#111111" }}>
            <Wand2 size={32} className="text-foreground/30 mx-auto mb-4" />
            <p className="text-xs font-extrabold lowercase mb-4 text-foreground">no photos yet</p>
            <button
              onClick={() => navigate("/create")}
              className="h-12 w-full max-w-[12rem] mx-auto rounded-2xl bg-neon-yellow text-sm font-extrabold lowercase text-neon-yellow-foreground hover:opacity-90 transition-all"
            >
              create a photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((img) => (
              <div key={img.id} className="flex flex-col">
                <button
                  onClick={() => setExpanded(img)}
                  className="group relative rounded-t-2xl border-[5px] border-b-0 border-border overflow-hidden bg-card transition-all hover:border-foreground/60 active:scale-[0.98] text-left"
                >
                  <AspectRatio ratio={3 / 4}>
                    <img src={img.url} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </AspectRatio>
                </button>
                <a
                  href={img.url}
                  download={`vizura-${img.id}.png`}
                  target="_blank"
                  className="flex items-center justify-center gap-1.5 rounded-b-2xl border-2 border-t border-[#1a1a1a] py-2 text-[10px] font-extrabold lowercase text-foreground/60 hover:text-foreground transition-colors"
                  style={{ backgroundColor: "#111111" }}
                >
                  <Download size={12} strokeWidth={2.5} />
                  download
                </a>
              </div>
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
              className="border-2 border-[#1a1a1a] rounded-2xl shadow-medium w-full max-w-sm overflow-hidden"
              style={{ backgroundColor: "#111111" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <img src={expanded.url} alt="" className="w-full object-contain max-h-[60vh]" />
                <button
                  onClick={() => setExpanded(null)}
                  className="absolute top-3 right-3 w-9 h-9 rounded-2xl bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
              <div className="p-4 flex gap-2">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Storage;
