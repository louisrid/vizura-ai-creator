import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface StorageImage {
  id: string;
  url: string;
  prompt: string;
  source: "character" | "photo";
  created_at: string;
}

const filters = ["all", "characters", "photos"] as const;
type Filter = (typeof filters)[number];

const Storage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState<StorageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<StorageImage | null>(null);
  const isSelecting = selected.size > 0;

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

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
        const isCharacter = gen.prompt?.includes("build,") && gen.prompt?.includes("skin,");
        (gen.image_urls || []).forEach((url: string, i: number) => {
          allImages.push({
            id: `${gen.id}-${i}`,
            url,
            prompt: gen.prompt,
            source: isCharacter ? "character" : "photo",
            created_at: gen.created_at,
          });
        });
      });
      setImages(allImages);
      setLoading(false);
    };
    if (user) fetchAll();
  }, [user]);

  const filtered = images.filter((img) => {
    if (filter === "characters") return img.source === "character";
    if (filter === "photos") return img.source === "photo";
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownload = async () => {
    const toDownload = filtered.filter((img) => selected.has(img.id));
    for (const img of toDownload) {
      const a = document.createElement("a");
      a.href = img.url;
      a.download = `vizura-${img.id}.png`;
      a.target = "_blank";
      a.click();
    }
    setSelected(new Set());
  };

  const handleDelete = () => {
    setImages((prev) => prev.filter((img) => !selected.has(img.id)));
    setSelected(new Set());
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <PageTransition>
        <main className="w-full max-w-lg mx-auto px-4 pt-10 pb-10">
          <div className="flex items-center gap-3 mb-8">
            <BackButton />
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 mb-6">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-3.5 rounded-xl font-extrabold lowercase text-xs border-2 transition-all ${
                  filter === f
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground hover:border-foreground/30"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Selection action bar */}
          <AnimatePresence>
            {isSelecting && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden mb-6"
              >
                <div className="flex items-center gap-2 border-2 border-border rounded-xl p-3">
                  <span className="text-[10px] font-extrabold lowercase text-muted-foreground flex-1">
                    {selected.size} selected
                  </span>
                  <Button variant="outline" size="sm" className="h-10 px-4" onClick={handleDownload}>
                    <Download size={14} strokeWidth={2.5} /> download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={handleDelete}
                  >
                    <Trash2 size={14} strokeWidth={2.5} /> delete
                  </Button>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="border-2 border-border rounded-xl p-6 text-center">
              <p className="text-xs font-extrabold lowercase mb-3">nothing here yet</p>
              <Button variant="outline" className="h-10" onClick={() => navigate("/")}>
                start creating
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((img) => (
                <button
                  key={img.id}
                  onClick={() => {
                    if (isSelecting) toggleSelect(img.id);
                    else setExpanded(img);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleSelect(img.id);
                  }}
                  className={`relative rounded-xl border-2 overflow-hidden bg-background transition-all active:scale-[0.98] ${
                    selected.has(img.id) ? "border-foreground" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <img src={img.url} alt="" className="w-full aspect-[3/4] object-cover" />
                  {isSelecting && (
                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selected.has(img.id)
                        ? "bg-foreground border-foreground"
                        : "bg-black/20 backdrop-blur border-white/50"
                    }`}>
                      {selected.has(img.id) && <Check size={12} strokeWidth={3} className="text-background" />}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </main>
      </PageTransition>

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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-card border-2 border-border rounded-xl shadow-medium w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <img src={expanded.url} alt="" className="w-full aspect-[3/4] object-cover" />
                <button
                  onClick={() => setExpanded(null)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
              <div className="p-4">
                <a href={expanded.url} download={`vizura-${expanded.id}.png`} target="_blank" className="block">
                  <Button variant="outline" className="w-full h-10">
                    <Download size={14} strokeWidth={2.5} /> download
                  </Button>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Storage;
