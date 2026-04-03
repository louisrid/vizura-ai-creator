import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPECIAL_EMAIL = "louisjridland@gmail.com";
const DEFAULT_PASSWORD = "Testing123!";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email = SPECIAL_EMAIL, password = DEFAULT_PASSWORD } = await req.json().catch(() => ({}));

    if (String(email).trim().toLowerCase() !== SPECIAL_EMAIL) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let existingUser: { id: string } | null = null;
    let page = 1;

    while (!existingUser) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;

      existingUser = data.users.find((user) => user.email?.trim().toLowerCase() === SPECIAL_EMAIL) ?? null;

      if (existingUser || data.users.length < 200) break;
      page += 1;
    }

    if (existingUser) {
      const { error } = await admin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
      });
      if (error) throw error;
    } else {
      const { error } = await admin.auth.admin.createUser({
        email: SPECIAL_EMAIL,
        password,
        email_confirm: true,
      });
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});