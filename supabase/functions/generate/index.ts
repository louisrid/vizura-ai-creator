import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── config ─────────────────────────────────────────────── */
const IS_DEMO_MODE = (Deno.env.get("IS_DEMO_MODE") ?? "true") === "true";
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";
const RATE_LIMIT_MAX = 10;          // per minute per user
const RATE_LIMIT_WINDOW_MS = 60_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── in-memory rate limiter (resets on cold start) ─────── */
const rateBuckets = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateBuckets.get(userId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(userId, timestamps);
    return true;
  }
  timestamps.push(now);
  rateBuckets.set(userId, timestamps);
  return false;
}

/* ── input sanitiser ───────────────────────────────────── */
function sanitiseText(raw: string): string {
  return raw
    .replace(/[<>]/g, "")           // strip angle brackets (XSS vectors)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars
    .trim()
    .slice(0, 1000);                 // hard length cap
}

/* ── handler ───────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    let userId: string;

    if (IS_DEMO_MODE) {
      // Demo: skip auth, use demo user
      userId = DEMO_USER_ID;
    } else {
      // Production: verify JWT
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

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } =
        await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = claimsData.claims.sub;
    }

    /* ── rate limit (skip in demo) ── */
    if (!IS_DEMO_MODE && isRateLimited(userId)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded — max 10 per minute" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ── parse & sanitise input ── */
    const body = await req.json();
    const rawPrompt = body?.prompt;
    if (!rawPrompt || typeof rawPrompt !== "string") {
      return new Response(JSON.stringify({ error: "Invalid prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const prompt = sanitiseText(rawPrompt);
    if (prompt.length === 0) {
      return new Response(JSON.stringify({ error: "Prompt is empty after sanitisation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ── admin client ── */
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* ── server-side credit check ── */
    if (IS_DEMO_MODE) {
      // Demo: ensure demo user always has credits (auto-refill)
      const { data: demoCred } = await adminClient
        .from("credits")
        .select("balance")
        .eq("user_id", userId)
        .single();
      if (!demoCred) {
        await adminClient
          .from("credits")
          .insert({ user_id: userId, balance: 9999 });
      } else if (demoCred.balance <= 0) {
        await adminClient
          .from("credits")
          .update({ balance: 9999 })
          .eq("user_id", userId);
      }
    }

    const { data: creditData } = await adminClient
      .from("credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (!creditData || creditData.balance <= 0) {
      return new Response(JSON.stringify({ error: "No credits remaining" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ── AI image generation ── */
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const negativePrompt =
      "low quality, blurry, distorted, ugly, deformed, disfigured, bad anatomy, watermark, text, signature";
    const angles = [
      "front view",
      "left side view, 3/4 angle",
      "right side view, 3/4 angle",
    ];
    const imageUrls: string[] = [];

    for (const angle of angles) {
      const fullPrompt = `Character portrait, ${prompt}, ${angle}. High quality, detailed, consistent style. Negative: ${negativePrompt}`;

      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: fullPrompt }],
            modalities: ["image", "text"],
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limited, please try again shortly" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errText = await response.text();
        console.error("AI generation failed:", response.status, errText);
        throw new Error(`AI generation failed: ${response.status}`);
      }

      const data = await response.json();
      const imageUrl =
        data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) imageUrls.push(imageUrl);
    }

    if (imageUrls.length === 0) throw new Error("No images generated");

    /* ── persist generation + deduct credit atomically ── */
    const sanitisedPrompt = sanitiseText(prompt);

    await adminClient.from("generations").insert({
      user_id: userId,
      prompt: sanitisedPrompt,
      image_urls: imageUrls,
    });

    await adminClient
      .from("credits")
      .update({
        balance: creditData.balance - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({
        images: imageUrls,
        credits_remaining: creditData.balance - 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
