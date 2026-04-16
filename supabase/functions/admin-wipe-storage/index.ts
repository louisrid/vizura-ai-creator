import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ADMIN_EMAIL = "louisjridland@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (userData?.user?.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let deleted = 0;
    const walk = async (prefix: string) => {
      const { data: items, error } = await admin.storage.from("images").list(prefix, { limit: 1000 });
      if (error) { console.error("list", prefix, error); return; }
      if (!items?.length) return;
      const files: string[] = [];
      const subs: string[] = [];
      for (const it of items) {
        const p = prefix ? `${prefix}/${it.name}` : it.name;
        if (it.id === null || it.metadata === null) subs.push(p);
        else files.push(p);
      }
      if (files.length) {
        const { error: rmErr } = await admin.storage.from("images").remove(files);
        if (rmErr) console.error("remove", rmErr);
        else deleted += files.length;
      }
      for (const s of subs) await walk(s);
    };
    await walk("");

    return new Response(JSON.stringify({ success: true, deleted }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-wipe-storage error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
