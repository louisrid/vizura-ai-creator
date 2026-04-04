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
  "Do not generate DSLR, bokeh, studio lighting, airbrushed skin, smooth plastic skin, watermark, text, deformed hands, extra fingers, or AI generated look. Always clothed unless prompt explicitly specifies otherwise.";

const SELFIE_PREFIX =
  "front camera perspective, slight wide angle distortion, casual angle, arm extended, iPhone selfie";

const PHOTO_PREFIX =
  "third person framing, composed perspective, natural photography angle";

/* ── face generation quality prompt ─────────────────────── */
const FACE_QUALITY =
  "professional passport photo, front-facing headshot, plain white background, centred in frame, head and top of shoulders visible, wearing a plain white crew neck t-shirt, happy pleasant smile or soft neutral expression, even soft lighting, looking directly at camera, no shadows on background, consistent framing, photorealistic portrait, high resolution, iPhone quality natural photo";

const FACE_NEGATIVE =
  "Do not generate ugly, overweight face, fat face, chubby face, aged appearance, wrinkles, frowning, moody expression, angry expression, sad expression, bare shoulders, no clothing, naked, deformed, blurry, low quality, cartoon, anime, painting, illustration, drawing, text, watermark, busy background, colored background, outdoor background, extra fingers, mutated, disfigured, bad anatomy, AI generated look, DSLR, bokeh, studio lighting, airbrushed skin, smooth plastic skin.";

const XAI_IMAGE_MODEL = "grok-imagine-image";

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
  white: "pale fair skin",
  pale: "pale fair skin",
  tan: "tanned warm skin",
  asian: "asian skin tone",
  black: "dark skin",
  dark: "dark skin",
};

const BODY_MAP: Record<string, string> = {
  slim: "slim toned body, smaller chest, narrow waist, lean face",
  regular: "soft feminine body, large bust DD, defined waist, soft face",
  average: "soft feminine body, large bust DD, defined waist, soft face",
  curvy: "curvy full figure, very large bust G-H cup, wide hips, fuller face but still attractive",
  thick: "curvy full figure, very large bust G-H cup, wide hips, fuller face but still attractive",
};

const MAKEUP_MAP: Record<string, string> = {
  natural: "natural minimal makeup fresh-faced",
  classic: "classic polished makeup defined features",
  glam: "classic polished makeup defined features",
  model: "classic polished makeup defined features",
};

function ageToDescription(ageStr: string): string {
  const num = parseInt(ageStr, 10);
  if (isNaN(num) || num <= 23) return "young fresh face, soft youthful bone structure, smooth skin, modern young vibe, very youthful baby face, soft round cheeks, small delicate chin, wide doe eyes, soft undefined jawline, smooth plump skin, teenage to early twenties look, gen-z youthful energy, looks like she just turned 18-19, no mature features";
  if (num <= 28) return "youthful features, soft jawline, full cheeks, smooth skin, young-looking face, early twenties appearance, still baby-faced but slightly more defined";
  return "young adult features, slightly more defined cheekbones, still youthful skin, mid twenties look, subtle maturity";
}

/* ── build character trait string from DB record ───────── */
function buildCharacterTraits(char: any): string {
  const parts: string[] = [];

  if (char.age) {
    parts.push(`${char.age} year old woman`);
    parts.push(ageToDescription(char.age));
  }

  const skinKey = (char.country || "").toLowerCase();
  if (skinKey && skinKey !== "any") {
    parts.push(SKIN_MAP[skinKey] || `${skinKey} skin`);
  }

  const bodyKey = (char.body || "regular").toLowerCase();
  parts.push(BODY_MAP[bodyKey] || BODY_MAP.regular);

  if (bodyKey === "slim") {
    parts.push("lean angular face, no roundness or puffiness in face");
  } else if (bodyKey === "regular" || bodyKey === "average") {
    parts.push("soft face but not fat, no round chubby face");
  }

  const hairStyleMatch = char.description?.match(/^(.*?)\s*hair\./i);
  let hairStyle = hairStyleMatch?.[1]?.trim() || "";
  const hairColour = char.hair || "";
  if (hairStyle.toLowerCase() === "bangs") {
    parts.push(`long ${hairColour} hair with straight-across bangs fringe, long flowing hair past the shoulders with a full straight fringe across the forehead`.trim());
  } else if (hairStyle || hairColour) {
    parts.push(`${hairStyle} ${hairColour} hair`.trim());
  }

  if (char.eye) {
    parts.push(`bright ${char.eye} eyes`);
  }

  const makeupKey = (char.style || "").toLowerCase();
  if (makeupKey) {
    parts.push(MAKEUP_MAP[makeupKey] || `${makeupKey} makeup`);
  }

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

  if (characterTraits) parts.push(`Generate a photo of the woman shown in the reference images. She has: ${characterTraits}`);
  parts.push(scenePrompt);
  parts.push(perspective);
  parts.push(QUALITY_SUFFIX);
  parts.push(NEGATIVE_INSTRUCTION);

  return parts.join(". ");
}

