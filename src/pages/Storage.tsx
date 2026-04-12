import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Trash2, Wand2, Copy } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DotDecal from "@/components/DotDecal";
import ImageZoomViewer from "@/components/ImageZoomViewer";

interface StorageImage {
  id: string;
  genId: string;
  url: string;
  prompt: string;
  created_at: string;
  characterName?: string;
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
      const [{ data }, { data: chars }] = await Promise.all([
        supabase
          .from("generations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("characters")
          .select("id, name")
          .eq("user_id", user.id),
      ]);

      const charMap = new Map<string, string>();
      (chars || []).forEach((c: any) => { if (c.name) charMap.set(c.id, c.name); });

      const allImages: StorageImage[] = [];
      (data || []).forEach((gen: any) => {
        (gen.image_urls || []).forEach((url: string, i: number) => {
          if (!url || url.trim() === "" || url.startsWith("data:image/svg") || url.includes("imgen.x.ai") || url.includes("xai-tmp-imgen")) return;
          allImages.push({
            id: `${gen.id}-${i}`,
            genId: gen.id,
            url,
            prompt: gen.prompt || "",
            created_at: gen.created_at,
            characterName: gen.character_id ? charMap.get(gen.character_id) : undefined,
          });
        });
      });
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

    try {
      const url = new URL(img.url);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/images\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from("images").remove([decodeURIComponent(pathMatch[1])]);
      }
    } catch (e) {
      console.error("Failed to delete from storage:", e);
    }

    try { sessionStorage.removeItem("vizura_latest_photos"); } catch {}
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="relative z-[1] w-full max-w-lg md:max-w-6xl mx-auto px-4 md:px-10 pt-10 pb-[280px]">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
          <PageTitle className="mb-0">storage</PageTitle>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={`skel-${i}`} style={{ borderRadius: 10, overflow: "hidden", backgroundColor: "#1a1a1a" }}>
                <AspectRatio ratio={3 / 4}>
                  <div className="h-full w-full" style={{ backgroundColor: "#1a1a1a" }} />
                </AspectRatio>
              </div>
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="border-2 border-[rgba(255,255,255,0.15)] rounded-[10px] p-8 md:p-12 text-center md:max-w-md md:mx-auto" style={{ backgroundColor: "#1a1a1a" }}>
            <Wand2 size={32} className="text-foreground/30 mx-auto mb-4 md:w-10 md:h-10" />
            <p className="text-xs md:text-sm font-extrabold lowercase mb-4 text-foreground">no photos yet</p>
            <button
              onClick={() => navigate("/create")}
              className="h-12 md:h-14 w-full max-w-[12rem] md:max-w-[16rem] mx-auto bg-neon-yellow text-sm md:text-base font-extrabold lowercase text-neon-yellow-foreground hover:opacity-90 transition-all"
              style={{ borderRadius: 10 }}
            >
              create a photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-4">
            <AnimatePresence>
            {images.map((img) => {
              const isNew = newImageIds.has(img.id);
              return (
              <motion.div
                key={img.id}
                layout
                initial={isNew ? { opacity: 0, scale: 0.7 } : { opacity: 1, scale: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={isNew ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0.3 }}
                className="flex flex-col hover-lift"
              >
                <button
                  onClick={() => setExpanded(img)}
                  className="group relative rounded-t-[10px] border-[2px] border-b-0 border-[rgba(255,255,255,0.15)] overflow-hidden bg-card text-left"
                >
                  <AspectRatio ratio={3 / 4}>
                    <img src={img.url} alt="" className="h-full w-full object-cover" onError={() => { handleDelete(img); }} />
                  </AspectRatio>
                </button>
                <a
                  href={img.url}
                  download={`facefox-${img.id}.png`}
                  target="_blank"
                  className="flex items-center justify-center gap-1.5 rounded-b-[10px] py-2.5 text-[10px] md:text-[11px] font-[900] lowercase transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "#000", color: "#ffffff", border: "2px solid rgba(255,255,255,0.15)", borderTop: "none" }}
                >
                   download
                   <Download size={12} strokeWidth={2.5} />
                </a>
              </motion.div>
              );
            })}
            </AnimatePresence>
          </div>
        )}
      </main>

      <ImageZoomViewer
        url={expanded?.url ?? null}
        onClose={() => setExpanded(null)}
        showDownload={false}
        footer={expanded ? (
          <>
            {expanded.prompt && expanded.prompt !== "character references" && expanded.prompt !== "face generation" && (
              <div className="px-3 md:px-4 pt-3 pb-1" style={{ backgroundColor: "#1a1a1a" }}>
                <button
                   onClick={(e) => {
                     e.stopPropagation();
                     e.preventDefault();
                      const btn = e.currentTarget;
                       btn.style.backgroundColor = "#222";
                       setTimeout(() => { btn.style.backgroundColor = "#000"; }, 150);
                     const text = expanded!.prompt;
                     const copyFallback = () => {
                       try {
                         const ta = document.createElement("textarea");
                         ta.value = text;
                         ta.style.position = "fixed";
                         ta.style.left = "-9999px";
                         document.body.appendChild(ta);
                         ta.select();
                         document.execCommand("copy");
                         document.body.removeChild(ta);
                         return true;
                       } catch { return false; }
                     };
                     const done = () => {
                       try {
                         localStorage.setItem("vizura_copied_prompt", text);
                         localStorage.setItem("vizura_copied_prompt_ts", String(Date.now()));
                       } catch {}
                       toast.success("copied!");
                     };
                     if (navigator.clipboard?.writeText) {
                       navigator.clipboard.writeText(text).then(done).catch(() => {
                         if (copyFallback()) done(); else toast.error("failed to copy");
                       });
                     } else {
                       if (copyFallback()) done(); else toast.error("failed to copy");
                     }
                   }}
                   className="h-10 md:h-12 w-full flex items-center justify-center gap-2 border-[2px] border-[rgba(255,255,255,0.15)] text-xs md:text-sm font-[900] lowercase text-white text-center rounded-[10px]"
                  style={{ backgroundColor: "#000" }}
                >
                  <span className="truncate">{expanded!.prompt}</span>
                  <Copy size={13} strokeWidth={2.5} className="shrink-0 opacity-60" />
                </button>
              </div>
            )}
            <div className="p-3 md:p-4 flex gap-2" style={{ backgroundColor: "#1a1a1a", borderRadius: "0 0 10px 10px" }}>
              <a href={expanded.url} download={`vizura-${expanded.id}.png`} target="_blank" className="flex-1">
                <Button variant="outline" className="w-full h-10 md:h-12 border-[2px] border-[rgba(255,255,255,0.15)] text-xs md:text-sm font-[900] lowercase hover:opacity-90" style={{ backgroundColor: "#000", color: "#ffffff" }}>
                  download <Download size={12} strokeWidth={2.5} />
                </Button>
              </a>
              <Button
                variant="outline"
                className="h-10 md:h-12 px-3 md:px-4 border-[2px] border-destructive/30 bg-[#1a0808] text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleDelete(expanded)}
              >
                <Trash2 size={12} strokeWidth={2.5} />
              </Button>
            </div>
          </>
        ) : undefined}
      />
    </div>
  );
};

export default Storage;
