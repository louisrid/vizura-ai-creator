import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Trash2, Lock, RefreshCw, Camera, Check, User } from "lucide-react";
import ModalCloseButton from "@/components/ModalCloseButton";
import ImageZoomViewer from "@/components/ImageZoomViewer";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useGems } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import DotDecal from "@/components/DotDecal";
import RegenerateConfirmDialog from "@/components/RegenerateConfirmDialog";
import { displayAge } from "@/lib/displayAge";

interface Character {
  id: string;
  name: string;
  age: string;
  country: string;
  hair: string;
  eye: string;
  body: string;
  bust_size?: string;
  style: string;
  description: string;
  face_image_url: string | null;
  face_angle_url?: string | null;
  body_anchor_url?: string | null;
  generation_prompt?: string | null;
}

const SKIN_LABELS: Record<string, string> = {
  white: "white", pale: "pale", tan: "tan", asian: "asian", black: "black", dark: "dark",
};

const CharacterDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { gems, refetch: refetchGems } = useGems();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regeneratingAngle, setRegeneratingAngle] = useState(false);
  const [regeneratingBody, setRegeneratingBody] = useState(false);
  const [regenTarget, setRegenTarget] = useState<"angle" | "body" | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);
  const [revealingAngle, setRevealingAngle] = useState(false);
  const [revealingBody, setRevealingBody] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Latest photos for this character
  const [latestPhotos, setLatestPhotos] = useState<{ id: string; url: string; created_at: string }[]>([]);
  const MAX_LATEST = 6;

  const fetchLatestPhotos = useCallback(async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from("generations")
      .select("id, image_urls, created_at")
      .eq("user_id", user.id)
      .eq("character_id", id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!data) return;
    const photos: { id: string; url: string; created_at: string }[] = [];
    for (const gen of data) {
      for (let i = 0; i < (gen.image_urls || []).length; i++) {
        const url = gen.image_urls[i];
        if (!url || url.startsWith("data:image/svg") || url.includes("imgen.x.ai") || url.includes("xai-tmp-imgen")) continue;
        photos.push({ id: `${gen.id}-${i}`, url, created_at: gen.created_at });
        if (photos.length >= MAX_LATEST) break;
      }
      if (photos.length >= MAX_LATEST) break;
    }
    setLatestPhotos(photos);
  }, [user, id]);

  useEffect(() => { fetchLatestPhotos(); }, [fetchLatestPhotos]);

  useEffect(() => {
    const refresh = () => { fetchLatestPhotos(); };
    const handleVis = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVis);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", handleVis); };
  }, [fetchLatestPhotos]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/characters/${id}`)}`, { replace: true });
    }
  }, [user, authLoading, navigate, id]);

  useEffect(() => {
    const fetch = async () => {
      if (!user || !id) return;
      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (data) {
        // Check if angle/body were regenerated while away
        const regenAngle = sessionStorage.getItem(`vizura_regen_angle_${id}`);
        const regenBody = sessionStorage.getItem(`vizura_regen_body_${id}`);
        if (regenAngle && data.face_angle_url) {
          sessionStorage.removeItem(`vizura_regen_angle_${id}`);
          setRevealingAngle(true);
          setTimeout(() => setRevealingAngle(false), 1200);
        }
        if (regenBody && data.body_anchor_url) {
          sessionStorage.removeItem(`vizura_regen_body_${id}`);
          setRevealingBody(true);
          setTimeout(() => setRevealingBody(false), 1200);
        }
        setCharacter(data as unknown as Character);
      }
      setLoading(false);
    };
    if (user) fetch();
  }, [user, id]);

  useEffect(() => {
    if (!user || !id || !character) return;
    const needsUpdate = !character.face_angle_url || !character.body_anchor_url;
    if (!needsUpdate) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (data) setCharacter(data as unknown as Character);
      if (data?.face_angle_url && data?.body_anchor_url) clearInterval(interval);
    }, 3000);

    return () => clearInterval(interval);
  }, [user, id, character?.face_angle_url, character?.body_anchor_url]);

  const handleRegenerate = async () => {
    if (!character || !character.face_image_url || !user || !regenTarget) return;
    const target = regenTarget;
    setRegenTarget(null);

    if (target === "angle") {
      setRegeneratingAngle(true);
      sessionStorage.setItem(`vizura_regen_angle_${character.id}`, "1");
    } else {
      setRegeneratingBody(true);
      sessionStorage.setItem(`vizura_regen_body_${character.id}`, "1");
    }

    try {
      const { data, error } = await supabase.functions.invoke("generate", {
        body: { regenerate_single: target, character_id: character.id },
      });

      if (error) throw error;
      if (data?.code === "CONTENT_POLICY") {
        toast("prompt not allowed");
        await refetchGems();
        return;
      }
      if (data?.error) throw new Error(data.error);

      setCharacter((prev) => {
        if (!prev) return prev;
        if (target === "angle" && data?.angle_url) return { ...prev, face_angle_url: data.angle_url };
        if (target === "body" && data?.body_anchor_url) return { ...prev, body_anchor_url: data.body_anchor_url };
        return prev;
      });

      await refetchGems();
      if (target === "angle") sessionStorage.removeItem(`vizura_regen_angle_${character.id}`);
      else sessionStorage.removeItem(`vizura_regen_body_${character.id}`);
      toast("10 gems used");
    } catch (err) {
      console.error("Regenerate error:", err);
      if (target === "angle") sessionStorage.removeItem(`vizura_regen_angle_${character.id}`);
      else sessionStorage.removeItem(`vizura_regen_body_${character.id}`);
      toast.error("regeneration failed, please try again");
    } finally {
      setRegeneratingAngle(false);
      setRegeneratingBody(false);
    }
  };

  const handleDelete = async () => {
    if (!character) return;
    setDeleting(true);

    const charUrls = [character.face_image_url, character.face_angle_url, character.body_anchor_url].filter(Boolean) as string[];
    const { data: allGens } = await supabase
      .from("generations")
      .select("id, image_urls, prompt")
      .eq("user_id", user!.id);
    if (allGens) {
      const genIdsToDelete = allGens
        .filter((g: any) => {
          if (charUrls.length > 0 && (g.image_urls || []).some((u: string) => charUrls.includes(u))) return true;
          if (g.prompt === "character references" || g.prompt === "face generation") return true;
          return false;
        })
        .map((g: any) => g.id);
      if (genIdsToDelete.length > 0) {
        await supabase.from("generations").delete().in("id", genIdsToDelete);
      }
    }

    const { error } = await supabase.from("characters").delete().eq("id", character.id);
    if (error) {
      toast.error("failed to delete character");
      setDeleting(false);
      setShowDelete(false);
      return;
    }
    toast.success("character deleted");
    navigate("/characters", { replace: true });
  };

  if (loading || authLoading) {
    return (
      <div className="relative min-h-screen bg-background overflow-hidden">
        <DotDecal />
        <main className="relative z-[1] mx-auto w-full max-w-lg px-[14px] pt-10 pb-[280px] md:hidden">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-[40px] h-[40px] md:w-[48px] md:h-[48px]" style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))" }} />
            <div className="h-7 w-24" style={{ borderRadius: 8, backgroundColor: "hsl(var(--card))" }} />
          </div>
          <div className="flex flex-col gap-3">
            <div style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }} className="p-5">
              <div className="h-9 w-48 mb-5" style={{ borderRadius: 8, backgroundColor: "hsl(var(--card))" }} />
              <div className="grid grid-cols-3 gap-2">
                {[0,1,2].map(i => (
                  <div key={i} className="aspect-[3/4] w-full" style={{ borderRadius: 10, backgroundColor: "hsl(var(--card))" }} />
                ))}
              </div>
            </div>
            <div style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }} className="px-4 py-3">
              <div className="grid grid-cols-4 gap-1.5">
                {[0,1,2,3,4,5,6].map(i => (
                  <div key={i} className="rounded-[10px] py-2 flex flex-col items-center gap-1.5">
                    <div className="h-2 w-8" style={{ borderRadius: 4, backgroundColor: "hsl(var(--card))" }} />
                    <div className="h-6 w-12" style={{ borderRadius: 8, backgroundColor: "hsl(var(--card))" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto w-full max-w-lg md:max-w-3xl px-[14px] md:px-8 pt-10 pb-[280px]">
          <div className="flex items-center gap-3 mb-7">
            <BackButton />
          </div>
          <p className="text-sm font-[900] lowercase text-center mt-16" style={{ color: "hsl(var(--border-mid))" }}>
            character not found
          </p>
        </main>
      </div>
    );
  }

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
    { label: "size", value: character.bust_size || "regular" },
    { label: "age", value: displayAge(character.id, character.age) },
    { label: "hair colour", value: character.hair || "—" },
    { label: "hair style", value: hairStyle || "—" },
    { label: "eyes", value: character.eye || "—" },
  ];

  const isValidImg = (url: string | null | undefined) =>
    url && !url.startsWith("data:image/svg") && !url.includes("imgen.x.ai/xai-imgen/xai-tmp-imgen");

  const displayName = character.name || "unnamed";
  const ageDisplay = displayAge(character.id, character.age);

  const startEditName = () => {
    setEditName(character.name || "");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const saveEditName = async () => {
    if (!character || savingName) return;
    const trimmed = editName.trim();
    if (!trimmed) { setEditingName(false); return; }
    setSavingName(true);
    const { error } = await supabase.from("characters").update({ name: trimmed }).eq("id", character.id);
    if (error) { toast.error("failed to save name"); }
    else { setCharacter((prev) => prev ? { ...prev, name: trimmed } : prev); toast.success("name updated"); }
    setSavingName(false);
    setEditingName(false);
  };

  const imgSlot = (
    url: string | null | undefined,
    label: string,
    overlay: "lock" | "regenerate" | null,
    showSpinner = false,
    onRegenClick?: () => void,
    isRevealing = false,
  ) => (
    <div
      className="relative aspect-[3/4] w-full flex items-center justify-center hover-lift cursor-pointer"
      style={{ borderRadius: 10, backgroundColor: "#000000" }}
      onClick={() => { if (isValidImg(url) && !showSpinner && !isRevealing) setZoomedUrl(url!); }}
    >
      {showSpinner || isRevealing ? (
        <Loader2 className="animate-spin" size={18} style={{ color: "#ffffff" }} strokeWidth={3} />
      ) : isValidImg(url) ? (
        <img src={url!} alt={label} className="h-full w-full absolute inset-0" style={{ objectFit: "cover", borderRadius: 10 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <span className="text-[9px] md:text-[11px] font-[900] lowercase" style={{ color: "hsl(var(--border-mid))" }}>no photo</span>
      )}
      {overlay === "lock" && (
        <div className="absolute flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#ffe603", top: -6, right: -6 }}>
          <Lock size={14} strokeWidth={3} color="#000" fill="none" />
        </div>
      )}
      {overlay === "regenerate" && (
        <button
          onClick={(e) => { e.stopPropagation(); onRegenClick?.(); }}
          className="absolute flex items-center justify-center transition-transform active:scale-90"
          style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#050a10", border: "2px solid #00e0ff", top: -6, right: -6 }}
        >
          <RefreshCw size={13} strokeWidth={3} color="#fff" />
        </button>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />

      {/* Mobile layout */}
      <main className="relative z-[1] mx-auto w-full max-w-lg px-[14px] pt-10 pb-[280px] md:hidden" style={{ minHeight: "100dvh" }}>
        <div className="flex items-center gap-3 mb-7" style={{ position: "relative", zIndex: 10 }}>
          <BackButton />
          <PageTitle className="mb-0">details</PageTitle>
        </div>
        <div className="flex flex-col gap-3">
          <div style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }} className="p-5">
            {editingName ? (
              <div className="flex items-center gap-2 mb-5">
                <Input ref={nameInputRef} value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEditName(); if (e.key === "Escape") { setEditingName(false); } }} className="flex-1 font-[900] lowercase text-white px-3 py-0" style={{ fontSize: 30, height: 52, backgroundColor: "#000", border: "2px solid hsl(var(--border-mid))", borderRadius: 10 }} />
                <button onClick={saveEditName} disabled={savingName} className="flex items-center justify-center shrink-0" style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: "#ffe603" }}>
                  {savingName ? <Loader2 size={16} className="animate-spin text-black" /> : <Check size={18} strokeWidth={3} color="#000" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-5">
                <h1 className="font-[900] lowercase tracking-tight text-white leading-none text-[30px]">
                  {displayName}, {ageDisplay}
                </h1>
                <button onClick={startEditName} className="active:scale-90 transition-transform shrink-0 ml-2" style={{ fontSize: 16 }}>✏️</button>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2" style={{ overflow: "visible" }}>
              {imgSlot(character.face_image_url, "front", "lock")}
              {imgSlot(character.face_angle_url, "3/4 angle", "regenerate", regeneratingAngle, () => setRegenTarget("angle"), revealingAngle)}
              {imgSlot(character.body_anchor_url, "full body", "regenerate", regeneratingBody, () => setRegenTarget("body"), revealingBody)}
            </div>
          </div>
          {/* Latest photos section */}
          <div style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }} className="p-5">
            <h3 className="text-xl font-[900] lowercase text-white mb-3">latest photos</h3>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => {
                const photo = latestPhotos[i];
                return (
                  <div
                    key={photo?.id ?? `placeholder-${i}`}
                    className="relative aspect-[3/4] w-full flex items-center justify-center cursor-pointer"
                    style={{ borderRadius: 10, backgroundColor: "#000" }}
                    onClick={() => { if (photo) setZoomedUrl(photo.url); }}
                  >
                    {photo && (
                      <img src={photo.url} alt="" className="h-full w-full absolute inset-0" style={{ objectFit: "cover", borderRadius: 10 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }} className="px-3 py-2">
            <div className="grid grid-cols-4 gap-1">
              {traits.map((t) => (
                <div key={t.label} className="rounded-[10px] py-2 text-center" style={{ backgroundColor: "hsl(var(--card))" }}>
                  <span className="block font-[800] uppercase leading-none mb-1.5 text-[7px]" style={{ color: "hsl(var(--border-mid))" }}>{t.label}</span>
                  <span className="inline-block font-[800] lowercase text-white leading-none text-[10px] border-[2px] border-[hsl(var(--border-mid))] rounded-[10px]" style={{ backgroundColor: "#000", padding: "4px 8px" }}>{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-[2] md:hidden">
        <div className="mx-auto w-full max-w-lg px-[14px] pt-12" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)", background: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 25%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.3) 70%, transparent 100%)" }}>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/create", { state: { preselectedCharacterId: character.id } })}
              className="flex items-center justify-center gap-2 w-full font-[900] lowercase transition-all active:scale-[0.98] h-10 text-xs"
              style={{ color: "#000", borderRadius: 10, backgroundColor: "#ffe603" }}
            >
              create photo <Camera size={16} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center justify-center gap-2 w-full font-[900] lowercase transition-colors active:scale-[0.98] h-10 text-xs"
              style={{ color: "#ff4444", borderRadius: 10, backgroundColor: "#100505", border: "2px solid #ff4444" }}
            >
              delete character <Trash2 size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop layout — two-column side by side */}
      <main className="hidden md:block relative z-[1] mx-auto w-full max-w-5xl px-10 pt-10 pb-10 min-h-screen">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <PageTitle className="mb-0">details</PageTitle>
        </div>
        <div className="grid grid-cols-12 gap-8">
          {/* Left: photos */}
          <div className="col-span-7">
            <div style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }} className="p-6">
              {editingName ? (
                <div className="flex items-center gap-3 mb-6">
                  <Input ref={nameInputRef} value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEditName(); if (e.key === "Escape") { setEditingName(false); } }} className="flex-1 font-[900] lowercase text-white px-4 py-0" style={{ fontSize: 40, height: 60, backgroundColor: "#000", border: "2px solid hsl(var(--border-mid))", borderRadius: 10 }} />
                  <button onClick={saveEditName} disabled={savingName} className="flex items-center justify-center shrink-0" style={{ width: 60, height: 60, borderRadius: 10, backgroundColor: "#ffe603" }}>
                    {savingName ? <Loader2 size={18} className="animate-spin text-black" /> : <Check size={22} strokeWidth={3} color="#000" />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-6">
                  <h1 className="font-[900] lowercase tracking-tight text-white leading-none text-[40px]">
                    {displayName}, {ageDisplay}
                  </h1>
                  <button onClick={startEditName} className="active:scale-90 transition-transform shrink-0 ml-2" style={{ fontSize: 18 }}>✏️</button>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4" style={{ overflow: "visible" }}>
                {imgSlot(character.face_image_url, "front", "lock")}
                {imgSlot(character.face_angle_url, "3/4 angle", "regenerate", regeneratingAngle, () => setRegenTarget("angle"), revealingAngle)}
                {imgSlot(character.body_anchor_url, "full body", "regenerate", regeneratingBody, () => setRegenTarget("body"), revealingBody)}
              </div>
            </div>
            {/* Latest photos — desktop */}
            <div style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }} className="p-5 mt-5">
              <h3 className="text-xl font-[900] lowercase text-white mb-3">latest photos</h3>
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => {
                  const photo = latestPhotos[i];
                  return (
                    <div
                      key={photo?.id ?? `dplaceholder-${i}`}
                      className="relative aspect-[3/4] w-full flex items-center justify-center cursor-pointer"
                      style={{ borderRadius: 10, backgroundColor: "#000" }}
                      onClick={() => { if (photo) setZoomedUrl(photo.url); }}
                    >
                      {photo && (
                        <img src={photo.url} alt="" className="h-full w-full absolute inset-0" style={{ objectFit: "cover", borderRadius: 10 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Right: details + actions */}
          <div className="col-span-5 flex flex-col gap-5">
            <div style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }} className="p-5">
              <h3 className="text-sm font-[900] lowercase text-muted-foreground mb-3">traits</h3>
               <div className="grid grid-cols-2 gap-2">
                {traits.map((t) => (
                  <div key={t.label} className="rounded-[10px] px-3 py-2 text-center" style={{ backgroundColor: "#000", border: "2px solid hsl(var(--border-mid))" }}>
                    <span className="block font-[800] uppercase leading-none mb-1.5 text-[9px]" style={{ color: "hsl(var(--border-mid))" }}>{t.label}</span>
                    <span className="inline-block font-[800] lowercase text-white leading-none text-[14px]">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => navigate("/create", { state: { preselectedCharacterId: character.id } })}
              className="flex items-center justify-center gap-2 w-full font-[900] lowercase transition-all active:scale-[0.98] h-12 text-sm"
              style={{ color: "#000", borderRadius: 10, backgroundColor: "#ffe603" }}
            >
              create photo <Camera size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center justify-center gap-2 w-full font-[900] lowercase transition-colors active:scale-[0.98] h-12 text-sm"
              style={{ color: "#ff4444", borderRadius: 10, backgroundColor: "#100505", border: "2px solid #ff4444" }}
            >
              delete character <Trash2 size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </main>

      <RegenerateConfirmDialog
        open={regenTarget !== null}
        onConfirm={handleRegenerate}
        onCancel={() => setRegenTarget(null)}
        message="regenerate this photo?"
        confirmLabel="yes • 10"
        gemCost
      />

      <AnimatePresence>
        {showDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[9998] flex items-center justify-center px-5"
            style={{ backgroundColor: "rgba(0,0,0,0.83)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowDelete(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-sm md:max-w-md"
              style={{ backgroundColor: "#000000", borderRadius: 10, border: "2px solid hsl(var(--card))", padding: "28px 24px 24px" }}
            >
              <ModalCloseButton onClick={() => setShowDelete(false)} />

              <h2 className="text-lg md:text-xl font-[900] lowercase text-white leading-[1.1] mb-2 text-center">
                delete this character?
              </h2>
              <p className="text-sm md:text-base font-[900] lowercase mb-6 text-center" style={{ color: "hsl(var(--border-mid))" }}>
                {character.name || "unnamed"}
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => !deleting && setShowDelete(false)}
                  disabled={deleting}
                  className="flex-1 h-12 md:h-14 text-sm md:text-base font-[900] lowercase text-white transition-colors active:opacity-70 disabled:opacity-50"
                  style={{ backgroundColor: "hsl(var(--card))", borderRadius: 10 }}
                >
                  no
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 h-12 md:h-14 text-sm md:text-base font-[900] lowercase transition-colors disabled:opacity-50 flex items-center justify-center"
                  style={{ backgroundColor: "#1a0505", borderRadius: 10, border: "2px solid #ff4444", color: "#ff4444" }}
                >
                  {deleting ? <Loader2 className="animate-spin mx-auto" size={18} /> : "delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageZoomViewer url={zoomedUrl} onClose={() => setZoomedUrl(null)} />
    </div>
  );
};

export default CharacterDetail;
