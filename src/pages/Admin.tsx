import { useEffect, useState, useCallback, useRef } from "react";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Users, ImageIcon, Sparkles, ArrowLeft, Download, User, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";
import ModalCloseButton from "@/components/ModalCloseButton";
import PageTitle from "@/components/PageTitle";
import DotDecal from "@/components/DotDecal";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { supabase } from "@/integrations/supabase/client";
import { displayAge } from "@/lib/displayAge";
import { registerBlockingLoader } from "@/lib/startupSplash";
import { toast } from "sonner";

// Admin identity is verified server-side in the admin-data edge function.
// We probe it once on mount to determine whether to render the page.

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

const PhotoModal = ({ photo, onClose }: { photo: any; onClose: () => void }) => {
  const showPromptButton = photo.prompt && photo.prompt !== "character references" && photo.prompt !== "face generation";
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 px-4 pt-24 pb-6">
      <div className="relative w-full max-w-md md:max-w-lg">
        <ModalCloseButton onClick={onClose} />
        <div>
          <img src={photo.image_url} alt="" className="w-full rounded-[10px] object-contain max-h-[60vh]" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="mt-4 space-y-2">
            {showPromptButton ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const btn = e.currentTarget;
                  btn.style.backgroundColor = "hsl(var(--card))";
                  setTimeout(() => { btn.style.backgroundColor = "#000000"; }, 150);
                  const text = photo.prompt as string;
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
                  const done = () => { toast.success("copied"); };
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(text).then(done).catch(() => {
                      if (copyFallback()) done(); else toast.error("copy error");
                    });
                  } else {
                    if (copyFallback()) done(); else toast.error("copy error");
                  }
                }}
                className="w-full flex items-start gap-2 px-3 py-2.5 border-[2px] border-[hsl(var(--border-mid))] text-[10px] md:text-[12px] font-[800] lowercase text-white text-left rounded-[10px]"
                style={{ backgroundColor: "#000000" }}
              >
                <span className="line-clamp-2 flex-1 leading-snug">{photo.prompt}</span>
                <Copy size={13} strokeWidth={2.5} className="shrink-0 opacity-60 mt-0.5" />
              </button>
            ) : (
              <p className="text-[12px] md:text-[14px] font-extrabold lowercase text-white leading-snug">{photo.prompt || "no prompt"}</p>
            )}
            <p className="text-[10px] md:text-[12px] font-extrabold lowercase" style={{ color: "#ffffff" }}>
              {photo.user_email}
              {photo.character_name && ` · ${photo.character_name}`}
              {` · ${fmtDate(photo.created_at)}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

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
        <img src={url!} alt={label} className="h-full w-full absolute inset-0" style={{ objectFit: "cover", borderRadius: 10 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <span className="text-[9px] md:text-[11px] font-[900] lowercase" style={{ color: "#ffffff" }}>no photo</span>
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
          <ArrowLeft size={14} strokeWidth={2.5} color="#000000" />
        </button>
        <PageTitle className="mb-0">character</PageTitle>
      </div>

      <div className="flex flex-col gap-3 max-w-lg">
        <div style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }} className="p-5">
          <h1 className="font-[900] lowercase tracking-tight text-white leading-none text-[30px] mb-5">
            {displayName}, {ageDisplay}
          </h1>
          <div className="grid grid-cols-3 gap-2" style={{ overflow: "visible" }}>
            {imgSlot(character.face_image_url, "front")}
            {imgSlot(character.face_angle_url, "3/4 angle")}
            {imgSlot(character.body_anchor_url, "full body")}
          </div>
        </div>
        <div style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }} className="px-4 py-3">
          <div className="grid grid-cols-4 gap-1.5">
            {traits.map((t) => (
              <div key={t.label} className="rounded-[10px] py-2 text-center" style={{ backgroundColor: "hsl(var(--card))" }}>
                <span className="block font-[800] uppercase leading-none mb-1 text-[8px]" style={{ color: "#ffffff" }}>{t.label}</span>
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

const UserStorageView = ({ userId, onBack, onReset }: { userId: string; onBack: () => void; onReset: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [images, setImages] = useState<StorageImage[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<StorageImage | null>(null);
  const [viewingCharacter, setViewingCharacter] = useState<any | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: userId }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success("user reset!");
      setConfirmReset(false);
      onReset();
    } catch (e) {
      console.error("Reset failed:", e);
      toast.error("reset failed");
    }
    setResetting(false);
  };

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
          <ArrowLeft size={14} strokeWidth={2.5} color="#000000" />
        </button>
        <PageTitle className="mb-0">user storage</PageTitle>
      </div>
      <p className="text-[13px] font-extrabold lowercase mb-3" style={{ color: "#ffe603" }}>{email}</p>
      <button
        onClick={() => setConfirmReset(true)}
        className="w-full flex items-center justify-center text-[14px] font-[900] lowercase mb-6 transition-transform"
        style={{ padding: "12px 0", color: "#ff4444", borderRadius: 10, border: "2px solid #ff4444", backgroundColor: "transparent" }}
      >
        reset user
      </button>

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
                    className="relative overflow-hidden hover-lift transition-transform text-left"
                    style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))" }}
                  >
                    {c.face_image_url ? (
                      <AspectRatio ratio={3 / 4}>
                        <img src={c.face_image_url} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </AspectRatio>
                    ) : (
                      <AspectRatio ratio={3 / 4}>
                        <div className="flex h-full w-full items-center justify-center">
                          <User size={24} strokeWidth={2.5} style={{ color: "#ffffff" }} />
                        </div>
                      </AspectRatio>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-4">
                      <span className="block text-[11px] font-[900] lowercase text-white leading-tight truncate">{c.name || "unnamed"}</span>
                      <span className="block text-[9px] font-[800] lowercase" style={{ color: "#ffffff" }}>age {displayAge(c.id, c.age)}</span>
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
              <p className="text-[11px] font-extrabold lowercase text-muted-foreground py-6 text-center">no photos</p>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-4">
                {images.map((img) => (
                  <div key={img.id} className="flex flex-col hover-lift">
                    <button
                      onClick={() => setExpanded(img)}
                      className="group relative rounded-t-[10px] border-[2px] border-b-0 border-border overflow-hidden bg-card transition-all hover:border-foreground/60 text-left"
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
                      style={{ backgroundColor: "hsl(var(--card))", color: "#ffffff", border: "2px solid hsl(var(--border-mid))", borderTop: "none" }}
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
              <div className="overflow-hidden" style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10, border: "2px solid hsl(0 0% 4%)" }}>
                <img src={expanded.url} alt="" className="w-full object-contain max-h-[50vh] md:max-h-[65vh]" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                {expanded.prompt && expanded.prompt !== "character references" && expanded.prompt !== "face generation" && (
                  <div className="px-3 md:px-4 pt-2.5 pb-2.5">
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
                        const done = () => { toast.success("copied"); };
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(text).then(done).catch(() => {
                            if (copyFallback()) done(); else toast.error("copy error");
                          });
                        } else {
                          if (copyFallback()) done(); else toast.error("copy error");
                        }
                      }}
                      className="w-full flex items-start gap-2 px-3 py-2.5 border-[2px] border-[hsl(var(--border-mid))] text-[10px] md:text-[12px] font-[800] lowercase text-white text-left rounded-[10px]"
                      style={{ backgroundColor: "#000000" }}
                    >
                      <span className="line-clamp-2 flex-1 leading-snug">{expanded.prompt}</span>
                      <Copy size={13} strokeWidth={2.5} className="shrink-0 opacity-60 mt-0.5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset confirm dialog */}
      <AnimatePresence>
        {confirmReset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center px-6"
            style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={() => !resetting && setConfirmReset(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm p-5"
              style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10, border: "2px solid hsl(0 0% 4%)" }}
            >
              <p className="text-[13px] md:text-[14px] font-[900] lowercase text-white leading-snug mb-5">
                reset {email}? this will delete all their characters, photos, storage, and reset their profile. this cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmReset(false)}
                  disabled={resetting}
                  className="flex-1 text-[11px] md:text-[12px] font-extrabold lowercase py-2.5 transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ color: "#ffffff", borderRadius: 10, border: "2px solid hsl(var(--border-mid))", backgroundColor: "transparent" }}
                >
                  cancel
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex-1 text-[11px] md:text-[12px] font-extrabold lowercase py-2.5 transition-opacity hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ color: "#ffffff", borderRadius: 10, backgroundColor: "#ff4444", border: "2px solid #ff4444" }}
                >
                  {resetting && <Loader2 size={12} className="animate-spin" strokeWidth={3} />}
                  yes, reset
                </button>
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
  const navigate = useTransitionNavigate();

  const [overview, setOverview] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const hasAuthed = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/", { replace: true });
      return;
    }
    if (hasAuthed.current) return;
    hasAuthed.current = true;
    (async () => {
      try {
        await fetchSection("overview");
        setIsAdmin(true);
      } catch {
        setIsAdmin(false);
        navigate("/", { replace: true });
      }
    })();
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

  const hasLoaded = useRef(false);
  useEffect(() => {
    if (isAdmin && !hasLoaded.current) {
      hasLoaded.current = true;
      loadAll();
    }
  }, [isAdmin, loadAll]);

  useEffect(() => {
    if (authLoading || !user || isAdmin !== true || loading) {
      const unregister = registerBlockingLoader();
      return unregister;
    }
  }, [authLoading, user, isAdmin, loading]);

  if (authLoading || !user || isAdmin !== true) {
    return null;
  }

  if (loading) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      {selectedPhoto && <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />}
      <main className="relative z-[1] w-full max-w-lg md:max-w-6xl mx-auto px-[32px] md:px-[56px] pt-[32px] pb-[280px]">

        {viewingUserId ? (
          <UserStorageView
            userId={viewingUserId}
            onBack={() => setViewingUserId(null)}
            onReset={() => { setViewingUserId(null); loadAll(); }}
          />
        ) : (
          <>
            <div className="flex items-center gap-3 mb-[34px]">
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
                      <div key={label} className="flex flex-col items-center justify-center py-4 md:py-6" style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))" }}>
                        <Icon size={16} strokeWidth={2.5} style={{ color: "#ffe603" }} className="mb-1 md:w-5 md:h-5" />
                        <span className="text-[28px] md:text-[36px] font-[900] text-white leading-none">{value.toLocaleString()}</span>
                        <span className="text-[9px] md:text-[11px] font-extrabold lowercase mt-1" style={{ color: "#ffffff" }}>{label}</span>
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
                            <button key={i} onClick={() => setSelectedPhoto(p)} className="text-left hover-lift" style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))", overflow: "hidden" }}>
                              <img src={p.image_url} alt="" className="w-full aspect-[3/4] object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              <div className="px-3 py-2.5 space-y-1">
                                {type === "system" ? (
                                  <span className="inline-block text-[9px] md:text-[10px] font-[800] lowercase px-2 py-0.5" style={{ borderRadius: 6, backgroundColor: "hsl(var(--card))", color: "#ffffff" }}>
                                    {label}
                                  </span>
                                ) : (
                                  <p className="text-[10px] md:text-[11px] font-extrabold lowercase text-white truncate leading-tight">{label}</p>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <p className="text-[9px] md:text-[10px] font-extrabold lowercase truncate" style={{ color: "#ffffff" }}>{p.user_email}</p>
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
                      <p className="text-[11px] font-extrabold lowercase text-muted-foreground py-6 text-center">no photos yet</p>
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
                            className="w-full flex items-center justify-between px-3.5 py-2.5 md:py-3 text-left transition-all hover:ring-1 hover:ring-foreground/20"
                            style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))" }}
                          >
                            <span className="text-[11px] md:text-[12px] font-extrabold lowercase text-white truncate flex-1 mr-3">{u.email}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] md:text-[11px] font-extrabold lowercase" style={{ color: "#ffffff" }}>{u.photos_this_week} photos</span>
                              <span className="text-[10px] md:text-[11px] font-extrabold lowercase" style={{ color: "#00e0ff" }}>{u.gems_remaining}💎</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] font-extrabold lowercase text-muted-foreground py-6 text-center">no recent activity</p>
                    )}
                  </div>

                  {/* FLAGGED */}
                  <div className="mb-8">
                    <h2 className="text-sm md:text-base font-[900] lowercase text-white mb-3">flagged</h2>
                    {rejected.length > 0 ? (
                      <div className="space-y-1.5">
                        {rejected.map((r: any, i: number) => (
                          <div key={r.id || i} className="px-3.5 py-2.5 md:py-3" style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))" }}>
                            <p className="text-[11px] md:text-[12px] font-extrabold lowercase text-white leading-snug">{r.prompt_text}</p>
                            <p className="text-[9px] md:text-[10px] font-extrabold lowercase mt-1" style={{ color: "#ffffff" }}>
                              {r.user_email} · {fmtDate(r.rejected_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] font-extrabold lowercase text-muted-foreground py-6 text-center">no rejected prompts</p>
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
