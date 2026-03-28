import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── config ─────────────────────────────────────────────── */
const IS_DEMO_MODE = (Deno.env.get("IS_DEMO_MODE") ?? "true") === "true";
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── in-memory rate limiter ─────────────────────────────── */
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
    .replace(/[<>]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, 1000);
}

/* ── helper: get client IP ─────────────────────────────── */
function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/* ── helper: generate images via AI ────────────────────── */
async function generateImages(
  prompt: string,
  count: number,
  apiKey: string
): Promise<string[]> {
  const negativePrompt =
    "low quality, blurry, distorted, ugly, deformed, disfigured, bad anatomy, watermark, text, signature";

  const imageUrls: string[] = [];

  if (count <= 3) {
    const angles = [
      "front view",
      "left side view, 3/4 angle",
      "right side view, 3/4 angle",
    ];
    for (const angle of angles.slice(0, count)) {
      const fullPrompt = `Character portrait, ${prompt}, ${angle}. High quality, detailed, consistent style. Negative: ${negativePrompt}`;
      const url = await callAI(fullPrompt, apiKey);
      if (url) imageUrls.push(url);
    }
  } else {
    const variations = [
      "front view, soft smile",
      "front view, serious expression",
      "slight left turn, gentle expression",
      "slight right turn, confident look",
      "front view, playful expression",
      "front view, neutral expression",
    ];
    for (const variation of variations.slice(0, count)) {
      const fullPrompt = `Close-up face portrait, ${prompt}, ${variation}. High quality, detailed, consistent style. Negative: ${negativePrompt}`;
      const url = await callAI(fullPrompt, apiKey);
      if (url) imageUrls.push(url);
    }
  }

  return imageUrls;
}

async function callAI(fullPrompt: string, apiKey: string): Promise<string | null> {
  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
    if (response.status === 429 || response.status === 402) {
      throw { status: response.status };
    }
    const errText = await response.text();
    console.error("AI generation failed:", response.status, errText);
    throw new Error(`AI generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
}

/* ── handler ───────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    let userId: string;

    if (IS_DEMO_MODE) {
      userId = DEMO_USER_ID;
    } else {
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

    /* ── rate limit ── */
    if (!IS_DEMO_MODE && isRateLimited(userId)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded — max 10 per minute" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ── parse & sanitise input ── */
    const body = await req.json();
    const rawPrompt = body?.prompt;
    const isFreeGen = body?.free_gen === true;
    const imageCount = isFreeGen ? 6 : 3;

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

    /* ── FREE GENERATION FLOW ── */
    if (isFreeGen) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("has_used_free_gen")
        .eq("user_id", userId)
        .single();

      if (profile?.has_used_free_gen) {
        return new Response(
          JSON.stringify({ error: "Free generation already used", code: "FREE_GEN_USED" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const clientIp = getClientIp(req);
      if (clientIp !== "unknown") {
        const { data: existingIp } = await adminClient
          .from("free_gen_ips")
          .select("id")
          .eq("ip_address", clientIp)
          .maybeSingle();

        if (existingIp) {
          return new Response(
            JSON.stringify({ error: "Free generation already used from this network", code: "IP_USED" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      let imageUrls: string[];
      try {
        imageUrls = await generateImages(prompt, 6, LOVABLE_API_KEY);
      } catch (e: any) {
        if (e?.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limited, please try again shortly" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (e?.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw e;
      }

      if (imageUrls.length === 0) throw new Error("No images generated");

      await adminClient
        .from("profiles")
        .update({ has_used_free_gen: true })
        .eq("user_id", userId);

      if (clientIp !== "unknown") {
        await adminClient
          .from("free_gen_ips")
          .upsert({ ip_address: clientIp, user_id: userId }, { onConflict: "ip_address" });
      }

      await adminClient.from("generations").insert({
        user_id: userId,
        prompt: sanitiseText(prompt),
        image_urls: imageUrls,
      });

      return new Response(
        JSON.stringify({ images: imageUrls, free_gen: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ── STANDARD CREDIT-BASED FLOW ── */

    // Demo mode: unlimited credits
    if (IS_DEMO_MODE) {
      const { data: demoCred } = await adminClient
        .from("credits")
        .select("balance")
        .eq("user_id", userId)
        .single();
      if (!demoCred) {
        await adminClient.from("credits").insert({ user_id: userId, balance: 9999 });
      } else if (demoCred.balance <= 0) {
        await adminClient
          .from("credits")
          .update({ balance: 9999 })
          .eq("user_id", userId);
      }
    }

    // Check credits
    const { data: creditData } = await adminClient
      .from("credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (!creditData || creditData.balance <= 0) {
      // Check if user has active subscription to differentiate error
      const { data: subData } = await adminClient
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .single();

      const hasActiveSub = subData?.status === "active";

      return new Response(
        JSON.stringify({
          error: "No credits remaining",
          code: "NO_CREDITS",
          has_subscription: hasActiveSub,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Deduct 1 credit BEFORE generation
    await adminClient
      .from("credits")
      .update({
        balance: creditData.balance - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let imageUrls: string[];
    try {
      imageUrls = await generateImages(prompt, 3, LOVABLE_API_KEY);
    } catch (e: any) {
      // Refund credit on failure
      await adminClient
        .from("credits")
        .update({
          balance: creditData.balance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (e?.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (e?.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw e;
    }

    if (imageUrls.length === 0) {
      // Refund credit if no images generated
      await adminClient
        .from("credits")
        .update({
          balance: creditData.balance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      throw new Error("No images generated");
    }

    await adminClient.from("generations").insert({
      user_id: userId,
      prompt: sanitiseText(prompt),
      image_urls: imageUrls,
    });

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
