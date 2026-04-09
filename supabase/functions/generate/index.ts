import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── config ─────────────────────────────────────────────── */
const BETA_MODE = true; // When true, whitelisted emails get free unlimited access
const BETA_WHITELIST = ["louisjridland@gmail.com"];
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const XAI_REQUEST_TIMEOUT_MS = 120_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── prompt constants ──────────────────────────────────── */
const SELFIE_PREFIX =
  "iPhone selfie taken with front camera, one hand holding the phone at arms length, casual angle, everything in focus";

const PHOTO_PREFIX =
  "third person framing, composed perspective, natural photography angle";

/* ── face generation quality prompt ─────────────────────── */
const FACE_QUALITY =
  "passport photo, plain white background, face and upper shoulders centred with space above head, white t-shirt at neckline, soft even lighting, looking at camera, sharp focus, skin with visible pores, small-forehead";

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

/* ── logging helpers ───────────────────────────────────── */
async function logGeneration(
  adminClient: any,
  userId: string,
  characterId: string | null,
  promptText: string,
  generationType: string,
  gemsCost: number,
  success: boolean,
  errorMessage: string | null = null,
) {
  try {
    await adminClient.from("generation_logs").insert({
      user_id: userId,
      character_id: characterId || null,
      prompt_text: (promptText || "").slice(0, 2000),
      generation_type: generationType,
      gems_cost: gemsCost,
      success,
      error_message: errorMessage ? errorMessage.slice(0, 1000) : null,
    });
  } catch (e) {
    console.warn("Failed to log generation:", e);
  }
}

async function logRejectedPrompt(adminClient: any, userId: string, promptText: string) {
  try {
    await adminClient.from("rejected_prompts").insert({
      user_id: userId,
      prompt_text: (promptText || "").slice(0, 2000),
    });
  } catch (e) {
    console.warn("Failed to log rejected prompt:", e);
  }
}

/* ── trait mapping ─────────────────────────────────────── */
const SKIN_MAP: Record<string, string> = {
  white: "fair skin with warm undertone",
  pale: "pale fair skin",
  tan: "tanned warm skin",
  asian: "asian skin tone",
  black: "rich dark skin with natural healthy glow",
  dark: "rich dark skin with natural healthy glow",
};

const BODY_MAP: Record<string, string> = {
  slim: "slim toned body, smaller chest, narrow waist, lean face",
  regular: "soft feminine body, large bust DD, defined waist, soft face",
  average: "soft feminine body, large bust DD, defined waist, soft face",
  curvy: "curvy full figure, very large bust G-H cup, wide hips, fuller face but still attractive",
  thick: "curvy full figure, very large bust G-H cup, wide hips, fuller face but still attractive",
};

const MAKEUP_MAP: Record<string, string> = {
  natural: "natural minimal makeup with visible lip gloss and subtle mascara",
  classic: "classic polished makeup with defined eyeliner, mascara, subtle contour, lip colour",
};

function ageToDescription(ageStr: string): string {
  const num = parseInt(ageStr, 10);
  if (isNaN(num) || num <= 24) return "18 year old young-woman, round soft face, uniform fullness across face, full chubby cheeks covering cheekbones, big bright eyes, small button nose, plump lips, smooth even skin, soft jaw blending into neck, small smooth chin, compact features, average width face";
  return "24 year old woman, visible cheekbones, clean jawline, balanced distinct features, clear skin, structured feminine face";
}

