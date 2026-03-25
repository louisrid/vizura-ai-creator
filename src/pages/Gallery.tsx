import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Image, Calendar, Download, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Generation {
  id: string;
  prompt: string;
  image_urls: string[];
  created_at: string;
}

const Gallery = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchGenerations = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setGenerations((data as Generation[]) || []);
      setLoading(false);
    };
    if (user) fetchGenerations();
  }, [user]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="min-h-screen gradient-subtle">
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-5xl mx-auto pt-10 md:pt-16 pb-12 px-4 sm:px-6"
      >
        <div className="text-center mb-8">
          <h1 className="text-[clamp(2rem,7vw,3rem)] font-extrabold lowercase tracking-tight leading-none mb-3">
            your gallery
          </h1>
          <p className="text-muted-foreground text-sm font-semibold lowercase">
            all your past generations in one place
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={28} />
          </div>
        ) : generations.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border shadow-soft p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
              <Image size={28} className="text-muted-foreground" />
            </div>
            <h2 className="text-lg font-extrabold lowercase mb-2">no generations yet</h2>
            <p className="text-muted-foreground text-sm font-semibold lowercase mb-4">
              create your first photo to see it here
            </p>
            <button
              onClick={() => navigate("/")}
              className="font-extrabold lowercase text-sm text-accent-purple hover:underline"
            >
              start creating →
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {generations.map((gen) => (
              <motion.div
                key={gen.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <p className="font-bold lowercase text-sm text-foreground truncate max-w-[70%]">
                    "{gen.prompt.length > 80 ? gen.prompt.slice(0, 80) + "…" : gen.prompt}"
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                    <Calendar size={12} />
                    {formatDate(gen.created_at)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-px bg-border">
                  {gen.image_urls.map((url, i) => (
                    <div key={i} className="relative group bg-card">
                      <img
                        src={url}
                        alt={`${gen.prompt} - ${["front", "left", "right"][i]}`}
                        className="w-full aspect-[2/3] object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                        <span className="text-white font-extrabold lowercase text-xs">
                          {["front", "left", "right"][i]}
                        </span>
                        <a
                          href={url}
                          download={`vizura-${["front", "left", "right"][i]}.png`}
                          className="w-7 h-7 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/40 transition-colors"
                        >
                          <Download size={12} className="text-white" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.main>
    </div>
  );
};

export default Gallery;