/* ── check for content policy errors ───────────────────── */
function isContentPolicyError(status: number, text: string): boolean {
  if (status !== 400) return false;
  const lower = text.toLowerCase();
  return lower.includes("safety") || lower.includes("content policy") || lower.includes("blocked") || lower.includes("moderation");
}

/* ── download image and store permanently ─────────────── */
async function storeImagePermanently(
  imageUrl: string,
  userId: string,
  adminClient: any,
  prefix = "gen"
): Promise<string> {
  try {
    console.log("Downloading image for permanent storage:", imageUrl.slice(0, 80));
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error("Failed to download image:", response.status);
      return imageUrl;
    }
    const blob = await response.blob();
    const ext = "png";
    const filename = `${userId}/${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await adminClient.storage
      .from("images")
      .upload(filename, blob, { contentType: "image/png", upsert: false });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return imageUrl;
    }

    const { data: publicData } = adminClient.storage.from("images").getPublicUrl(filename);
    console.log("Stored permanently:", publicData.publicUrl?.slice(0, 80));
    return publicData.publicUrl;
  } catch (e) {
    console.error("storeImagePermanently error:", e);
    return imageUrl;
  }
}

/* ── xAI Grok: text-to-image ──────────────────────────── */
async function xaiTextToImage(prompt: string, apiKey: string): Promise<string | null> {
  console.log("xaiTextToImage calling:", prompt.slice(0, 120));

  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: XAI_IMAGE_MODEL,
      prompt,
      n: 1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("xAI text-to-image error:", response.status, errText);
    if (response.status === 429) throw { status: 429 };
    if (response.status === 402) throw { status: 402 };
    if (isContentPolicyError(response.status, errText)) {
      throw { status: 400, contentPolicy: true };
    }
    throw new Error(`xAI generation failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  console.log("xAI response keys:", Object.keys(data));
  return data?.data?.[0]?.url ?? null;
}

