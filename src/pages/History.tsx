import { useState, useMemo } from "react";
import { displayAge } from "@/lib/displayAge";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { Download, Calendar, Wand2, User, Camera, Copy } from "lucide-react";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useAppData } from "@/contexts/AppDataContext";
import DotDecal from "@/components/DotDecal";
import ImageZoomViewer from "@/components/ImageZoomViewer";
import { toast } from "@/components/ui/sonner";

interface HistoryItem {
  id: string;
  url: string;
  prompt: string;
  characterName: string | null;
  created_at: string;
}

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const { generations, characters: cachedChars, generationsReady, charactersReady } = useAppData();
  const navigate = useTransitionNavigate();
  const [expanded, setExpanded] = useState<HistoryItem | null>(null);

  // Derive history items from cached data
  const items = useMemo(() => {
    const charMap = new Map<string, string>();
    cachedChars.forEach((c) => {
      charMap.set(c.id, c.name || `${c.hair} ${c.eye} ${displayAge(c.id, c.age)}`);
    });

    const allItems: HistoryItem[] = [];
    generations.forEach((gen) => {
      let charName: string | null = null;
      for (const [, name] of charMap) {
        if (gen.prompt?.toLowerCase().includes(name.toLowerCase())) {
          charName = name;
          break;
        }
      }

      (gen.image_urls || []).forEach((url: string, i: number) => {
        if (!url || url.trim() === "" || url.startsWith("data:image/svg") || url.includes("imgen.x.ai") || url.includes("xai-tmp-imgen")) return;
        allItems.push({
          id: `${gen.id}-${i}`,
          url,
          prompt: gen.prompt || "",
          characterName: charName,
          created_at: gen.created_at,
        });
      });
    });
    return allItems;
  }, [generations, cachedChars]);

  if (!authLoading && !user) return <div className="min-h-screen bg-background" />;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toLowerCase();
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="relative z-[1] w-full max-w-lg md:max-w-6xl mx-auto px-[32px] md:px-[56px] pt-[44px] pb-[280px]">
        <div className="flex items-center gap-3 mb-11">
          <BackButton />
          <PageTitle className="mb-0">history</PageTitle>
        </div>

        {items.length === 0 ? (
          <div className="rounded-[10px] p-8 md:p-12 text-center md:max-w-md md:mx-auto" style={{ backgroundColor: "hsl(var(--card))", border: "2px solid hsl(var(--border-mid))" }}>
            <Wand2 size={32} className="text-white mx-auto mb-4" />
            <p className="text-xs md:text-sm font-extrabold lowercase mb-4 text-foreground">no photos yet</p>
            <button
              onClick={() => navigate("/create")}
              className="h-12 md:h-14 w-full max-w-[12rem] mx-auto flex items-center justify-center gap-2 bg-neon-yellow text-sm font-extrabold lowercase text-neon-yellow-foreground hover:opacity-90 transition-all"
              style={{ borderRadius: 10 }}
            >
              create photo <Camera size={16} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className="space-y-4 md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-5 md:space-y-0">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setExpanded(item)}
                className="w-full text-left rounded-[10px] overflow-hidden transition-all hover:border-foreground/60 hover-lift"
                style={{ backgroundColor: "hsl(var(--card))", border: "none" }}
              >
                <img src={item.url} alt="" className="w-full aspect-[4/3] object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                <div className="p-4 space-y-2">
                  <p className="text-[11px] md:text-[12px] font-extrabold lowercase text-white line-clamp-2 leading-relaxed">
                    {item.prompt || "no prompt"}
                  </p>
                  <div className="flex items-center justify-between">
                    {item.characterName && (
                      <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-extrabold lowercase text-neon-yellow">
                        <User size={10} strokeWidth={2.5} />
                        {item.characterName}
                      </div>
                    )}
                    <div className={`flex items-center gap-1 text-[10px] font-extrabold lowercase text-white ${!item.characterName ? "ml-auto" : ""}`}>
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

      <ImageZoomViewer
        url={expanded?.url ?? null}
        onClose={() => setExpanded(null)}
        showDownload={false}
        footer={expanded ? (
          <div className="p-3 md:p-4 space-y-2" style={{ backgroundColor: "hsl(var(--card))", borderRadius: "0 0 10px 10px" }}>
            {expanded.prompt && expanded.prompt !== "character references" && expanded.prompt !== "face generation" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const text = expanded.prompt;
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(text).then(() => toast.success("copied")).catch(() => toast.error("copy error"));
                  }
                }}
                className="h-10 md:h-12 w-full flex items-center gap-2 px-3 border-[2px] border-[hsl(var(--border-mid))] text-xs md:text-sm font-[900] lowercase text-white text-left rounded-[10px] overflow-hidden"
                style={{ backgroundColor: "#000000" }}
              >
                <span className="truncate flex-1 text-left">{expanded.prompt}</span>
                <Copy size={12} strokeWidth={2.5} className="shrink-0" />
              </button>
            )}
            <a href={expanded.url} download={`facefox-${expanded.id}.png`} target="_blank" className="block">
              <button
                type="button"
                className="h-10 md:h-12 w-full flex items-center justify-center gap-2 border-[2px] border-[hsl(var(--border-mid))] text-xs md:text-sm font-[900] lowercase text-white rounded-[10px]"
                style={{ backgroundColor: "#000000" }}
              >
                download <Download size={12} strokeWidth={2.5} />
              </button>
            </a>
          </div>
        ) : undefined}
      />
    </div>
  );
};

export default History;
