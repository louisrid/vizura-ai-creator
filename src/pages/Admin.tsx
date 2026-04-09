import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Eye, ShieldAlert, Users, ImageIcon, Gem, BarChart3, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import DotDecal from "@/components/DotDecal";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const ADMIN_EMAIL = "louisjridland@gmail.com";

/* ── helpers ──────────────────────────────────── */
const fetchSection = async (section: string, filter?: string) => {
  const params = new URLSearchParams({ section });
  if (filter) params.set("filter", filter);
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

const shortDate = (iso: string) => iso.slice(5, 10);

/* ── stat box ────────────────────────────────── */
const StatBox = ({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) => (
  <div className="flex flex-col items-center justify-center p-4" style={{ borderRadius: 14, backgroundColor: "#1a1a1a", border: "2px solid #1a1a1a" }}>
    <Icon size={18} strokeWidth={2.5} style={{ color: "#facc15" }} className="mb-1.5" />
    <span className="text-2xl font-[900] lowercase text-white">{typeof value === "number" ? value.toLocaleString() : value}</span>
    <span className="text-[10px] font-extrabold lowercase mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
  </div>
);

/* ── section wrapper ─────────────────────────── */
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="text-sm font-[900] lowercase text-white mb-3">{title}</h2>
    {children}
  </div>
);

/* ── full-size image modal ───────────────────── */
const ImageModal = ({ url, onClose }: { url: string; onClose: () => void }) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90" onClick={onClose}>
    <button onClick={onClose} className="absolute top-6 right-6 text-white/60 hover:text-white"><X size={24} /></button>
    <img src={url} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
  </div>
);

