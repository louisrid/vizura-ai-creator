import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── config ─────────────────────────────────────────────── */
const ACTIVE_MODEL: "grok" | "flux" = "grok";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const XAI_REQUEST_TIMEOUT_MS = 120_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── prompt constants ──────────────────────────────────── */
const QUALITY_SUFFIX =
  "";

const NEGATIVE_INSTRUCTION =
  "";

const SELFIE_PREFIX =
  "iPhone selfie taken with front camera, one hand holding the phone at arms length, casual angle, everything in focus";

const PHOTO_PREFIX =
  "third person framing, composed perspective, natural photography angle";

/* ── face generation quality prompt ─────────────────────── */
const FACE_QUALITY =
  "passport photo, plain white background, face and upper shoulders centred with space above head, white t-shirt at neckline, soft even lighting, looking at camera, sharp focus, matte skin with visible pores and natural skin-texture";

const FLUX_QUALITY_SUFFIX =
  "everything sharply in focus including background, sharp detailed background, matte skin with visible pores and subtle natural imperfections, natural uneven skin tone, natural ambient lighting with variation, slight camera sensor grain, casual candid real iPhone photo, authentic real-life energy";

const FLUX_FACE_QUALITY =
  "close-up headshot, plain white background, centred in frame, head and top of shoulders visible, wearing a fitted plain white crew neck t-shirt, soft natural smile, even soft lighting from the front, looking directly at camera, photorealistic, matte skin with visible pores and natural texture, realistic human skin with subtle imperfections";

