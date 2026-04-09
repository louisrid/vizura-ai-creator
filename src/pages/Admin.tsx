import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, ImageIcon, Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import DotDecal from "@/components/DotDecal";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "louisjridland@gmail.com";

const fetchSection = async (section: string) => {
  const params = new URLSearchParams({ section });
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

const PhotoModal = ({ photo, onClose }: { photo: any; onClose: () => void }) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 px-4" onClick={onClose}>
    <button onClick={onClose} className="absolute top-5 right-5 text-white/50 hover:text-white z-10"><X size={22} /></button>
    <div className="max-w-md md:max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
      <img src={photo.image_url} alt="" className="w-full rounded-xl object-contain max-h-[60vh]" />
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
);

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

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
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-foreground" size={28} /></div>;
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      {selectedPhoto && <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />}
      <main className="relative z-[1] w-full max-w-lg md:max-w-6xl mx-auto px-[14px] md:px-10 pt-10 pb-20">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
          <PageTitle className="mb-0">admin</PageTitle>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-foreground/30" size={28} /></div>
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
                  <div key={label} className="flex flex-col items-center justify-center py-4 md:py-6" style={{ borderRadius: 14, backgroundColor: "#1a1a1a" }}>
                    <Icon size={16} strokeWidth={2.5} style={{ color: "#facc15" }} className="mb-1 md:w-5 md:h-5" />
                    <span className="text-[28px] md:text-[36px] font-[900] text-white leading-none">{value.toLocaleString()}</span>
                    <span className="text-[9px] md:text-[11px] font-extrabold lowercase mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* LATEST PHOTOS */}
              <div className="mb-8">
                <h2 className="text-sm md:text-base font-[900] lowercase text-white mb-3">latest photos</h2>
                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-4">
                    {photos.map((p: any, i: number) => (
                      <button key={i} onClick={() => setSelectedPhoto(p)} className="text-left hover-lift" style={{ borderRadius: 14, backgroundColor: "#1a1a1a", overflow: "hidden" }}>
                        <img src={p.image_url} alt="" className="w-full aspect-[3/4] object-cover" />
                        <div className="px-3 py-2.5">
                          <p className="text-[10px] md:text-[11px] font-extrabold lowercase text-white truncate leading-tight">{p.prompt || "—"}</p>
                          <p className="text-[9px] md:text-[10px] font-extrabold lowercase mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{p.user_email}</p>
                        </div>
                      </button>
                    ))}
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
                      <div key={i} className="flex items-center justify-between px-3.5 py-2.5 md:py-3" style={{ borderRadius: 12, backgroundColor: "#1a1a1a" }}>
                        <span className="text-[11px] md:text-[12px] font-extrabold lowercase text-white truncate flex-1 mr-3">{u.email}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] md:text-[11px] font-extrabold lowercase" style={{ color: "rgba(255,255,255,0.5)" }}>{u.photos_this_week} photos</span>
                          <span className="text-[10px] md:text-[11px] font-extrabold lowercase" style={{ color: "#00e0ff" }}>{u.gems_remaining}💎</span>
                        </div>
                      </div>
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
                      <div key={r.id || i} className="px-3.5 py-2.5 md:py-3" style={{ borderRadius: 12, backgroundColor: "#1a1a1a" }}>
                        <p className="text-[11px] md:text-[12px] font-extrabold lowercase text-white leading-snug">{r.prompt_text}</p>
                        <p className="text-[9px] md:text-[10px] font-extrabold lowercase mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
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
      </main>
    </div>
  );
};

export default Admin;
