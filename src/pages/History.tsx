import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, X, Calendar, Wand2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface HistoryItem {
  id: string;
  url: string;
  prompt: string;
  characterName: string | null;
  created_at: string;
}

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<HistoryItem | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
  }, [user, authLoading, navigate, location.pathname]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;

      // Fetch generations
      const { data: generations } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch characters for name lookup
      const { data: characters } = await supabase
        .from("characters")
        .select("id, name, hair, eye, age")
        .eq("user_id", user.id);

      const charMap = new Map<string, string>();
      (characters || []).forEach((c: any) => {
        charMap.set(c.id, c.name || `${c.hair} ${c.eye} ${c.age}`);
      });

      const allItems: HistoryItem[] = [];
      (generations || []).forEach((gen: any) => {
        // Try to match character from prompt heuristics
        let charName: string | null = null;
        // Simple matching: check if prompt contains character traits
        for (const [, name] of charMap) {
          if (gen.prompt?.toLowerCase().includes(name.toLowerCase())) {
            charName = name;
            break;
          }
        }

        (gen.image_urls || []).forEach((url: string, i: number) => {
          allItems.push({
            id: `${gen.id}-${i}`,
            url,
            prompt: gen.prompt || "",
            characterName: charName,
            created_at: gen.created_at,
          });
        });
      });

      setItems(allItems);
      setLoading(false);
    };
    if (user) fetchHistory();
  }, [user]);

  if (!authLoading && !user) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toLowerCase();
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <main className="w-full max-w-lg mx-auto rounded-3xl bg-card shadow-[0_4px_32px_rgba(0,0,0,0.08)] p-6 pb-10">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
        </div>
        <PageTitle>history</PageTitle>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-foreground" size={24} />
          </div>
        ) : items.length === 0 ? (
          <div className="border-[5px] border-border rounded-2xl p-8 text-center">
            <Wand2 size={32} className="text-foreground/30 mx-auto mb-4" />
            <p className="text-xs font-extrabold lowercase mb-4 text-foreground">no photos yet</p>
            <Button
              variant="outline"
              className="h-12"
              onClick={() => navigate("/create")}
            >
              create photo
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setExpanded(item)}
                className="w-full text-left rounded-2xl border-[5px] border-border overflow-hidden bg-card transition-all hover:border-foreground/60 active:scale-[0.99]"
              >
                <img src={item.url} alt="" className="w-full aspect-[4/3] object-cover" />
                <div className="p-4 space-y-2">
                  <p className="text-[11px] font-extrabold lowercase text-foreground/60 line-clamp-2 leading-relaxed">
                    {item.prompt || "no prompt"}
                  </p>
                  <div className="flex items-center justify-between">
                    {item.characterName && (
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold lowercase text-neon-yellow">
                        <User size={10} strokeWidth={2.5} />
                        {item.characterName}
                      </div>
                    )}
                    <div className={`flex items-center gap-1 text-[10px] font-extrabold lowercase text-foreground/30 ${!item.characterName ? "ml-auto" : ""}`}>
                      <Calendar size={10} strokeWidth={2.5} />
                      {formatDate(item.created_at)}
                    </div>
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
                <div className="flex items-center gap-3">
                  {expanded.characterName && (
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold lowercase text-neon-yellow">
                      <User size={10} strokeWidth={2.5} />
                      {expanded.characterName}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[9px] font-extrabold lowercase text-foreground/30">
                    <Calendar size={10} strokeWidth={2.5} />
                    {formatDate(expanded.created_at)}
                  </div>
                </div>
                <a href={expanded.url} download={`vizura-${expanded.id}.png`} target="_blank" className="block">
                  <Button variant="outline" className="w-full h-12">
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

export default History;