function extractXaiImageUrl(data: any): string | null {
  const candidates = [
    data?.data?.[0]?.url,
    data?.images?.[0]?.url,
    data?.output?.[0]?.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

function stripFacePromptBodyLanguage(prompt: string): string {
  return prompt
    .replace(/\b(?:slim|average|regular|curvy|thick)\s+body\s+type\b/gi, "")
    .replace(/\b(?:small|medium|large)\s+chest\b/gi, "")
    .replace(/\b(?:large\s+bust(?:\s+[a-z-]+)?|smaller\s+chest|wide\s+hips|defined\s+waist|narrow\s+waist|g-h\s+cup|dd)\b/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/,{2,}/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^,|,$/g, "");
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
  const mappedHairColour = hairColour.toLowerCase() === "blonde" ? "cool white-blonde" : hairColour;
  if (hairStyle.toLowerCase() === "bangs") {
    parts.push(`long ${mappedHairColour} hair draped over shoulders onto chest with soft curtain-parted bangs framing face, IMPORTANT: hair must be long draped over shoulders in every image`.trim());
  } else if (hairStyle.toLowerCase() === "straight") {
    const frameChance = Math.random() < 0.33 ? " with thick face-framing layers falling beside cheeks" : "";
    parts.push(`long straight ${mappedHairColour} hair${frameChance}, draped over shoulders onto chest, naturally parted, IMPORTANT: hair must be long draped over shoulders in every image`.trim());
  } else if (hairStyle.toLowerCase() === "curly" || hairStyle.toLowerCase() === "wavy") {
    parts.push(`long ${mappedHairColour} hair with soft voluminous waves draped over shoulders onto chest, IMPORTANT: hair must be long draped over shoulders in every image`.trim());
  } else if (hairStyle || hairColour) {
    parts.push(`long ${hairStyle} ${mappedHairColour} hair draped over shoulders onto chest`.trim());
  }
  
  if (char.eye) {
    const eyeColour = char.eye.toLowerCase() === "green" ? "natural dark green" : char.eye;
    parts.push(`bright ${eyeColour} eyes`);
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

/* ── build final prompt with structured format ─────────── */
function buildFinalPrompt(
  scenePrompt: string,
  photoType: string,
  characterTraits: string | null,
  bodyType?: string,
  expression?: string,
): string {
  const typeLabel = photoType === "selfie" ? "SELFIE" : "PHOTO";
  const perspective = photoType === "selfie" ? SELFIE_PREFIX : PHOTO_PREFIX;

  const charName = characterTraits?.match(/^(\d+\s+year\s+old\s+woman)/)?.[0] || "the woman";

  const EXPRESSION_MAP: Record<string, string> = {
    "casual smile": "gentle casual closed-mouth smile, relaxed friendly",
    "straight face": "serious straight face, no smile, vogue editorial expression, lips together",
    "big smile": "big open-mouth smile showing teeth, happy joyful energy",
    "pout": "duck face pout, lips pushed forward, playful pouty expression",
  };
  const exprStr = expression ? `, ${EXPRESSION_MAP[expression] || expression}` : "";

  const parts: string[] = [];

  if (characterTraits) {
    parts.push(`a realistic casual iPhone-style ${typeLabel} of ${charName} shown in the reference images`);
    parts.push(`very attractive${exprStr}`);
    parts.push(scenePrompt);
    parts.push(`IMPORTANT: the outfit described in the scene description MUST override any clothing from reference images. She must wear exactly what is described above, NOT the clothing from reference photos`);
    parts.push(`She has: ${characterTraits}`);
  } else {
    parts.push(`a realistic casual iPhone-style ${typeLabel} of a woman`);
    parts.push(`very attractive${exprStr}`);
    parts.push(scenePrompt);
  }

  parts.push("natural framing with space above the head, authentic influencer style instagram photo, everything in focus including background, realistic matte skin with texture");
  parts.push(perspective);

  if (bodyType) {
    const bKey = bodyType.toLowerCase();
    const modifier = BODY_PROMPT_MODIFIER?.[bKey] || BODY_PROMPT_MODIFIER?.["regular"];
    if (modifier) parts.push(modifier);
  }

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
    signal: AbortSignal.timeout(XAI_REQUEST_TIMEOUT_MS),
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
  console.log("Revised prompt:", data?.data?.[0]?.revised_prompt || "none");
  return extractXaiImageUrl(data);
}

/* ── xAI Grok: image edit with references ─────── */
async function xaiImageEdit(
  prompt: string,
  imageUrls: string[],
  apiKey: string,
  aspectRatio = "3:4"
): Promise<string | null> {
  console.log("xaiImageEdit calling with", imageUrls.length, "reference images");

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

  const SUPPORTED_RATIOS = new Set([
    "1:1","3:4","4:3","9:16","16:9","2:3","3:2","9:19.5","19.5:9","9:20","20:9","1:2","2:1","auto"
  ]);
  body.aspect_ratio = SUPPORTED_RATIOS.has(aspectRatio) ? aspectRatio : "3:4";

  const response = await fetch("https://api.x.ai/v1/images/edits", {
    method: "POST",
    signal: AbortSignal.timeout(XAI_REQUEST_TIMEOUT_MS),
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
  console.log("Revised prompt:", data?.data?.[0]?.revised_prompt || "none");
  return extractXaiImageUrl(data);
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
    "large round doe-eyes positioned in centre of face, small delicate nose, full pouty lips, heart-shaped face, small-forehead, matte skin with visible pores, natural hair with subtle sheen, SAME hair style and colour as described",
    "very large tall doe-eyes positioned low on face, small-forehead, small delicate nose, full tall lips with bare pink tint, soft round face, smooth chin, natural hair with matte finish, SAME hair style and colour as described",
    "large almond cat-eyes positioned in centre of face, small delicate nose, full pouty lips, heart-shaped face, small-forehead, natural hair with satin finish, SAME hair style and colour as described",
  ];

  const makeupVariations = [
    "light eyeshadow, mascara, thin eyeliner, subtle blush, everyday natural makeup",
    "light eyeshadow, mascara, thin eyeliner, subtle blush, everyday natural makeup",
    "eyeshadow, mascara, eyeliner, subtle blush, polished makeup",
  ];

   const beautyCore = "extremely attractive young-woman, feminine soft features, soft rounded jaw, small rounded chin, slim face, small delicate nose, small-forehead, eyes positioned in centre of face, skin with visible pores and colour variation, long styled hair past shoulders, plump full lips with soft pink tint, thick mascara, thick eyeliner, eyeshadow, blush, confident closed-mouth smile";

  const imageUrls: string[] = [];
  const targetCount = Math.min(count, 3);

  for (let i = 0; i < targetCount; i++) {
    const variation = variations[i] || variations[0];
    const makeupVar = makeupVariations[i] || makeupVariations[0];
    const faceOnlyPrompt = stripFacePromptBodyLanguage(prompt);

    const colourVariants: Record<string, string[]> = {
      blonde: ["cool white-blonde", "light blonde"],
      brown: ["brown", "rich brown"],
      black: ["black", "dark black"],
      red: ["red", "warm red"],
      ginger: ["ginger", "light ginger"],
      pink: ["pink", "soft pink"],
    };

    let tonedPrompt = faceOnlyPrompt;
    for (const [base, variants] of Object.entries(colourVariants)) {
      if (tonedPrompt.toLowerCase().includes(base)) {
        const pick = variants[Math.floor(Math.random() * variants.length)];
        tonedPrompt = tonedPrompt.replace(new RegExp(base, 'i'), pick);
        break;
      }
    }

    const positivePrompt = `${tonedPrompt}, ${beautyCore}, ${makeupVar}, ${variation}. ${FACE_QUALITY}`;
    console.log(`Face gen ${i + 1}/${targetCount} starting...`);

    let retries = 0;
    const maxRetries = 2;
    while (retries <= maxRetries) {
      try {
        const url = await xaiTextToImage(positivePrompt, apiKey);
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
  slim: "slim toned body, natural soft B cup breasts with realistic shape, narrow waist, lean figure, slender arms, matte textured skin across chest",
  regular: "soft feminine body, natural soft C cup breasts with realistic weight and shape, defined waist, feminine hips, matte textured skin across chest",
  average: "soft feminine body, natural soft C cup breasts with realistic weight and shape, defined waist, feminine hips, matte textured skin across chest",
  curvy: "curvy feminine figure, natural soft D cup breasts with realistic weight and shape, defined waist, wider hips, soft thighs, hourglass shape, matte textured skin across chest",
  thick: "curvy feminine figure, natural soft D cup breasts with realistic weight and shape, defined waist, wider hips, soft thighs, hourglass shape, matte textured skin across chest",
};


/* ── body-type prompt modifier (appended to body-anchor & photo prompts) ── */
const BODY_PROMPT_MODIFIER: Record<string, string> = {
  slim: "petite frame, narrow hips, B cup chest, toned stomach, slim thighs",
  regular: "hourglass figure, C-D cup bust, defined waist, wider hips, soft feminine shape",
  curvy: "voluptuous, D-DD cup bust, wider hips, soft thighs, natural curves, defined waist",
};

/* ── generate 3/4 angle + full-body anchor from reference face ── */
async function generateAngleAndBody(
  faceUrl: string,
  characterTraits: string,
  bodyType: string,
  apiKey: string,
  adminClient: any,
  userId: string,
  target: "angle" | "body" | "both" = "both"
): Promise<{ angleUrl: string | null; bodyAnchorUrl: string | null }> {
  let angleUrl: string | null = null;
  let bodyAnchorUrl: string | null = null;

  if (target === "angle" || target === "both") {
    try {
      console.log("Generating 3/4 angle...");
      const anglePrompt = `A ${characterTraits.includes('young-woman') ? 'young-woman' : 'woman'} who naturally resembles the person in the reference photo. Same white t-shirt, same white background, same lighting. Head turned 45 degrees to the left showing 3/4 profile, facing their right. Head and shoulders only, cropped below collarbone. Skin with visible pores and colour variation. Relaxed neutral expression, lips together. ${characterTraits}`;
      const angleResult = await xaiImageEdit(anglePrompt, [faceUrl], apiKey, "3:4");
      if (angleResult) {
        angleUrl = await storeImagePermanently(angleResult, userId, adminClient, "angle");
        console.log("Angle generated:", angleUrl?.slice(0, 80));
      }
    } catch (e) {
      console.error("3/4 angle generation failed:", e);
    }
  }

  if (target === "body" || target === "both") {
    try {
      console.log("Generating full-body anchor...");
      const bodyKey = (bodyType || "regular").toLowerCase();
      const bodyDesc = BODY_ANCHOR_MAP[bodyKey] || BODY_ANCHOR_MAP.regular;
      const bodyPrompt = `A ${characterTraits.includes('young-woman') ? 'young-woman' : 'woman'} who naturally resembles the person in the reference photo. Standing straight upright, facing camera. Fitted low-cut white top with visible upper chest, tight black leggings. Same white background, same lighting. ${bodyDesc}. Matte skin with visible pores and colour variation. Arms hanging loosely and naturally at sides, relaxed casual posture, hands near outer thighs. Neutral relaxed expression, lips together. Framed from forehead to upper thigh.`;
      const bodyResult = await xaiImageEdit(bodyPrompt, [faceUrl], apiKey, "2:3");
      if (bodyResult) {
        bodyAnchorUrl = await storeImagePermanently(bodyResult, userId, adminClient, "body");
        console.log("Body anchor generated:", bodyAnchorUrl?.slice(0, 80));
      }
    } catch (e) {
      console.error("Full-body anchor generation failed:", e);
    }
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
    const fullPrompt = finalPrompt;
    return await xaiImageEdit(fullPrompt, faceImageUrls, apiKey, safeRatio);
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

    const userEmail = (userData.user.email || "").trim().toLowerCase();
    const isBetaUser = BETA_MODE && BETA_WHITELIST.includes(userEmail);

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
    const expression = body?.expression || null;
    const generateAngles = body?.generate_angles === true;
    const selectedFaceUrl = body?.selected_face_url || null;
    const angleCharacterId = body?.angle_character_id || null;
    const vibeReferenceUrl = body?.vibe_reference_url || null;
    const regenerateTarget = body?.regenerate_target || "both";
    const regenerateSingle = body?.regenerate_single || null;

    /* ── SINGLE PHOTO REGENERATION FLOW (1 gem) ── */
    if (regenerateSingle && (regenerateSingle === "angle" || regenerateSingle === "body")) {
      const singleCharId = body?.character_id;

      if (!singleCharId) {
        return new Response(JSON.stringify({ error: "Missing character_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: creditData } = await adminClient
        .from("credits")
        .select("balance")
        .eq("user_id", userId)
        .single();

      if (!creditData || creditData.balance <= 0) {
        return new Response(
          JSON.stringify({ error: "No gems remaining", code: "NO_GEMS" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient
        .from("credits")
        .update({ balance: creditData.balance - 1, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      // Always fetch fresh character data from DB
      const { data: charData } = await adminClient
        .from("characters")
        .select("*")
        .eq("id", singleCharId)
        .eq("user_id", userId)
        .single();

      if (!charData || !charData.face_image_url) {
        await adminClient.from("credits").update({ balance: creditData.balance, updated_at: new Date().toISOString() }).eq("user_id", userId);
        return new Response(JSON.stringify({ error: "Character not found or missing face image" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Capture the old URL so we can delete the old file after success
      const oldUrl = regenerateSingle === "angle" ? charData.face_angle_url : charData.body_anchor_url;

      const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
      if (!XAI_API_KEY) throw new Error("XAI_API_KEY is not configured");

      const traits = buildCharacterTraits(charData);
      const dbBodyType = (charData.body || "regular").toLowerCase();

      // Use the fresh face_image_url from DB, not the client-provided one
      const freshFaceUrl = charData.face_image_url;
      console.log(`=== SINGLE REGENERATION: ${regenerateSingle} (using fresh DB face URL) ===`);

      try {
        const { angleUrl, bodyAnchorUrl } = await generateAngleAndBody(
          freshFaceUrl, traits, dbBodyType, XAI_API_KEY, adminClient, userId, regenerateSingle
        );

        const updates: Record<string, string | null> = {};
        if (regenerateSingle === "angle" && angleUrl) updates.face_angle_url = angleUrl;
        if (regenerateSingle === "body" && bodyAnchorUrl) updates.body_anchor_url = bodyAnchorUrl;

        if (Object.keys(updates).length > 0) {
          await adminClient.from("characters").update(updates).eq("id", singleCharId).eq("user_id", userId);
        }

        // Delete old file from storage after successful update
        if (oldUrl) {
          try {
            const bucketBase = `/storage/v1/object/public/images/`;
            const idx = oldUrl.indexOf(bucketBase);
            if (idx !== -1) {
              const storagePath = oldUrl.slice(idx + bucketBase.length);
              console.log("Deleting old storage file:", storagePath);
              await adminClient.storage.from("images").remove([storagePath]);
            }
          } catch (delErr) {
            console.warn("Failed to delete old image file (non-fatal):", delErr);
          }
        }

        const resultUrl = regenerateSingle === "angle" ? angleUrl : bodyAnchorUrl;
        if (resultUrl) {
          await adminClient.from("generations").insert({
            user_id: userId,
            prompt: "character references",
            image_urls: [resultUrl],
          });
        }

        await logGeneration(adminClient, userId, singleCharId, "character references", regenerateSingle, 1, true);

        return new Response(
          JSON.stringify({
            angle_url: angleUrl,
            body_anchor_url: bodyAnchorUrl,
            gems_remaining: creditData.balance - 1,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e: any) {
        await adminClient.from("credits").update({ balance: creditData.balance, updated_at: new Date().toISOString() }).eq("user_id", userId);
        console.error("Single regeneration error:", e);
        if (e?.contentPolicy) {
          await logRejectedPrompt(adminClient, userId, "character references");
          await logGeneration(adminClient, userId, singleCharId, "character references", regenerateSingle, 0, false, "content_policy");
          return new Response(
            JSON.stringify({ error: "prompt not allowed", code: "CONTENT_POLICY" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        await logGeneration(adminClient, userId, singleCharId, "character references", regenerateSingle, 1, false, e?.message || "unknown");
        return new Response(
          JSON.stringify({ error: "regeneration failed, please try again" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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
    if (generateAngles && selectedFaceUrl) {
      console.log("=== ANGLE + BODY GENERATION ===");
      console.log("Face URL:", selectedFaceUrl.slice(0, 80));

      let dbBodyType = "regular";
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
          dbBodyType = (charData.body || "regular").toLowerCase();
          console.log("Built character traits from DB:", traits.slice(0, 120));
          console.log("Body type from DB:", dbBodyType);
        }
      }

      const { angleUrl, bodyAnchorUrl } = await generateAngleAndBody(
        selectedFaceUrl, traits, dbBodyType, Deno.env.get("XAI_API_KEY")!, adminClient, userId, regenerateTarget
      );
      console.log("Angle result:", angleUrl?.slice(0, 60) || "null");
      console.log("Body result:", bodyAnchorUrl?.slice(0, 60) || "null");

      if (angleCharacterId && (angleUrl || bodyAnchorUrl)) {
        const updates: Record<string, string | null> = {};
        if (angleUrl) updates.face_angle_url = angleUrl;
        if (bodyAnchorUrl) updates.body_anchor_url = bodyAnchorUrl;

        const { error: persistError } = await adminClient
          .from("characters")
          .update(updates)
          .eq("id", angleCharacterId)
          .eq("user_id", userId);

        if (persistError) {
          console.error("Failed to persist generated references:", persistError);
        } else {
          console.log("Saved generated references to character:", angleCharacterId);
        }

        const refUrls = [angleUrl, bodyAnchorUrl].filter(Boolean) as string[];
        if (refUrls.length > 0) {
          await adminClient.from("generations").insert({
            user_id: userId,
            prompt: "character references",
            image_urls: refUrls,
          });
        }
      }

      return new Response(
        JSON.stringify({ angle_url: angleUrl, body_anchor_url: bodyAnchorUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ── look up character if provided ── */
    let characterTraits: string | null = null;
    let characterBodyType: string | undefined;
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
        characterBodyType = (charData.body || "regular").toLowerCase();
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
          await logRejectedPrompt(adminClient, userId, prompt);
          await logGeneration(adminClient, userId, null, prompt, "face", 0, false, "content_policy");
          return new Response(
            JSON.stringify({ error: "prompt not allowed", code: "CONTENT_POLICY" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (e?.status === 429 || e?.status === 402) {
          await logGeneration(adminClient, userId, null, prompt, "face", 0, false, `status_${e.status}`);
          return new Response(
            JSON.stringify({ error: "generation failed, please try again" }),
            { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw e;
      }

      if (imageUrls.length === 0) throw new Error("No images generated");

      const { error: profileUpdateError } = await adminClient
        .from("profiles")
        .update({ has_used_free_gen: true })
        .eq("user_id", userId);

      if (profileUpdateError) {
        console.warn("Failed to mark free generation usage:", profileUpdateError);
      }

      if (clientIp !== "unknown") {
        const { error: ipInsertError } = await adminClient
          .from("free_gen_ips")
          .insert({ ip_address: clientIp, user_id: userId });

        if (ipInsertError) {
          console.warn("Failed to record free generation IP:", ipInsertError);
        }
      }

      await logGeneration(adminClient, userId, null, prompt, "face", 0, true);

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
        const finalPrompt = buildFinalPrompt(prompt, photoType, characterTraits, characterBodyType, expression);
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

      const genType = isFaceRegen ? "face" : "photo";
      if (e?.contentPolicy) {
        await logRejectedPrompt(adminClient, userId, prompt);
        await logGeneration(adminClient, userId, characterId, prompt, genType, 0, false, "content_policy");
        return new Response(
          JSON.stringify({ error: "prompt not allowed", code: "CONTENT_POLICY" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (e?.status === 429 || e?.status === 402) {
        await logGeneration(adminClient, userId, characterId, prompt, genType, 0, false, `status_${e.status}`);
        return new Response(
          JSON.stringify({ error: "generation failed, please try again" }),
          { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Generation error:", e);
      await logGeneration(adminClient, userId, characterId, prompt, genType, 1, false, e?.message || "unknown");
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

    const genType = isFaceRegen ? "face" : "photo";
    if (!isFaceRegen) {
      await adminClient.from("generations").insert({
        user_id: userId,
        prompt: sanitiseText(prompt),
        image_urls: imageUrls,
      });
    }

    await logGeneration(adminClient, userId, characterId, prompt, genType, 1, true);

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
