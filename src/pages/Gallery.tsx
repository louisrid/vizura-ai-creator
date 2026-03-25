import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import PageTransition from "@/components/PageTransition";
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
    if (!authLoading && !user) navigate("/auth");
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
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageTransition>
      <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-10">
        <div className="flex items-center gap-3 mb-4">
          <BackButton />
          <p className="text-[10px] font-bold lowercase text-muted-foreground">
            your past generations
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : generations.length === 0 ? (
          <div className="border-2 border-border rounded-xl p-6 text-center">
            <p className="text-xs font-extrabold lowercase mb-3">no generations yet</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              start creating
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {generations.map((gen) => (
              <div key={gen.id} className="border-2 border-border rounded-xl overflow-hidden">
                <div className="px-3 py-2.5 border-b-2 border-border flex items-center justify-between">
                  <p className="font-extrabold lowercase text-[10px] text-foreground truncate max-w-[70%]">
                    "{gen.prompt.length > 60 ? gen.prompt.slice(0, 60) + "…" : gen.prompt}"
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-extrabold">
                    <Calendar size={10} />
                    {formatDate(gen.created_at)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-px bg-border">
                  {gen.image_urls.map((url, i) => (
                    <div key={i} className="relative group bg-background">
                      <img
                        src={url}
                        alt={`${["front", "left", "right"][i]}`}
                        className="w-full aspect-[3/4] object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                        <span className="text-white font-extrabold lowercase text-[10px]">
                          {["front", "left", "right"][i]}
                        </span>
                        <a
                          href={url}
                          download={`vizura-${["front", "left", "right"][i]}.png`}
                          className="w-6 h-6 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/40 transition-colors"
                        >
                          <Download size={10} className="text-white" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      </PageTransition>
    </div>
  );
};

export default Gallery;