/* ── xAI Grok: image edit with references ─────── */
async function xaiImageEdit(
  prompt: string,
  imageUrls: string[],
  apiKey: string,
  aspectRatio = "3:4"
): Promise<string | null> {
  console.log("xaiImageEdit calling with", imageUrls.length, "reference images");

  // xAI API: use `image` for single, `images` for multiple — each is { url: "..." }
  const body: Record<string, unknown> = {
    model: XAI_IMAGE_MODEL,
    prompt,
    n: 1,
  };

  if (imageUrls.length === 1) {
    body.image = { url: imageUrls[0] };
  } else {
    body.images = imageUrls.map((url) => ({ url }));
  }

  // Only set aspect_ratio for supported values
  const SUPPORTED_RATIOS = new Set([
    "1:1","3:4","4:3","9:16","16:9","2:3","3:2","9:19.5","19.5:9","9:20","20:9","1:2","2:1","auto"
  ]);
  body.aspect_ratio = SUPPORTED_RATIOS.has(aspectRatio) ? aspectRatio : "3:4";

  const response = await fetch("https://api.x.ai/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("xAI image-edit error:", response.status, errText);
    if (response.status === 429) throw { status: 429 };
    if (response.status === 402) throw { status: 402 };
    if (isContentPolicyError(response.status, errText)) {
      throw { status: 400, contentPolicy: true };
    }
    throw new Error(`xAI image edit failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  console.log("xAI edit response keys:", Object.keys(data));
  return data?.data?.[0]?.url ?? null;
}

/* ── generate face options (text-to-image, always 3:4) ── */
async function generateFaceImages(
  prompt: string,
  count: number,
  apiKey: string,
  adminClient: any,
  userId: string
): Promise<string[]> {
  const variations = [
    "diamond face shape, high cheekbones, pointed chin, full lips, small upturned nose, large almond eyes, thin arched eyebrows, hair flowing over shoulders clearly visible",
    "oval face, defined cupid's bow lips, straight nose, sharp cheekbones, hooded eyes, angular jaw, hair swept to one side over shoulder clearly visible",
    "heart-shaped face, plump bow lips, button nose, wide bright eyes, soft jawline, hair parted in middle falling on both sides clearly visible",
  ];

  const beautyCore = "extremely attractive gorgeous woman, instagram model beauty, stunningly beautiful, slim face, clear glowing skin, well-styled hair clearly visible and not hidden, modern youthful look, happy pleasant expression or soft gentle smile, wearing a plain white crew neck t-shirt";

  const imageUrls: string[] = [];
  const targetCount = Math.min(count, 3);

  // Generate faces sequentially to avoid rate limits and timeouts
  for (let i = 0; i < targetCount; i++) {
    const variation = variations[i] || variations[0];
    const fullPrompt = `${prompt}, ${beautyCore}, ${variation}, ${FACE_QUALITY}. ${FACE_NEGATIVE}`;
    console.log(`Face gen ${i + 1}/${targetCount} starting...`);

    let retries = 0;
    const maxRetries = 2;
    while (retries <= maxRetries) {
      try {
        const url = await xaiTextToImage(fullPrompt, apiKey);
        if (!url) {
          console.error(`Face ${i + 1}: no URL returned`);
          if (retries < maxRetries) { retries++; continue; }
          break;
        }
        const permanentUrl = await storeImagePermanently(url, userId, adminClient, `face_${i + 1}`);
        imageUrls.push(permanentUrl);
        console.log(`Face ${i + 1} done: ${permanentUrl.slice(0, 80)}`);
        break;
      } catch (e: any) {
        console.error(`Face ${i + 1} attempt ${retries + 1} failed:`, e?.message || e);
        if (e?.contentPolicy) throw e;
        if (e?.status === 429) {
          // Rate limited — wait a bit and retry
          console.log("Rate limited, waiting 3s...");
          await new Promise(r => setTimeout(r, 3000));
          retries++;
          continue;
        }
        if (retries < maxRetries) {
          retries++;
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        console.error(`Face ${i + 1} failed after ${maxRetries + 1} attempts`);
        break;
      }
    }
  }

  console.log(`generateFaceImages complete: ${imageUrls.length}/${targetCount} faces generated`);
  return imageUrls;
}

/* ── body-type descriptor for full-body anchor ─────────── */
const BODY_ANCHOR_MAP: Record<string, string> = {
  slim: "slim toned body, smaller chest, narrow waist",
  regular: "soft feminine body, large bust, defined waist",
  average: "soft feminine body, large bust, defined waist",
  curvy: "curvy full body, very large bust, wide hips",
  thick: "curvy full body, very large bust, wide hips",
};

/* ── generate 3/4 angle + full-body anchor from reference face ── */
async function generateAngleAndBody(
  faceUrl: string,
  characterTraits: string,
  bodyType: string,
  apiKey: string,
  adminClient: any,
  userId: string
): Promise<{ angleUrl: string | null; bodyAnchorUrl: string | null }> {
  let angleUrl: string | null = null;
  let bodyAnchorUrl: string | null = null;

  try {
    console.log("Generating 3/4 angle...");
    const anglePrompt = `Same person exactly as in the reference image, three-quarter angle view, slight turn to the right, wearing white crew neck t-shirt, plain white background, passport photo style, head and top of shoulders only, ${characterTraits}. ${FACE_QUALITY}. ${FACE_NEGATIVE}`;
    const angleResult = await xaiImageEdit(anglePrompt, [faceUrl], apiKey, "3:4");
    if (angleResult) {
      angleUrl = await storeImagePermanently(angleResult, userId, adminClient, "angle");
      console.log("Angle generated:", angleUrl?.slice(0, 80));
    }
  } catch (e) {
    console.error("3/4 angle generation failed:", e);
  }

  try {
    console.log("Generating full-body anchor...");
    const bodyDesc = BODY_ANCHOR_MAP[(bodyType || "regular").toLowerCase()] || BODY_ANCHOR_MAP.regular;
    const bodyPrompt = `Same person exactly as in the reference image, full body head to toe, neutral standing pose, white crew neck t-shirt and blue jeans, white background, ${bodyDesc}, ${characterTraits}, photorealistic, natural lighting. ${FACE_NEGATIVE}`;
    const bodyResult = await xaiImageEdit(bodyPrompt, [faceUrl], apiKey, "2:3");
    if (bodyResult) {
      bodyAnchorUrl = await storeImagePermanently(bodyResult, userId, adminClient, "body");
      console.log("Body anchor generated:", bodyAnchorUrl?.slice(0, 80));
    }
  } catch (e) {
    console.error("Full-body anchor generation failed:", e);
  }

  return { angleUrl, bodyAnchorUrl };
}

/* ── map aspect ratio to xAI-supported values ─────────── */
const SUPPORTED_RATIOS_SET = new Set([
  "1:1","3:4","4:3","9:16","16:9","2:3","3:2","9:19.5","19.5:9","9:20","20:9","1:2","2:1","auto"
]);
function mapAspectRatio(ratio: string): string {
  if (SUPPORTED_RATIOS_SET.has(ratio)) return ratio;
  if (ratio === "4:5") return "3:4";
  if (ratio === "5:4") return "4:3";
  return "3:4";
}

/* ── generate photo (scene-based, with character traits + modifiers) ── */
async function generatePhoto(
  finalPrompt: string,
  faceImageUrls: string[],
  apiKey: string,
  aspectRatio: string,
): Promise<string | null> {
  const safeRatio = mapAspectRatio(aspectRatio);
  if (faceImageUrls.length > 0) {
    return await xaiImageEdit(finalPrompt, faceImageUrls, apiKey, safeRatio);
  }
  return await xaiTextToImage(finalPrompt, apiKey);
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

    if (isRateLimited(userId)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded — max 10 per minute" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const rawPrompt = body?.prompt;
    const isFreeGen = body?.free_gen === true;
    const characterId = body?.character_id || null;
    const photoType = body?.photo_type || "selfie";
    const aspectRatio = body?.aspect_ratio || "3:4";
    const generateAngles = body?.generate_angles === true;
    const selectedFaceUrl = body?.selected_face_url || null;
    const angleCharacterId = body?.angle_character_id || null;
    const vibeReferenceUrl = body?.vibe_reference_url || null;

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

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* ── ANGLE + BODY GENERATION FLOW ── */
    const bodyTypeInput = body?.body_type || "regular";
    if (generateAngles && selectedFaceUrl) {
      console.log("=== ANGLE + BODY GENERATION ===");
      console.log("Face URL:", selectedFaceUrl.slice(0, 80));
      console.log("Body type:", bodyTypeInput);

      // If character_id provided, build rich traits from DB
      let traits = prompt;
      if (angleCharacterId) {
        const { data: charData } = await adminClient
          .from("characters")
          .select("*")
          .eq("id", angleCharacterId)
          .eq("user_id", userId)
          .single();
        if (charData) {
          traits = buildCharacterTraits(charData);
          console.log("Built character traits from DB:", traits.slice(0, 120));
        }
      }

      const { angleUrl, bodyAnchorUrl } = await generateAngleAndBody(
        selectedFaceUrl, traits, bodyTypeInput, Deno.env.get("XAI_API_KEY")!, adminClient, userId
      );
      console.log("Angle result:", angleUrl?.slice(0, 60) || "null");
      console.log("Body result:", bodyAnchorUrl?.slice(0, 60) || "null");

      return new Response(
        JSON.stringify({ angle_url: angleUrl, body_anchor_url: bodyAnchorUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ── look up character if provided ── */
    let characterTraits: string | null = null;
    let faceImageUrls: string[] = [];
    if (characterId) {
      const { data: charData } = await adminClient
        .from("characters")
        .select("*")
        .eq("id", characterId)
        .eq("user_id", userId)
        .single();

      if (charData) {
        characterTraits = buildCharacterTraits(charData);
        if (charData.face_image_url) faceImageUrls.push(charData.face_image_url);
        if (charData.face_angle_url) faceImageUrls.push(charData.face_angle_url);
        if (charData.body_anchor_url) faceImageUrls.push(charData.body_anchor_url);
      }
    }

    if (vibeReferenceUrl) {
      faceImageUrls.push(vibeReferenceUrl);
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
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
      if (!XAI_API_KEY) throw new Error("XAI_API_KEY is not configured");

      let imageUrls: string[];
      try {
        imageUrls = await generateFaceImages(prompt, 3, XAI_API_KEY, adminClient, userId);
      } catch (e: any) {
        if (e?.contentPolicy) {
          return new Response(
            JSON.stringify({ error: "please adjust your description and try again", code: "CONTENT_POLICY" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (e?.status === 429 || e?.status === 402) {
          return new Response(
            JSON.stringify({ error: "generation failed, please try again" }),
            { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await adminClient
      .from("credits")
      .update({
        balance: creditData.balance - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) throw new Error("XAI_API_KEY is not configured");

    const isFaceRegen = body?.face_regen === true;

    let imageUrls: string[];
    try {
      if (isFaceRegen) {
        imageUrls = await generateFaceImages(prompt, 3, XAI_API_KEY, adminClient, userId);
      } else {
        const finalPrompt = buildFinalPrompt(prompt, photoType, characterTraits);
        console.log("Final prompt:", finalPrompt.slice(0, 200));
        console.log("Aspect ratio:", aspectRatio, "| Photo type:", photoType, "| Character:", characterId);
        console.log("Face references:", faceImageUrls.length);

        const result = await generatePhoto(finalPrompt, faceImageUrls, XAI_API_KEY, aspectRatio);
        if (result) {
          const permanentUrl = await storeImagePermanently(result, userId, adminClient, "photo");
          imageUrls = [permanentUrl];
        } else {
          imageUrls = [];
        }
      }
    } catch (e: any) {
      await adminClient
        .from("credits")
        .update({
          balance: creditData.balance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (e?.contentPolicy) {
        return new Response(
          JSON.stringify({ error: "please adjust your description and try again", code: "CONTENT_POLICY" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
