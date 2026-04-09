import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAIL = "louisjridland@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    if (section === "overview") {
      const [users, chars, photos, gemsSpent] = await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("characters").select("id", { count: "exact", head: true }),
        admin.from("generations").select("id", { count: "exact", head: true }),
        admin.from("generation_logs").select("gems_cost"),
      ]);
      const totalGems = (gemsSpent.data || []).reduce((s: number, r: any) => s + (r.gems_cost || 0), 0);
      return new Response(JSON.stringify({
        users: users.count ?? 0,
        characters: chars.count ?? 0,
        photos: photos.count ?? 0,
        gemsSpent: totalGems,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (section === "activity") {
      // last 30 days generation counts
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await admin
        .from("generation_logs")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });
      // group by day
      const dayCounts: Record<string, number> = {};
      for (const row of data || []) {
        const day = row.created_at.slice(0, 10);
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
      // fill gaps
      const result: { date: string; count: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        result.push({ date: key, count: dayCounts[key] || 0 });
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (section === "recent-generations") {
      const { data } = await admin
        .from("generation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      // enrich with user emails and character names
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      const charIds = [...new Set((data || []).filter((r: any) => r.character_id).map((r: any) => r.character_id))];
      const [profilesRes, charsRes, gensRes] = await Promise.all([
        userIds.length ? admin.from("profiles").select("user_id, email").in("user_id", userIds) : { data: [] },
        charIds.length ? admin.from("characters").select("id, name").in("id", charIds) : { data: [] },
        admin.from("generations").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      const emailMap: Record<string, string> = {};
      for (const p of profilesRes.data || []) emailMap[p.user_id] = p.email || "unknown";
      const charMap: Record<string, string> = {};
      for (const c of charsRes.data || []) charMap[c.id] = c.name || "unnamed";

      const enriched = (data || []).map((r: any) => ({
        ...r,
        user_email: emailMap[r.user_id] || "unknown",
        character_name: r.character_id ? (charMap[r.character_id] || "unknown") : null,
      }));
      // attach image URLs from generations table
      const genImages: Record<string, string[]> = {};
      for (const g of gensRes.data || []) {
        genImages[g.user_id + "|" + g.created_at] = g.image_urls;
      }
      return new Response(JSON.stringify({ logs: enriched, generations: gensRes.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (section === "users") {
      const [profilesRes, creditsRes, charsRes, gensRes, subsRes] = await Promise.all([
        admin.from("profiles").select("*").order("created_at", { ascending: false }),
        admin.from("credits").select("user_id, balance"),
        admin.from("characters").select("user_id"),
        admin.from("generation_logs").select("user_id, gems_cost"),
        admin.from("subscriptions").select("user_id, status"),
      ]);
      const balanceMap: Record<string, number> = {};
      for (const c of creditsRes.data || []) balanceMap[c.user_id] = c.balance;
      const charCountMap: Record<string, number> = {};
      for (const c of charsRes.data || []) charCountMap[c.user_id] = (charCountMap[c.user_id] || 0) + 1;
      const genCountMap: Record<string, number> = {};
      const gemsSpentMap: Record<string, number> = {};
      for (const g of gensRes.data || []) {
        genCountMap[g.user_id] = (genCountMap[g.user_id] || 0) + 1;
        gemsSpentMap[g.user_id] = (gemsSpentMap[g.user_id] || 0) + (g.gems_cost || 0);
      }
      const subMap: Record<string, string> = {};
      for (const s of subsRes.data || []) subMap[s.user_id] = s.status;

      const users = (profilesRes.data || []).map((p: any) => ({
        email: p.email || "unknown",
        user_id: p.user_id,
        created_at: p.created_at,
        characters: charCountMap[p.user_id] || 0,
        photos: genCountMap[p.user_id] || 0,
        gems_spent: gemsSpentMap[p.user_id] || 0,
        balance: balanceMap[p.user_id] ?? 0,
        subscription: subMap[p.user_id] || "none",
      }));
      return new Response(JSON.stringify(users), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (section === "rejected") {
      const { data } = await admin
        .from("rejected_prompts")
        .select("*")
        .order("rejected_at", { ascending: false })
        .limit(100);
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      const profilesRes = userIds.length
        ? await admin.from("profiles").select("user_id, email").in("user_id", userIds)
        : { data: [] };
      const emailMap: Record<string, string> = {};
      for (const p of profilesRes.data || []) emailMap[p.user_id] = p.email || "unknown";
      const enriched = (data || []).map((r: any) => ({
        ...r,
        user_email: emailMap[r.user_id] || "unknown",
      }));
      return new Response(JSON.stringify(enriched), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (section === "generation-logs") {
      const filter = searchParams.get("filter") || "all";
      let query = admin
        .from("generation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter === "faces") query = query.in("generation_type", ["face", "angle", "body"]);
      if (filter === "photos") query = query.eq("generation_type", "photo");
      if (filter === "failed") query = query.eq("success", false);
      const { data } = await query;
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      const profilesRes = userIds.length
        ? await admin.from("profiles").select("user_id, email").in("user_id", userIds)
        : { data: [] };
      const emailMap: Record<string, string> = {};
      for (const p of profilesRes.data || []) emailMap[p.user_id] = p.email || "unknown";
      const enriched = (data || []).map((r: any) => ({
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
