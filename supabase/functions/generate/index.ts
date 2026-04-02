import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── config ─────────────────────────────────────────────── */
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── prompt constants ──────────────────────────────────── */
const QUALITY_SUFFIX =
  "photorealistic, iPhone photo quality, natural lighting, real skin texture with visible pores, natural skin imperfections, everything in focus, casual unposed energy, slight sensor noise grain";

const NEGATIVE_INSTRUCTION =
  "Do not generate DSLR, bokeh, studio lighting, airbrushed skin, smooth plastic skin, watermark, text, deformed hands, extra fingers, or AI generated look.";

const SELFIE_PREFIX =
  "front camera perspective, slight wide angle distortion, casual angle, arm extended, iPhone selfie";

const PHOTO_PREFIX =
  "third person framing, composed perspective, natural photography angle";

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

/* ── trait mapping ─────────────────────────────────────── */
const SKIN_MAP: Record<string, string> = {
  pale: "pale fair skin",
  tan: "tanned warm skin",
  asian: "asian skin tone",
  dark: "dark skin",
};

const BODY_MAP: Record<string, string> = {
  slim: "slim petite frame",
  average: "average build",
  curvy: "curvy voluptuous figure",
};

const MAKEUP_MAP: Record<string, string> = {
  natural: "natural minimal makeup fresh-faced",
  classic: "classic polished makeup defined features",
  egirl: "egirl style makeup bold eyeliner colorful accents",
};

function ageToDescription(ageStr: string): string {
  const num = parseInt(ageStr, 10);
  if (isNaN(num) || num <= 23) return "youthful round soft features, baby face, smooth skin, soft jawline, full cheeks";
  if (num <= 28) return "young adult features, slightly more defined cheekbones and jawline, still youthful skin";
  return "mature defined features, prominent cheekbones, defined jawline, confident composed expression";
}

/* ── build character trait string from DB record ───────── */
function buildCharacterTraits(char: any): string {
  const parts: string[] = [];

  // Age
  if (char.age) {
    parts.push(`${char.age} year old woman`);
    parts.push(ageToDescription(char.age));
  }

  // Skin
  const skinKey = (char.country || "").toLowerCase();
  if (skinKey && skinKey !== "any") {
    parts.push(SKIN_MAP[skinKey] || `${skinKey} skin`);
  }

  // Body
  const bodyKey = (char.body || "").toLowerCase();
  if (bodyKey && bodyKey !== "regular") {
    parts.push(BODY_MAP[bodyKey] || `${bodyKey} body type`);
  }

  // Hair - combine style from description + colour
  const hairStyleMatch = char.description?.match(/^(.*?)\s*hair\./i);
  const hairStyle = hairStyleMatch?.[1]?.trim() || "";
  const hairColour = char.hair || "";
  if (hairStyle || hairColour) {
    parts.push(`${hairStyle} ${hairColour} hair`.trim());
  }

  // Eyes
  if (char.eye) {
    parts.push(`bright ${char.eye} eyes`);
  }

  // Makeup
  const makeupKey = (char.style || "").toLowerCase();
  if (makeupKey) {
    parts.push(MAKEUP_MAP[makeupKey] || `${makeupKey} makeup`);
  }

  // Additional description (cleaned)
  if (char.description) {
    let desc = char.description.replace(/^.*?hair\.\s*/i, "").replace(/\[emoji:.+?\]/g, "").trim();
    if (desc) parts.push(desc);
  }

  return parts.join(", ");
}

/* ── build final prompt with all modifiers ─────────────── */
function buildFinalPrompt(
  scenePrompt: string,
  photoType: string,
  characterTraits: string | null,
): string {
  const perspective = photoType === "selfie" ? SELFIE_PREFIX : PHOTO_PREFIX;
  const parts: string[] = [];

  if (characterTraits) parts.push(characterTraits);
  parts.push(scenePrompt);
  parts.push(perspective);
  parts.push(QUALITY_SUFFIX);
  parts.push(NEGATIVE_INSTRUCTION);

  return parts.join(". ");
}