const FACE_NEGATIVE =
  "";

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
  white: "pale white skin",
  pale: "very pale fair-white skin",
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
  if (hairStyle.toLowerCase() === "bangs") {
    parts.push(`long ${hairColour} hair draped over shoulders onto chest with straight-across bangs fringe, full straight fringe across forehead, IMPORTANT: hair must be long draped over shoulders in every image`.trim());
  } else if (hairStyle.toLowerCase() === "straight") {
    parts.push(`long straight ${hairColour} hair draped over shoulders onto chest with a few loose strands framing face, hair parted naturally, IMPORTANT: hair must be long draped over shoulders in every image`.trim());
  } else if (hairStyle.toLowerCase() === "curly" || hairStyle.toLowerCase() === "wavy") {
    parts.push(`long ${hairColour} wavy hair draped over shoulders onto chest with loose natural waves, IMPORTANT: hair must be long draped over shoulders in every image`.trim());
  } else if (hairStyle || hairColour) {
    parts.push(`long ${hairStyle} ${hairColour} hair draped over shoulders onto chest`.trim());
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

  // Extract character name from traits (first part before comma)
  const charName = characterTraits?.match(/^(\d+\s+year\s+old\s+woman)/)?.[0] || "the woman";

  // Expression
  const EXPRESSION_MAP: Record<string, string> = {
    "casual smile": "gentle casual closed-mouth smile, relaxed friendly",
    "straight face": "serious straight face, no smile, vogue editorial expression, lips together",
    "big smile": "big open-mouth smile showing teeth, happy joyful energy",
    "pout": "duck face pout, lips pushed forward, playful pouty expression",
  };
  const exprStr = expression ? `, ${EXPRESSION_MAP[expression] || expression}` : "";

  // The user's scene prompt contains outfit, environment, pose, extras
  // We explicitly instruct the model to use the outfit from the user prompt
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

  if (ACTIVE_MODEL === "flux") {
    parts.push("slight space above the head, natural framing, authentic influencer style instagram photo");
    parts.push(FLUX_QUALITY_SUFFIX);
  } else {
    parts.push("natural framing with space above the head, authentic influencer style instagram photo, everything in focus including background, realistic matte skin with texture");
  }
  parts.push(perspective);

  if (bodyType) {
    const bKey = bodyType.toLowerCase();
    const modifier = BODY_PROMPT_MODIFIER?.[bKey] || BODY_PROMPT_MODIFIER?.["regular"];
    if (modifier) parts.push(modifier);
  }

  if (ACTIVE_MODEL !== "flux") {
    parts.push(NEGATIVE_INSTRUCTION);
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


/* ── fal.ai FLUX: text-to-image ────────────────────────── */
async function falTextToImage(prompt: string, apiKey: string): Promise<string | null> {
  console.log("falTextToImage calling:", prompt.slice(0, 120));

  const response = await fetch("https://fal.run/fal-ai/flux-2-pro", {
    method: "POST",
    signal: AbortSignal.timeout(XAI_REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("fal text-to-image error:", response.status, errText);
    if (response.status === 429) throw { status: 429 };
    if (response.status === 402) throw { status: 402 };
    if (isContentPolicyError(response.status, errText)) {
      throw { status: 400, contentPolicy: true };
    }
    throw new Error(`fal generation failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  console.log("fal response keys:", Object.keys(data));
  const url = data?.images?.[0]?.url;
  return typeof url === "string" && url.trim().length > 0 ? url : null;
}

/* ── fal.ai FLUX: image edit ──────────────────────────── */
async function falImageEdit(
  prompt: string,
  imageUrls: string[],
  apiKey: string
): Promise<string | null> {
  console.log("falImageEdit calling with", imageUrls.length, "reference images");

  const response = await fetch("https://fal.run/fal-ai/flux-2-pro", {
    method: "POST",
    signal: AbortSignal.timeout(XAI_REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_urls: imageUrls,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("fal image-edit error:", response.status, errText);
    if (response.status === 429) throw { status: 429 };
    if (response.status === 402) throw { status: 402 };
    if (isContentPolicyError(response.status, errText)) {
      throw { status: 400, contentPolicy: true };
    }
    throw new Error(`fal image edit failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  console.log("fal edit response keys:", Object.keys(data));
  const url = data?.images?.[0]?.url;
  return typeof url === "string" && url.trim().length > 0 ? url : null;
}

/* ── router: text-to-image ────────────────────────────── */
async function routerTextToImage(
  positivePrompt: string,
  negativeText: string,
  apiKey: string
): Promise<string | null> {
  if (ACTIVE_MODEL === "flux") {
    const falKey = Deno.env.get("FAL_API_KEY");
    if (!falKey) throw new Error("FAL_API_KEY is not configured");
    // FLUX does not use negative prompts — send only the positive prompt
    return falTextToImage(positivePrompt, falKey);
  }
  // grok: bake negative into prompt
  const fullPrompt = negativeText ? `${positivePrompt}. ${negativeText}` : positivePrompt;
  return xaiTextToImage(fullPrompt, apiKey);
}

/* ── router: image edit ───────────────────────────────── */
async function routerImageEdit(
  positivePrompt: string,
  negativeText: string,
  imageUrls: string[],
  apiKey: string,
  aspectRatio = "3:4"
): Promise<string | null> {
  if (ACTIVE_MODEL === "flux") {
    const falKey = Deno.env.get("FAL_API_KEY");
    if (!falKey) throw new Error("FAL_API_KEY is not configured");
    // FLUX does not use negative prompts — send only the positive prompt
    return falImageEdit(positivePrompt, imageUrls, falKey);
  }
  // grok: bake negative into prompt
  const fullPrompt = negativeText ? `${positivePrompt}. ${negativeText}` : positivePrompt;
  return xaiImageEdit(fullPrompt, imageUrls, apiKey, aspectRatio);
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
    "low-set hairline, very large round doe-eyes positioned low on face, small button-nose, soft-round face, smooth chin, full pouty lips, matte skin with visible pores and skin-texture, SAME hair style and colour as described",
    "low-set hairline, very large tall doe-eyes positioned low on face, small button-nose, soft-round face, smooth chin, medium natural lips, matte skin with visible pores and skin-texture, SAME hair style and colour as described",
    "low-set hairline, large bright almond-eyes positioned low on face, small button-nose, soft-round face, smooth chin, full plump lips with bare-pink tint, matte skin with visible pores and skin-texture, SAME hair style and colour as described",
  ];

  const makeupVariations = [
    "mascara, thin eyeliner, hint of blush, teen-influencer natural look",
    "mascara, thin eyeliner, teen-influencer natural look",
    "mascara, eyeliner, subtle blush, teen-influencer natural look",
  ];

  const beautyCore = "extremely attractive young-woman, feminine soft features, soft rounded jaw, small rounded chin, slim face, small button-nose, low-set hairline, eyes positioned in centre of face, skin with visible pores and colour variation, long styled hair past shoulders, plump full lips with soft pink tint, mascara, eyeliner, light eyeshadow, subtle blush, confident closed-mouth smile";

  const fluxBeautyCore = "stunningly attractive young woman, instagram model energy, youthful 18 to 21, slim defined face, matte skin with visible pores and subtle imperfections, long flowing well-styled hair clearly past shoulders, naturally pink tinted lips, light mascara and subtle natural makeup, warm friendly expression, fitted plain white crew neck t-shirt, plain white background, photorealistic human skin";

  const imageUrls: string[] = [];
  const targetCount = Math.min(count, 3);

  // Generate faces sequentially to avoid rate limits and timeouts
  for (let i = 0; i < targetCount; i++) {
    const variation = variations[i] || variations[0];
    const makeupVar = makeupVariations[i] || makeupVariations[0];
    const faceOnlyPrompt = stripFacePromptBodyLanguage(prompt);
    const positivePrompt = `${faceOnlyPrompt}, ${beautyCore}, ${makeupVar}, ${variation}. ${FACE_QUALITY}`;
    console.log(`Face gen ${i + 1}/${targetCount} starting...`);

    let retries = 0;
    const maxRetries = 2;
    while (retries <= maxRetries) {
      try {
        const url = ACTIVE_MODEL === "flux"
          ? await routerTextToImage(`${faceOnlyPrompt}, ${fluxBeautyCore}, ${makeupVar}, ${variation}, ${FLUX_FACE_QUALITY}`, "", apiKey)
          : await routerTextToImage(positivePrompt, "", apiKey);
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
  userId: string
): Promise<{ angleUrl: string | null; bodyAnchorUrl: string | null }> {
  let angleUrl: string | null = null;
  let bodyAnchorUrl: string | null = null;

  try {
    console.log("Generating 3/4 angle...");
    const anglePrompt = ACTIVE_MODEL === "flux"
      ? `Same person from the reference image photographed in the same session, 3/4 profile view with head turned 45 degrees to the right, same fitted plain white crew neck t-shirt, same plain white background, same soft even lighting, head and top of shoulders only, matte skin with visible pores, natural skin texture matching reference, ${characterTraits}`
      : `A ${characterTraits.includes('young-woman') ? 'young-woman' : 'woman'} who naturally resembles the person in the reference photo. Same white background, same lighting. Head turned 30 degrees right, mostly facing camera, eyes looking directly at camera. Head and shoulders only, cropped below collarbone. Fitted low-cut white top. Skin with visible pores and colour variation. Subtle closed-mouth smile with lips together. ${characterTraits}`;
    const angleResult = await routerImageEdit(anglePrompt, ACTIVE_MODEL === "flux" ? "" : FACE_NEGATIVE, [faceUrl], apiKey, "3:4");
    if (angleResult) {
      angleUrl = await storeImagePermanently(angleResult, userId, adminClient, "angle");
      console.log("Angle generated:", angleUrl?.slice(0, 80));
    }
  } catch (e) {
    console.error("3/4 angle generation failed:", e);
  }

  const BODY_NEGATIVE = "";

  try {
    console.log("Generating full-body anchor...");
    const bodyKey = (bodyType || "regular").toLowerCase();
    const bodyDesc = BODY_ANCHOR_MAP[bodyKey] || BODY_ANCHOR_MAP.regular;
    const bodyModifier = BODY_PROMPT_MODIFIER[bodyKey] || BODY_PROMPT_MODIFIER.regular;
    const bodyPrompt = ACTIVE_MODEL === "flux"
      ? `Same person from the reference image photographed in the same session, front-facing confident pose, slight natural hip tilt, framed from head to just below hips, wearing same fitted plain white crew neck t-shirt, ${bodyDesc}, standing upright feet shoulder width apart, same plain white background, same soft even lighting as face reference, matte skin with visible pores, normal proportional arms ending at mid-thigh, naturally feminine build, body and face are one cohesive person`
      : `A ${characterTraits.includes('young-woman') ? 'young-woman' : 'woman'} who naturally resembles the person in the reference photo. Front facing, slight hip tilt, framed from head to just above knees. Fitted low-cut white top, tight black leggings. Same white background, same lighting. ${bodyDesc}. Matte skin with visible pores across chest, neck and arms. Short feminine arms resting at sides, hands at upper thigh, smooth inner elbows. Subtle closed-mouth smile with lips together.`;
    const bodyResult = await routerImageEdit(bodyPrompt, ACTIVE_MODEL === "flux" ? "" : BODY_NEGATIVE, [faceUrl], apiKey, "2:3");
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
    return await routerImageEdit(finalPrompt, NEGATIVE_INSTRUCTION, faceImageUrls, apiKey, safeRatio);
  }
  return await routerTextToImage(finalPrompt, NEGATIVE_INSTRUCTION, apiKey);
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
    const expression = body?.expression || null;
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
    if (generateAngles && selectedFaceUrl) {
      console.log("=== ANGLE + BODY GENERATION ===");
      console.log("Face URL:", selectedFaceUrl.slice(0, 80));

      // Always read body type from DB — never trust frontend
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
        selectedFaceUrl, traits, dbBodyType, Deno.env.get("XAI_API_KEY")!, adminClient, userId
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

        // Also save angle + body images to generations for storage/homepage visibility
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
