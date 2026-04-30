import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Trash2, Wand2, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useAuth } from "@/contexts/AuthContext";
import { useAppData } from "@/contexts/AppDataContext";
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
  const { generations, characters: cachedChars, generationsReady, charactersReady } = useAppData();
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState<StorageImage | null>(null);
  const [newImageIds, setNewImageIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem("facefox_storage_hidden") === "1"; } catch { return false; }
  });
  const toggleHidden = () => {
    setHidden((prev) => {
      const next = !prev;
      try { localStorage.setItem("facefox_storage_hidden", next ? "1" : "0"); } catch {}
      return next;
    });
  };
  const highlightedRef = useRef(false);

  const hasAuthed = useRef(false);
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      hasAuthed.current = true;
      return;
    }
    if (hasAuthed.current) return;
    navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
  }, [user, authLoading, navigate, location.pathname]);

  // Derive images from cached data
  const images = useMemo(() => {
    const charMap = new Map<string, string>();
    cachedChars.forEach((c) => { if (c.name) charMap.set(c.id, c.name); });

    const allImages: StorageImage[] = [];
    generations.forEach((gen) => {
      if (gen.prompt === "character references" || gen.prompt === "face generation") return;
      (gen.image_urls || []).forEach((url: string, i: number) => {
        if (!url || url.trim() === "" || url.startsWith("data:image/svg") || url.includes("imgen.x.ai") || url.includes("xai-tmp-imgen")) return;
        const id = `${gen.id}-${i}`;
        if (deletedIds.has(id)) return;
        allImages.push({
          id,
          genId: gen.id,
          url,
          prompt: gen.prompt || "",
          created_at: gen.created_at,
          characterName: gen.character_id ? charMap.get(gen.character_id) : undefined,
        });
      });
    });

    return allImages;
  }, [generations, cachedChars, deletedIds]);

  // Highlight newest image (once, outside useMemo)
  useEffect(() => {
    if (highlightedRef.current || images.length === 0) return;
    const newest = images[0];
    const createdMs = new Date(newest.created_at).getTime();
    if (Date.now() - createdMs < 30000) {
      highlightedRef.current = true;
      setNewImageIds(new Set([newest.id]));
      setTimeout(() => setNewImageIds(new Set()), 1500);
    }
  }, [images]);

  if (!authLoading && !user) return <div className="min-h-screen bg-background" />;

  const handleDelete = async (img: StorageImage) => {
    setDeletedIds((prev) => new Set([...prev, img.id]));
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

    try { sessionStorage.removeItem("facefox_latest_photos"); } catch {}
    window.dispatchEvent(new CustomEvent("facefox:generations-changed"));
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="relative z-[1] w-full max-w-lg md:max-w-6xl mx-auto px-[14px] md:px-10 pt-7 pb-[280px]">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
          <PageTitle className="mb-0">my storage</PageTitle>
          <button
            type="button"
            onClick={toggleHidden}
            className="ml-auto flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              padding: 8,
              borderRadius: 2,
              backgroundColor: "#000000",
              border: "2px solid hsl(0 0% 15%)",
            }}
            aria-label={hidden ? "show photos" : "hide photos"}
          >
            {hidden ? (
              <Eye size={20} strokeWidth={2.5} color="#ffffff" />
            ) : (
              <EyeOff size={20} strokeWidth={2.5} color="#ffffff" />
            )}
          </button>
        </div>

        {images.length === 0 ? (
          <div className="rounded-[2px] p-8 md:p-12 text-center md:max-w-md md:mx-auto" style={{ backgroundColor: "hsl(var(--card))", border: "2px solid hsl(0 0% 12%)" }}>
            <Wand2 size={32} className="text-white mx-auto mb-4 md:w-10 md:h-10" />
            <p className="text-xs md:text-sm font-extrabold lowercase mb-4 text-foreground">no photos yet</p>
            <button
              onClick={() => navigate("/create")}
              className="h-12 md:h-14 w-full max-w-[12rem] md:max-w-[16rem] mx-auto bg-neon-yellow text-sm md:text-base font-extrabold lowercase text-neon-yellow-foreground hover:opacity-90 transition-all"
              style={{ borderRadius: 2 }}
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
                  onClick={() => { if (!hidden) setExpanded(img); }}
                  className="group relative rounded-t-[10px] border-[2px] border-b-0 border-[hsl(var(--border-mid))] overflow-hidden bg-card text-left"
                >
                  <AspectRatio ratio={3 / 4}>
                    <img
                      src={img.url}
                      alt=""
                      className="h-full w-full object-cover"
                      style={hidden ? { filter: "blur(20px) brightness(0.3)" } : undefined}
                      onError={() => { handleDelete(img); }}
                    />
                  </AspectRatio>
                </button>
                <a
                  href={img.url}
                  download={`facefox-${img.id}.png`}
                  target="_blank"
                  className="flex items-center justify-center gap-1.5 rounded-b-[10px] py-2.5 text-[10px] md:text-[11px] font-[900] lowercase transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "#000000", color: "#ffffff", border: "2px solid hsl(var(--border-mid))", borderTop: "none" }}
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
              <div className="px-3 md:px-4 pt-3 pb-1" style={{ backgroundColor: "hsl(var(--card))" }}>
                <button
                   onClick={(e) => {
                     e.stopPropagation();
                     e.preventDefault();
                      const btn = e.currentTarget;
                       btn.style.backgroundColor = "hsl(var(--card))";
                       setTimeout(() => { btn.style.backgroundColor = "#000000"; }, 150);
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
                         localStorage.setItem("facefox_copied_prompt", text);
                         localStorage.setItem("facefox_copied_prompt_ts", String(Date.now()));
                       } catch {}
                        toast.success("copied");
                      };
                      if (navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(text).then(done).catch(() => {
                          if (copyFallback()) done(); else toast.error("copy error");
                        });
                      } else {
                        if (copyFallback()) done(); else toast.error("copy error");
                     }
                   }}
                   className="h-10 md:h-12 w-full flex items-center gap-2 px-3 border-[2px] border-[hsl(var(--border-mid))] text-xs md:text-sm font-[900] lowercase text-white text-left rounded-[2px] overflow-hidden"
                   style={{ backgroundColor: "#000000" }}
                 >
                   <span className="truncate flex-1 text-left">{expanded!.prompt}</span>
                   <Copy size={13} strokeWidth={2.5} className="shrink-0 opacity-60" />
                </button>
              </div>
            )}
            <div className="p-3 md:p-4 flex gap-2" style={{ backgroundColor: "hsl(var(--card))", borderRadius: "0 0 2px 2px" }}>
              <a href={expanded.url} download={`facefox-${expanded.id}.png`} target="_blank" className="flex-1">
                <Button variant="outline" className="w-full h-10 md:h-12 border-[2px] border-[hsl(var(--border-mid))] text-xs md:text-sm font-[900] lowercase hover:opacity-90" style={{ backgroundColor: "#000000", color: "#ffffff" }}>
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
