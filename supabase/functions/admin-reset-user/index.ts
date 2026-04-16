import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ADMIN_EMAIL = "louisjridland@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userData.user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const userId = body?.user_id;
    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hard guard: never allow the admin to reset their own account through this endpoint,
    // and never allow an empty/whitespace user_id (which could otherwise widen scope).
    const targetUserId = userId.trim();
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (targetUserId === userData.user.id) {
      return new Response(
        JSON.stringify({ error: "Admin cannot reset their own account from this tool" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Sanity check: confirm the target user actually exists before mutating anything.
    const { data: targetLookup, error: targetLookupErr } =
      await admin.auth.admin.getUserById(targetUserId);
    if (targetLookupErr || !targetLookup?.user) {
      return new Response(JSON.stringify({ error: "Target user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete DB rows
    await admin.from("generations").delete().eq("user_id", targetUserId);
    await admin.from("generation_logs").delete().eq("user_id", targetUserId);
    await admin.from("characters").delete().eq("user_id", targetUserId);
    await admin.from("subscriptions").delete().eq("user_id", targetUserId);
    await admin.from("free_gen_ips").delete().eq("user_id", targetUserId);
    await admin.from("rejected_prompts").delete().eq("user_id", targetUserId);

    // Delete storage files in user's folder (recursive)
    const removeFolder = async (prefix: string) => {
      const { data: items } = await admin.storage.from("images").list(prefix, {
        limit: 1000,
      });
      if (!items || items.length === 0) return;
      const files: string[] = [];
      const subfolders: string[] = [];
      for (const item of items) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id === null || item.metadata === null) {
          subfolders.push(path);
        } else {
          files.push(path);
        }
      }
      if (files.length > 0) {
        await admin.storage.from("images").remove(files);
      }
      for (const sub of subfolders) {
        await removeFolder(sub);
      }
    };
    await removeFolder(targetUserId);

    // Reset credits to onboarding starting amount
    await admin
      .from("credits")
      .update({ balance: 100, updated_at: new Date().toISOString() })
      .eq("user_id", targetUserId);

    // Reset profile flags
    await admin
      .from("profiles")
      .update({
        onboarding_complete: false,
        has_claimed_free_gems: false,
        has_seen_welcome: false,
        has_seen_onboarding: false,
        has_used_free_gen: false,
        onboarding_face_regens_used: 0,
        onboarding_angle_regens_used: 0,
        onboarding_body_regens_used: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", targetUserId);

    // Invalidate the target user's existing sessions so their next visit lands on the
    // hero/login screen fresh instead of resuming mid-flow with stale local cache.
    try {
      await admin.auth.admin.signOut(targetUserId, "global");
      await admin.auth.admin.signOut(targetUserId);
    } catch (signOutErr) {
      console.warn("admin-reset-user signOut warning:", signOutErr);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-reset-user error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