/* ── xAI Grok: text-to-image ──────────────────────────── */
async function xaiTextToImage(prompt: string, apiKey: string, aspectRatio = "3:4"): Promise<string | null> {
  // Map aspect ratio format for xAI API
  const ratioMap: Record<string, string> = {
    "3:4": "3:4",
    "9:16": "9:16",
    "4:5": "3:4",
  };
  const ratio = ratioMap[aspectRatio] || "3:4";

  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-2-image",
      prompt,
      response_format: "url",
      n: 1,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw { status: 429 };
    if (response.status === 402) throw { status: 402 };
    const errText = await response.text();
    console.error("xAI text-to-image failed:", response.status, errText);
    throw new Error(`xAI generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data?.data?.[0]?.url ?? null;
}

/* ── xAI Grok: image edit with references ─────── */
async function xaiImageEdit(
  prompt: string,
  imageUrls: string[],
  apiKey: string,
  aspectRatio = "3:4"
): Promise<string | null> {
  // Build multimodal messages for chat-based image editing
  const content: any[] = [];
  for (const url of imageUrls) {
    content.push({ type: "image_url", image_url: { url } });
  }
  content.push({ type: "text", text: prompt });

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-2-image",
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw { status: 429 };
    if (response.status === 402) throw { status: 402 };
    const errText = await response.text();
    console.error("xAI image-edit failed:", response.status, errText);
    throw new Error(`xAI image edit failed: ${response.status}`);
  }

  const data = await response.json();
  // Extract URL from response - grok-2-image returns image URLs in choices
  const choice = data?.choices?.[0];
  if (choice?.message?.content) {
    // Try to find URL in content
    const urlMatch = choice.message.content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    if (urlMatch) return urlMatch[1];
    // Or it might be a direct URL
    if (choice.message.content.startsWith("http")) return choice.message.content.trim();
  }
  // Fallback: check for image in content array
  if (Array.isArray(choice?.message?.content)) {
    for (const item of choice.message.content) {
      if (item.type === "image_url") return item.image_url?.url;
    }
  }
  return null;
}

/* ── generate face options (text-to-image, always 3:4) ── */
async function generateFaceImages(
  prompt: string,
  count: number,
  apiKey: string
): Promise<string[]> {
  const imageUrls: string[] = [];
  const angles = ["front view portrait", "slight left 3/4 angle portrait", "slight right 3/4 angle portrait"];

  for (let i = 0; i < Math.min(count, 3); i++) {
    const angle = angles[i] || "front view portrait";
    const fullPrompt = `${prompt}, ${angle}, close-up face and shoulders, ${QUALITY_SUFFIX}. ${NEGATIVE_INSTRUCTION}`;
    console.log(`Face gen ${i + 1}:`, fullPrompt);
    try {
      const url = await xaiTextToImage(fullPrompt, apiKey, "3:4");
      if (url) imageUrls.push(url);
    } catch (e) {
      console.error(`Face gen ${i + 1} failed:`, e);
      throw e;
    }
  }

  return imageUrls;
}

/* ── generate photo (scene-based, with character traits + modifiers) ── */
async function generatePhoto(
  finalPrompt: string,
  faceImageUrl: string | null,
  apiKey: string,
  aspectRatio: string,
): Promise<string | null> {
  if (faceImageUrl) {
    return await xaiImageEdit(finalPrompt, [faceImageUrl], apiKey, aspectRatio);
  }
  return await xaiTextToImage(finalPrompt, apiKey, aspectRatio);
}

/* ── handler ───────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

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

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    /* ── rate limit ── */
    if (isRateLimited(userId)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded — max 10 per minute" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ── parse & sanitise input ── */
    const body = await req.json();
    const rawPrompt = body?.prompt;
    const isFreeGen = body?.free_gen === true;
    const characterId = body?.character_id || null;
    const photoType = body?.photo_type || "selfie";
    const aspectRatio = body?.aspect_ratio || "3:4";

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

    /* ── look up character if provided ── */
    let characterTraits: string | null = null;
    let faceImageUrl: string | null = null;
    if (characterId) {
      const { data: charData } = await adminClient
        .from("characters")
        .select("*")
        .eq("id", characterId)
        .eq("user_id", userId)
        .single();

      if (charData) {
        characterTraits = buildCharacterTraits(charData);
        faceImageUrl = charData.face_image_url || null;
      }
    }

    /* ── FREE GENERATION FLOW (face creation — no gem cost) ── */
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

      const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
      if (!XAI_API_KEY) throw new Error("XAI_API_KEY is not configured");

      let imageUrls: string[];
      try {
        imageUrls = await generateFaceImages(prompt, 3, XAI_API_KEY);
      } catch (e: any) {
        if (e?.status === 429) {
          return new Response(
            JSON.stringify({ error: "generation failed, please try again" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (e?.status === 402) {
          return new Response(
            JSON.stringify({ error: "generation failed, please try again" }),
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

    /* ── STANDARD GEM-BASED FLOW ── */
    const { data: creditData } = await adminClient
      .from("credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (!creditData || creditData.balance <= 0) {
      const { data: subData } = await adminClient
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .single();

      return new Response(
        JSON.stringify({
          error: "No gems remaining",
          code: "NO_GEMS",
          has_subscription: subData?.status === "active",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct 1 gem BEFORE generation
    await adminClient
      .from("credits")
      .update({
        balance: creditData.balance - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) throw new Error("XAI_API_KEY is not configured");

    // Determine if this is a face regen or photo gen
    const isFaceRegen = body?.face_regen === true;

    let imageUrls: string[];
    try {
      if (isFaceRegen) {
        // Face regeneration: generate 3 new face options
        imageUrls = await generateFaceImages(prompt, 3, XAI_API_KEY);
      } else {
        // Photo generation
        const finalPrompt = buildFinalPrompt(prompt, photoType, characterTraits);
        console.log("Final prompt:", finalPrompt);
        console.log("Aspect ratio:", aspectRatio, "| Photo type:", photoType, "| Character:", characterId);

        const result = await generatePhoto(finalPrompt, faceImageUrl, XAI_API_KEY, aspectRatio);
        imageUrls = result ? [result] : [];
      }
    } catch (e: any) {
      // Refund gem on failure
      await adminClient
        .from("credits")
        .update({
          balance: creditData.balance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (e?.status === 429 || e?.status === 402) {
        return new Response(
          JSON.stringify({ error: "generation failed, please try again" }),
          { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Generation error:", e);
      return new Response(
        JSON.stringify({ error: "generation failed, please try again" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (imageUrls.length === 0) {
      // Refund gem if no images generated
      await adminClient
        .from("credits")
        .update({
          balance: creditData.balance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      return new Response(
        JSON.stringify({ error: "generation failed, please try again" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isFaceRegen) {
      await adminClient.from("generations").insert({
        user_id: userId,
        prompt: sanitiseText(prompt),
        image_urls: imageUrls,
      });
    }

    return new Response(
      JSON.stringify({
        images: imageUrls,
        gems_remaining: creditData.balance - 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate error:", e);
    return new Response(
      JSON.stringify({ error: "generation failed, please try again" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
