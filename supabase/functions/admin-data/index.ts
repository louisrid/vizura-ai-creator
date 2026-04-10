import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAIL = "louisjridland@gmail.com";
const EXCLUDED_PATTERNS = ["preview.", "@preview.vizura.app", "@vizura.app"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const isExcluded = (email: string | null) => {
  if (!email) return true;
  const e = email.toLowerCase();
  return EXCLUDED_PATTERNS.some((p) => e.includes(p));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") || "overview";

    // Get all profiles for filtering
    const { data: allProfiles } = await admin.from("profiles").select("user_id, email");
    const realProfiles = (allProfiles || []).filter((p: any) => !isExcluded(p.email));
    const realUserIds = new Set(realProfiles.map((p: any) => p.user_id));
    const emailMap: Record<string, string> = {};
    for (const p of realProfiles) emailMap[p.user_id] = p.email || "unknown";

    if (section === "overview") {
      const [charsRes, photosRes] = await Promise.all([
        admin.from("characters").select("user_id"),
        admin.from("generations").select("user_id"),
      ]);
      const realChars = (charsRes.data || []).filter((c: any) => realUserIds.has(c.user_id)).length;
      const realPhotos = (photosRes.data || []).filter((g: any) => realUserIds.has(g.user_id)).length;

      return new Response(JSON.stringify({
        users: realProfiles.length,
        characters: realChars,
        photos: realPhotos,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (section === "latest-photos") {
      // Get 30 most recent generations, then filter to real users and take 6
      const { data: gens } = await admin
        .from("generations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      const realGens = (gens || []).filter((g: any) => realUserIds.has(g.user_id));

      // Get matching character info from generation_logs
      const logUserIds = realGens.map((g: any) => g.user_id);
      const { data: logs } = logUserIds.length
        ? await admin.from("generation_logs").select("user_id, character_id, prompt_text, created_at").in("user_id", [...new Set(logUserIds)]).order("created_at", { ascending: false }).limit(100)
        : { data: [] };

      const charIds = [...new Set((logs || []).filter((l: any) => l.character_id).map((l: any) => l.character_id))];
      const { data: chars } = charIds.length
        ? await admin.from("characters").select("id, name").in("id", charIds)
        : { data: [] };
      const charMap: Record<string, string> = {};
      for (const c of chars || []) charMap[c.id] = c.name || "unnamed";

      const photos = realGens.slice(0, 6).map((g: any) => {
        // Find closest log by time
        const matchLog = (logs || []).find((l: any) =>
          l.user_id === g.user_id &&
          Math.abs(new Date(l.created_at).getTime() - new Date(g.created_at).getTime()) < 60000
        );
        return {
          image_url: g.image_urls?.[0] || null,
          all_urls: g.image_urls || [],
          prompt: matchLog?.prompt_text || g.prompt || "",
          user_email: emailMap[g.user_id] || "unknown",
          character_name: matchLog?.character_id ? (charMap[matchLog.character_id] || "unknown") : null,
          created_at: g.created_at,
        };
      }).filter((p: any) => p.image_url);

      return new Response(JSON.stringify(photos), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (section === "active-users") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: recentLogs } = await admin
        .from("generation_logs")
        .select("user_id, gems_cost")
        .gte("created_at", sevenDaysAgo);

      // Count per real user
      const countMap: Record<string, number> = {};
      for (const l of recentLogs || []) {
        if (!realUserIds.has(l.user_id)) continue;
        countMap[l.user_id] = (countMap[l.user_id] || 0) + 1;
      }

      // Get balances
      const activeIds = Object.keys(countMap);
      const { data: creditsData } = activeIds.length
        ? await admin.from("credits").select("user_id, balance").in("user_id", activeIds)
        : { data: [] };
      const balMap: Record<string, number> = {};
      for (const c of creditsData || []) balMap[c.user_id] = c.balance;

      const activeUsers = activeIds
        .map((uid) => ({
          user_id: uid,
          email: emailMap[uid] || "unknown",
          photos_this_week: countMap[uid],
          gems_remaining: balMap[uid] ?? 0,
        }))
        .sort((a, b) => b.photos_this_week - a.photos_this_week)
        .slice(0, 10);

      return new Response(JSON.stringify(activeUsers), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (section === "rejected") {
      const { data } = await admin
        .from("rejected_prompts")
        .select("*")
        .order("rejected_at", { ascending: false })
        .limit(50);

      const enriched = (data || [])
        .filter((r: any) => realUserIds.has(r.user_id))
        .map((r: any) => ({
          ...r,
          user_email: emailMap[r.user_id] || "unknown",
        }));

      return new Response(JSON.stringify(enriched), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown section" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Admin data error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
