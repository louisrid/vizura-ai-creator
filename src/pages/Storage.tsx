import { useState, useEffect, useRef } from "react";
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
  const [newImageIds, setNewImageIds] = useState<Set<string>>(new Set());

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
      // Mark the newest image as "new" for animate-in if arriving from photo creation
      if (allImages.length > 0) {
        const newest = allImages[0];
        const createdMs = new Date(newest.created_at).getTime();
        if (Date.now() - createdMs < 30000) {
          setNewImageIds(new Set([newest.id]));
          setTimeout(() => setNewImageIds(new Set()), 1500);
        }
      }
      setImages(allImages);
      setLoading(false);
    };
    if (user) fetchAll();
  }, [user]);

  if (!authLoading && !user) return null;

  const handleDelete = async (img: StorageImage) => {
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    if (expanded?.id === img.id) setExpanded(null);

    if (!user) return;

    // Remove image URL from the generation record in DB
    try {
      const { data: gen } = await supabase
        .from("generations")
        .select("id, image_urls")
        .eq("id", img.genId)
        .eq("user_id", user.id)
        .single();

      if (gen) {
        const updatedUrls = (gen.image_urls || []).filter((u: string) => u !== img.url);
        if (updatedUrls.length === 0) {
          await supabase.from("generations").delete().eq("id", gen.id).eq("user_id", user.id);
        } else {
          await supabase.from("generations").update({ image_urls: updatedUrls }).eq("id", gen.id).eq("user_id", user.id);
        }
      }
    } catch (e) {
      console.error("Failed to delete from DB:", e);
    }

    // Delete from storage bucket
    try {
      const url = new URL(img.url);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/images\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from("images").remove([decodeURIComponent(pathMatch[1])]);
      }
    } catch (e) {
      console.error("Failed to delete from storage:", e);
    }

    // Clear homepage cache so deleted images don't reappear
    try { sessionStorage.removeItem("vizura_latest_photos"); } catch {}
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="w-full max-w-lg md:max-w-5xl mx-auto px-4 md:px-10 pt-1 pb-[400px]">
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            <AnimatePresence>
            {images.map((img, idx) => {
              const isNew = newImageIds.has(img.id);
              return (
              <motion.div
                key={img.id}
                layout
                initial={isNew ? { opacity: 0, scale: 0.7 } : { opacity: 1, scale: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={isNew ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0.3 }}
                className="flex flex-col"
              >
                <button
                  onClick={() => setExpanded(img)}
                  className="group relative rounded-t-2xl border-[2px] border-b-0 border-border overflow-hidden bg-card transition-all hover:border-foreground/60 active:scale-[0.98] text-left"
                >
                  <AspectRatio ratio={3 / 4}>
                    <img src={img.url} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </AspectRatio>
                </button>
                <a
                  href={img.url}
                  download={`vizura-${img.id}.png`}
                  target="_blank"
                  className="flex items-center justify-center gap-1.5 rounded-b-2xl py-2.5 text-[10px] font-extrabold lowercase text-white hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: "#222" }}
                >
                  <Download size={12} strokeWidth={2.5} />
                  download
                </a>
              </motion.div>
              );
            })}
            </AnimatePresence>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-6 pt-20 pb-8"
            onClick={() => setExpanded(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-[280px] md:max-w-[400px] overflow-hidden"
              style={{ backgroundColor: "#111111", borderRadius: 16, border: "2px solid #1a1a1a" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setExpanded(null)}
                className="absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center text-white bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
                style={{ borderRadius: 10 }}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
              <img src={expanded.url} alt="" className="w-full object-contain max-h-[50vh]" />
              <div className="p-3 flex gap-2">
                <a href={expanded.url} download={`vizura-${expanded.id}.png`} target="_blank" className="flex-1">
                  <Button variant="outline" className="w-full h-10 text-xs rounded-xl">
                    <Download size={12} strokeWidth={2.5} /> download
                  </Button>
                </a>
                <Button
                  variant="outline"
                  className="h-10 px-3 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground rounded-xl"
                  onClick={() => handleDelete(expanded)}
                >
                  <Trash2 size={12} strokeWidth={2.5} />
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