/* ── main ─────────────────────────────────────── */
const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [recentGens, setRecentGens] = useState<{ logs: any[]; generations: any[] }>({ logs: [], generations: [] });
  const [users, setUsers] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);
  const [genLogs, setGenLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState("all");
  const [loadingSection, setLoadingSection] = useState<string | null>("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);

  // Guard
  useEffect(() => {
    if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Fetch all data
  const loadAll = useCallback(async () => {
    setLoadingSection("all");
    try {
      const [ov, act, rg, us, rej, gl] = await Promise.all([
        fetchSection("overview"),
        fetchSection("activity"),
        fetchSection("recent-generations"),
        fetchSection("users"),
        fetchSection("rejected"),
        fetchSection("generation-logs", logFilter),
      ]);
      setOverview(ov);
      setActivity(act);
      setRecentGens(rg);
      setUsers(us);
      setRejected(rej);
      setGenLogs(gl);
    } catch (e) {
      console.error("Admin load error:", e);
    }
    setLoadingSection(null);
  }, [logFilter]);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) loadAll();
  }, [user, loadAll]);

  // Reload gen logs on filter change
  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return;
    (async () => {
      try {
        const gl = await fetchSection("generation-logs", logFilter);
        setGenLogs(gl);
      } catch {}
    })();
  }, [logFilter, user]);

  if (authLoading || !user || user.email !== ADMIN_EMAIL) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-foreground" size={28} /></div>;
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      {modalImage && <ImageModal url={modalImage} onClose={() => setModalImage(null)} />}
      <main className="relative z-[1] w-full max-w-lg md:max-w-5xl mx-auto px-[14px] md:px-10 pt-10 pb-32">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
          <PageTitle className="mb-0">admin</PageTitle>
        </div>

        {loadingSection === "all" ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-foreground/30" size={28} /></div>
        ) : (
          <>
            {/* OVERVIEW STATS */}
            <Section title="overview">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <StatBox label="users" value={overview?.users ?? 0} icon={Users} />
                <StatBox label="characters" value={overview?.characters ?? 0} icon={Eye} />
                <StatBox label="photos" value={overview?.photos ?? 0} icon={ImageIcon} />
                <StatBox label="gems spent" value={overview?.gemsSpent ?? 0} icon={Gem} />
              </div>
            </Section>

            {/* ACTIVITY GRAPH */}
            <Section title="generations per day (30d)">
              <div style={{ borderRadius: 14, backgroundColor: "#1a1a1a", padding: "16px 8px 8px 0" }}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={activity}>
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={{ backgroundColor: "#000", border: "2px solid #1a1a1a", borderRadius: 10, fontSize: 11, fontWeight: 800 }} labelFormatter={shortDate} />
                    <Bar dataKey="count" fill="#facc15" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            {/* RECENT GENERATIONS */}
            <Section title="recent generations">
              <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide" style={{ borderRadius: 14 }}>
                {recentGens.logs.map((log: any, i: number) => {
                  // Try to find matching generation images
                  const matchGen = recentGens.generations.find((g: any) => g.user_id === log.user_id && Math.abs(new Date(g.created_at).getTime() - new Date(log.created_at).getTime()) < 30000);
                  const imageUrl = matchGen?.image_urls?.[0];
                  return (
                    <div key={log.id || i} className="p-3 flex gap-3" style={{ borderRadius: 12, backgroundColor: "#1a1a1a" }}>
                      {imageUrl ? (
                        <button onClick={() => setModalImage(imageUrl)} className="shrink-0 w-14 h-14 rounded-lg overflow-hidden">
                          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="shrink-0 w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#0d0d0d" }}>
                          <ImageIcon size={16} style={{ color: "rgba(255,255,255,0.15)" }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-extrabold lowercase text-white truncate">{log.prompt_text || "—"}</p>
                        <p className="text-[9px] font-extrabold lowercase mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {log.user_email} · {log.character_name || "—"} · {log.generation_type} · {log.gems_cost}💎 ·
                          <span style={{ color: log.success ? "#22c55e" : "#ff4444" }}>{log.success ? " ✓" : " ✗"}</span>
                        </p>
                        <p className="text-[8px] font-extrabold lowercase" style={{ color: "rgba(255,255,255,0.2)" }}>{fmtDate(log.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                {recentGens.logs.length === 0 && <p className="text-[11px] font-extrabold lowercase text-foreground/30 py-4 text-center">no generations yet</p>}
              </div>
            </Section>

            {/* USER LIST */}
            <Section title="users">
              <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide">
                {users.map((u: any) => (
                  <div key={u.user_id}>
                    <button
                      onClick={() => setExpandedUser(expandedUser === u.user_id ? null : u.user_id)}
                      className="w-full p-3 text-left"
                      style={{ borderRadius: 12, backgroundColor: "#1a1a1a" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold lowercase text-white truncate">{u.email}</span>
                        <span className="text-[9px] font-extrabold lowercase shrink-0 ml-2" style={{ color: u.subscription === "active" ? "#22c55e" : "rgba(255,255,255,0.3)" }}>
                          {u.subscription === "active" ? "subscribed" : "free"}
                        </span>
                      </div>
                      <p className="text-[9px] font-extrabold lowercase mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                        joined {fmtDate(u.created_at)} · {u.characters} chars · {u.photos} photos · {u.gems_spent}💎 spent · {u.balance}💎 left
                      </p>
                    </button>
                    {expandedUser === u.user_id && (
                      <div className="ml-3 mt-1 mb-2 p-2 text-[9px] font-extrabold lowercase" style={{ borderRadius: 10, backgroundColor: "#0d0d0d", color: "rgba(255,255,255,0.4)" }}>
                        user id: {u.user_id}
                      </div>
                    )}
                  </div>
                ))}
                {users.length === 0 && <p className="text-[11px] font-extrabold lowercase text-foreground/30 py-4 text-center">no users</p>}
              </div>
            </Section>

            {/* REJECTED PROMPTS */}
            <Section title="rejected prompts">
              <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                {rejected.map((r: any, i: number) => (
                  <div key={r.id || i} className="p-3" style={{ borderRadius: 12, backgroundColor: "#1a1a1a" }}>
                    <p className="text-[11px] font-extrabold lowercase text-white">{r.prompt_text}</p>
                    <p className="text-[9px] font-extrabold lowercase mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {r.user_email} · {fmtDate(r.rejected_at)}
                    </p>
                  </div>
                ))}
                {rejected.length === 0 && <p className="text-[11px] font-extrabold lowercase text-foreground/30 py-4 text-center">no rejected prompts</p>}
              </div>
            </Section>

            {/* GENERATION LOGS */}
            <Section title="generation logs">
              <div className="flex gap-2 mb-3 flex-wrap">
                {["all", "faces", "photos", "failed"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    className="px-3 py-1.5 text-[10px] font-extrabold lowercase transition-all"
                    style={{
                      borderRadius: 8,
                      backgroundColor: logFilter === f ? "#facc15" : "#1a1a1a",
                      color: logFilter === f ? "#000" : "rgba(255,255,255,0.5)",
                      border: logFilter === f ? "2px solid #facc15" : "2px solid #1a1a1a",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide">
                {genLogs.map((g: any, i: number) => (
                  <div key={g.id || i} className="p-3" style={{ borderRadius: 12, backgroundColor: "#1a1a1a" }}>
                    <p className="text-[11px] font-extrabold lowercase text-white truncate">{g.prompt_text || "—"}</p>
                    <p className="text-[9px] font-extrabold lowercase mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {g.user_email} · {g.generation_type} · {g.gems_cost}💎 ·
                      <span style={{ color: g.success ? "#22c55e" : "#ff4444" }}>{g.success ? " success" : " failed"}</span>
                      {g.error_message && <span style={{ color: "#ff4444" }}> · {g.error_message}</span>}
                    </p>
                    <p className="text-[8px] font-extrabold lowercase" style={{ color: "rgba(255,255,255,0.2)" }}>{fmtDate(g.created_at)}</p>
                  </div>
                ))}
                {genLogs.length === 0 && <p className="text-[11px] font-extrabold lowercase text-foreground/30 py-4 text-center">no logs</p>}
              </div>
            </Section>
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;
