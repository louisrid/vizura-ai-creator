import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Users, ImageIcon, Sparkles, ArrowLeft, Download, Lock, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";
import ModalCloseButton from "@/components/ModalCloseButton";
import PageTitle from "@/components/PageTitle";
import DotDecal from "@/components/DotDecal";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { supabase } from "@/integrations/supabase/client";
import { displayAge } from "@/lib/displayAge";

const ADMIN_EMAIL = "louisjridland@gmail.com";

const fetchSection = async (section: string, extra?: Record<string, string>) => {
  const params = new URLSearchParams({ section, ...extra });
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data?${params}`,
    { headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" } }
  );
  if (!res.ok) throw new Error("failed");
  return res.json();
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

/* ── Standardised admin loading spinner ── */
const AdminLoader = () => (
  <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 220px)" }}>
    <Loader2 className="animate-spin" size={24} style={{ color: "#ffffff" }} strokeWidth={3} />
  </div>
);

const PhotoModal = ({ photo, onClose }: { photo: any; onClose: () => void }) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 px-4 pt-24 pb-6">
    <div className="relative w-full max-w-md md:max-w-lg">
      <ModalCloseButton onClick={onClose} />
      <div>
        <img src={photo.image_url} alt="" className="w-full rounded-[10px] object-contain max-h-[60vh]" />
        <div className="mt-4 space-y-1.5">
          <p className="text-[12px] md:text-[14px] font-extrabold lowercase text-white leading-snug">{photo.prompt || "no prompt"}</p>
          <p className="text-[10px] md:text-[12px] font-extrabold lowercase" style={{ color: "rgba(255,255,255,0.4)" }}>
            {photo.user_email}
            {photo.character_name && ` · ${photo.character_name}`}
            {` · ${fmtDate(photo.created_at)}`}
          </p>
        </div>
      </div>
    </div>
  </div>
);

/* ── Skin label helper ── */
const SKIN_LABELS: Record<string, string> = {
  white: "white", pale: "pale", tan: "tan", asian: "asian", black: "black", dark: "dark",
};

/* ── Read-only Character Detail (admin) ── */
const AdminCharacterDetail = ({ character, onBack }: { character: any; onBack: () => void }) => {
  const skinLabel = SKIN_LABELS[(character.country || "").toLowerCase()] || character.country;
  const getHairStyle = (desc: string | null | undefined): string => {
    if (!desc) return "";
    const match = desc.match(/^(.*?)\s*hair\./i);
    return match?.[1]?.trim() || "";
  };
  const hairStyle = getHairStyle(character.description);

  const traits: { label: string; value: string }[] = [
    { label: "skin", value: skinLabel || "—" },
    { label: "body", value: character.body || "—" },
    { label: "bust", value: character.bust_size || "regular" },
    { label: "age", value: displayAge(character.id, character.age) },
    { label: "hair colour", value: character.hair || "—" },
    { label: "hair style", value: hairStyle || "—" },
    { label: "eyes", value: character.eye || "—" },
  ];

  const isValidImg = (url: string | null | undefined) =>
    url && !url.startsWith("data:image/svg") && !url.includes("imgen.x.ai");

  const displayName = character.name || "unnamed";
  const ageDisplay = displayAge(character.id, character.age);

  const imgSlot = (url: string | null | undefined, label: string) => (
    <div className="relative aspect-[3/4] w-full flex items-center justify-center" style={{ borderRadius: 10, backgroundColor: "#000000" }}>
      {isValidImg(url) ? (
        <img src={url!} alt={label} className="h-full w-full absolute inset-0" style={{ objectFit: "cover", borderRadius: 10 }} />
      ) : (
        <span className="text-[9px] md:text-[11px] font-[900] lowercase" style={{ color: "rgba(255,255,255,0.4)" }}>no photo</span>
      )}
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="flex items-center justify-center shrink-0"
          style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#ffe603" }}
        >
          <ArrowLeft size={14} strokeWidth={2.5} color="#000" />
        </button>
        <PageTitle className="mb-0">character</PageTitle>
      </div>

      <div className="flex flex-col gap-3 max-w-lg">
        <div style={{ backgroundColor: "#1a1a1a", borderRadius: 10 }} className="p-5">
          <h1 className="font-[900] lowercase tracking-tight text-white leading-none text-[30px] mb-5">
            {displayName}, {ageDisplay}
          </h1>
          <div className="grid grid-cols-3 gap-2" style={{ overflow: "visible" }}>
            {imgSlot(character.face_image_url, "front")}
            {imgSlot(character.face_angle_url, "3/4 angle")}
            {imgSlot(character.body_anchor_url, "full body")}
          </div>
        </div>
        <div style={{ backgroundColor: "#1a1a1a", borderRadius: 10 }} className="px-4 py-3">
          <div className="grid grid-cols-4 gap-1.5">
            {traits.map((t) => (
              <div key={t.label} className="rounded-[10px] py-2 text-center" style={{ backgroundColor: "#1a1a1a" }}>
                <span className="block font-[800] uppercase leading-none mb-1 text-[8px]" style={{ color: "rgba(255,255,255,0.4)" }}>{t.label}</span>
                <span className="block font-[800] lowercase text-white leading-none text-[11px]">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

/* ── User Storage View ── */
interface StorageImage {
  id: string;
  url: string;
  prompt: string;
  created_at: string;
}

const UserStorageView = ({ userId, onBack }: { userId: string; onBack: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [images, setImages] = useState<StorageImage[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<StorageImage | null>(null);
  const [viewingCharacter, setViewingCharacter] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchSection("user-storage", { user_id: userId });
        setEmail(data.email || "unknown");
        setCharacters(data.characters || []);

        const allImages: StorageImage[] = [];
        (data.generations || []).forEach((gen: any) => {
          (gen.image_urls || []).forEach((url: string, i: number) => {
            if (!url || url.trim() === "" || url.startsWith("data:image/svg") || url.includes("imgen.x.ai") || url.includes("xai-tmp-imgen")) return;
            allImages.push({ id: `${gen.id}-${i}`, url, prompt: gen.prompt || "", created_at: gen.created_at });
          });
        });
        setImages(allImages);
      } catch (e) {
        console.error("Failed to load user storage:", e);
      }
      setLoading(false);
    })();
  }, [userId]);

  if (viewingCharacter) {
    return <AdminCharacterDetail character={viewingCharacter} onBack={() => setViewingCharacter(null)} />;
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="flex items-center justify-center shrink-0"
          style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#ffe603" }}
        >
          <ArrowLeft size={14} strokeWidth={2.5} color="#000" />
        </button>
        <PageTitle className="mb-0">user storage</PageTitle>
      </div>
      <p className="text-[12px] md:text-[13px] font-extrabold lowercase mb-6" style={{ color: "#ffe603" }}>{email}</p>

      {loading ? (
        <AdminLoader />
      ) : (
        <>
          {/* Characters */}
          {characters.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm md:text-base font-[900] lowercase text-white mb-3">characters ({characters.length})</h2>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-4">
                {characters.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setViewingCharacter(c)}
                    className="relative overflow-hidden hover-lift active:scale-[0.97] transition-transform text-left"
                    style={{ borderRadius: 10, backgroundColor: "#1a1a1a" }}
                  >
                    {c.face_image_url ? (
                      <AspectRatio ratio={3 / 4}>
                        <img src={c.face_image_url} alt="" className="h-full w-full object-cover" />
                      </AspectRatio>
                    ) : (
                      <AspectRatio ratio={3 / 4}>
                        <div className="flex h-full w-full items-center justify-center">
                          <User size={24} strokeWidth={2.5} style={{ color: "rgba(255,255,255,0.15)" }} />
                        </div>
                      </AspectRatio>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-4">
                      <span className="block text-[11px] font-[900] lowercase text-white leading-tight truncate">{c.name || "unnamed"}</span>
                      <span className="block text-[9px] font-[800] lowercase" style={{ color: "rgba(255,255,255,0.4)" }}>age {displayAge(c.id, c.age)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photos */}
          <div className="mb-8">
            <h2 className="text-sm md:text-base font-[900] lowercase text-white mb-3">photos ({images.length})</h2>
            {images.length === 0 ? (
              <p className="text-[11px] font-extrabold lowercase text-foreground/30 py-6 text-center">no photos</p>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-4">
                {images.map((img) => (
                  <div key={img.id} className="flex flex-col hover-lift">
                    <button
                      onClick={() => setExpanded(img)}
                      className="group relative rounded-t-[10px] border-[2px] border-b-0 border-border overflow-hidden bg-card transition-all hover:border-foreground/60 active:scale-[0.98] text-left"
                    >
                      <AspectRatio ratio={3 / 4}>
                        <img src={img.url} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </AspectRatio>
                    </button>
                    <a
                      href={img.url}
                      download={`facefox-${img.id}.png`}
                      target="_blank"
                      className="flex items-center justify-center gap-1.5 rounded-b-[10px] py-2.5 text-[10px] md:text-[11px] font-extrabold lowercase transition-opacity hover:opacity-80"
                      style={{ backgroundColor: "#1a1a1a", color: "#ffffff", border: "2px solid rgba(255,255,255,0.15)", borderTop: "none" }}
                    >
                      download
                      <Download size={12} strokeWidth={2.5} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Expanded view */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6 pt-24 pb-6"
            style={{ backgroundColor: "rgba(0,0,0,0.83)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-[280px] md:max-w-[480px]"
            >
              <ModalCloseButton onClick={() => setExpanded(null)} />
              <div className="overflow-hidden" style={{ backgroundColor: "#1a1a1a", borderRadius: 10, border: "2px solid rgba(255,255,255,0.15)" }}>
                <img src={expanded.url} alt="" className="w-full object-contain max-h-[50vh] md:max-h-[65vh]" />
                {expanded.prompt && expanded.prompt !== "character references" && expanded.prompt !== "face generation" && (
                  <div className="px-3 md:px-4 pt-2.5 pb-2.5">
                    <p className="text-[10px] md:text-[12px] font-[800] lowercase leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {expanded.prompt}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ── Helper: format prompt for admin latest photos ── */
const formatPhotoLabel = (prompt: string): { label: string; type: "prompt" | "system" } => {
  if (!prompt) return { label: "no prompt", type: "system" };
  const lower = prompt.toLowerCase().trim();
  if (lower === "character references") return { label: "character setup", type: "system" };
  if (lower === "face generation") return { label: "face generation", type: "system" };
  return { label: prompt, type: "prompt" };
};

/* ── Main Admin ── */
const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, ph, au, rej] = await Promise.all([
        fetchSection("overview"),
        fetchSection("latest-photos"),
        fetchSection("active-users"),
        fetchSection("rejected"),
      ]);
      setOverview(ov);
      setPhotos(ph);
      setActiveUsers(au);
      setRejected(rej);
    } catch (e) {
      console.error("Admin load error:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) loadAll();
  }, [user, loadAll]);

  if (authLoading || !user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="relative min-h-screen bg-background overflow-hidden">
        <DotDecal />
        <main className="relative z-[1] w-full max-w-lg md:max-w-6xl mx-auto px-[14px] md:px-10 pt-10 pb-20">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-[40px] h-[40px]" style={{ borderRadius: 10, backgroundColor: "#1a1a1a" }} />
            <div className="h-7 w-20" style={{ borderRadius: 8, backgroundColor: "#1a1a1a" }} />
          </div>
          <div className="grid grid-cols-3 gap-2.5 mb-8">
            {[0,1,2].map(i => (
              <div key={i} className="py-6" style={{ borderRadius: 10, backgroundColor: "#1a1a1a" }}>
                <div className="h-8 w-16 mx-auto" style={{ borderRadius: 6, backgroundColor: "#111" }} />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      {selectedPhoto && <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />}
      <main className="relative z-[1] w-full max-w-lg md:max-w-6xl mx-auto px-[14px] md:px-10 pt-10 pb-20">

        {viewingUserId ? (
          <UserStorageView userId={viewingUserId} onBack={() => setViewingUserId(null)} />
        ) : (
          <>
            <div className="flex items-center gap-3 mb-7">
              <BackButton />
              <PageTitle className="mb-0">admin</PageTitle>
            </div>

            {loading ? (
              <AdminLoader />
            ) : (
              <div className="md:grid md:grid-cols-12 md:gap-8">
                {/* Left column: stats + photos */}
                <div className="md:col-span-7">
                  {/* STATS */}
                  <div className="grid grid-cols-3 gap-2.5 md:gap-4 mb-8">
                    {[
                      { label: "users", value: overview?.users ?? 0, icon: Users },
                      { label: "characters", value: overview?.characters ?? 0, icon: Sparkles },
                      { label: "photos", value: overview?.photos ?? 0, icon: ImageIcon },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="flex flex-col items-center justify-center py-4 md:py-6" style={{ borderRadius: 10, backgroundColor: "#1a1a1a" }}>
                        <Icon size={16} strokeWidth={2.5} style={{ color: "#ffe603" }} className="mb-1 md:w-5 md:h-5" />
                        <span className="text-[28px] md:text-[36px] font-[900] text-white leading-none">{value.toLocaleString()}</span>
                        <span className="text-[9px] md:text-[11px] font-extrabold lowercase mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* LATEST PHOTOS */}
                  <div className="mb-8">
                    <h2 className="text-sm md:text-base font-[900] lowercase text-white mb-3">latest photos</h2>
                    {photos.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-4">
                        {photos.map((p: any, i: number) => {
                          const { label, type } = formatPhotoLabel(p.prompt);
                          return (
                            <button key={i} onClick={() => setSelectedPhoto(p)} className="text-left hover-lift" style={{ borderRadius: 10, backgroundColor: "#1a1a1a", overflow: "hidden" }}>
                              <img src={p.image_url} alt="" className="w-full aspect-[3/4] object-cover" />
                              <div className="px-3 py-2.5 space-y-1">
                                {type === "system" ? (
                                  <span className="inline-block text-[9px] md:text-[10px] font-[800] lowercase px-2 py-0.5" style={{ borderRadius: 6, backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                                    {label}
                                  </span>
                                ) : (
                                  <p className="text-[10px] md:text-[11px] font-extrabold lowercase text-white truncate leading-tight">{label}</p>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <p className="text-[9px] md:text-[10px] font-extrabold lowercase truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{p.user_email}</p>
                                  {p.character_name && (
                                    <span className="text-[9px] md:text-[10px] font-extrabold lowercase shrink-0" style={{ color: "#ffe603" }}>· {p.character_name}</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] font-extrabold lowercase text-foreground/30 py-6 text-center">no photos yet</p>
                    )}
                  </div>
                </div>

                {/* Right column: users + flagged */}
                <div className="md:col-span-5">
                  {/* ACTIVE USERS */}
                  <div className="mb-8">
                    <h2 className="text-sm md:text-base font-[900] lowercase text-white mb-3">active users (7d)</h2>
                    {activeUsers.length > 0 ? (
                      <div className="space-y-1.5">
                        {activeUsers.map((u: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => { setViewingUserId(u.user_id); window.scrollTo(0, 0); }}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 md:py-3 text-left transition-all hover:ring-1 hover:ring-foreground/20 active:scale-[0.98]"
                            style={{ borderRadius: 10, backgroundColor: "#1a1a1a" }}
                          >
                            <span className="text-[11px] md:text-[12px] font-extrabold lowercase text-white truncate flex-1 mr-3">{u.email}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] md:text-[11px] font-extrabold lowercase" style={{ color: "rgba(255,255,255,0.5)" }}>{u.photos_this_week} photos</span>
                              <span className="text-[10px] md:text-[11px] font-extrabold lowercase" style={{ color: "#00e0ff" }}>{u.gems_remaining}💎</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] font-extrabold lowercase text-foreground/30 py-6 text-center">no recent activity</p>
                    )}
                  </div>

                  {/* FLAGGED */}
                  <div className="mb-8">
                    <h2 className="text-sm md:text-base font-[900] lowercase text-white mb-3">flagged</h2>
                    {rejected.length > 0 ? (
                      <div className="space-y-1.5">
                        {rejected.map((r: any, i: number) => (
                          <div key={r.id || i} className="px-3.5 py-2.5 md:py-3" style={{ borderRadius: 10, backgroundColor: "#1a1a1a" }}>
                            <p className="text-[11px] md:text-[12px] font-extrabold lowercase text-white leading-snug">{r.prompt_text}</p>
                            <p className="text-[9px] md:text-[10px] font-extrabold lowercase mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                              {r.user_email} · {fmtDate(r.rejected_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] font-extrabold lowercase text-foreground/30 py-6 text-center">no rejected prompts</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;
