import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PREVIEW_EMAIL_DOMAIN = "@preview.vizura.app";
const DEFAULT_PASSWORD = "Testing123!";
const PLACEHOLDER_IMAGE_URL = "/placeholder.svg";

const normaliseEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();

const isAllowedPreviewEmail = (value: string) => value.endsWith(PREVIEW_EMAIL_DOMAIN) && value.startsWith("preview-");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email = `preview-default${PREVIEW_EMAIL_DOMAIN}`, password = DEFAULT_PASSWORD } = await req.json().catch(() => ({}));
    const normalisedEmail = normaliseEmail(email);

    if (!isAllowedPreviewEmail(normalisedEmail)) {
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

      existingUser = data.users.find((user) => normaliseEmail(user.email) === normalisedEmail) ?? null;

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
      const { data, error } = await admin.auth.admin.createUser({
        email: normalisedEmail,
        password,
        email_confirm: true,
      });
      if (error) throw error;

      existingUser = { id: data.user.id };
    }

    if (!existingUser) {
      throw new Error("failed to resolve preview user");
    }

    const userId = existingUser.id;

    const { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    if (profileError) throw profileError;
    if (!profileRows?.length) {
      const { error } = await admin.from("profiles").insert({
        user_id: userId,
        email: normalisedEmail,
      });
      if (error) throw error;
    }

    const { data: creditRows, error: creditsError } = await admin
      .from("credits")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    if (creditsError) throw creditsError;
    if (!creditRows?.length) {
      const { error } = await admin.from("credits").insert({
        user_id: userId,
        balance: 1000,
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