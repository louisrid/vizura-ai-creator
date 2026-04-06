import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── config ─────────────────────────────────────────────── */
const ACTIVE_MODEL: "seedream" | "seedream" = "grok";

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
  "casual iPhone photo, matte skin with visible pores and fine texture, individual skin imperfections visible, natural uneven skin tone, slight grain, candid authentic energy, natural ambient lighting, real human skin with subtle detail";

const NEGATIVE_INSTRUCTION =
  "Do not generate glossy skin, shiny skin, waxy skin, plastic skin, airbrushed skin, long arms, elongated arms, both arms holding phone, two arms extended, studio lighting, dslr, 4k, hdr, bokeh, depth of field, extra limbs, missing limbs, bad anatomy, deformed, out of frame, cropped, watermark, text, nipples, areola, exposed genitals.";

const SELFIE_PREFIX =
  "iPhone selfie, front camera, single arm extended holding phone, casual angle, slight wide angle distortion, phone visible in one hand";

const PHOTO_PREFIX =
  "third person framing, composed perspective, natural photography angle";

/* ── face generation quality prompt ─────────────────────── */
const FACE_QUALITY =
  "professional passport photo, front-facing headshot, plain white background, centred in frame, head and top of shoulders visible, wearing a plain white crew neck t-shirt, pleasant expression, soft smile or calm friendly neutral face, even soft lighting, looking directly at camera, no shadows on background, consistent framing, photorealistic portrait, high resolution, natural iPhone photo realism, natural matte skin, no glossy or oily skin, realistic skin texture";

const FACE_NEGATIVE =
  "Do not generate glossy skin, shiny skin, waxy skin, plastic skin, old face, mature face, wrinkles, fat face, chubby cheeks, moody expression, angry, sad, frown, masculine features, studio lighting, dslr, colored background, outdoor background, cartoon, anime, illustration, text, watermark, blur.";

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
  natural: "natural minimal makeup with visible lip gloss and subtle mascara",
  classic: "classic polished makeup with defined eyeliner, mascara, subtle contour, lip colour",
};

function ageToDescription(ageStr: string): string {
  const num = parseInt(ageStr, 10);
  if (isNaN(num) || num <= 23) return "baby face, very young looking 18 to 20 years old, soft rounded youthful features, no mature bone structure, no defined cheekbones, smooth flawless skin with zero fine lines, bright wide innocent eyes, small soft nose, full soft lips, round soft jawline, no angular features, teenager energy, looks like she just turned 18, plump youthful cheeks, no hollowness in face";
  if (num <= 28) return "young adult 24 to 28, slightly more defined bone structure than a teenager, still youthful smooth skin, attractive young woman, subtle cheekbone definition, bright eyes";
  return "young adult features, more defined cheekbones, still youthful skin, mid to late twenties look, subtle maturity while still attractive";
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
    parts.push(`long ${hairColour} hair with straight-across bangs fringe, long flowing hair clearly visible past the shoulders and down the back, full straight fringe across the forehead, hair must be long and flowing not tucked behind shoulders, IMPORTANT: must show long hair with bangs fringe in every image`.trim());
  } else if (hairStyle.toLowerCase() === "straight") {
    parts.push(`long straight ${hairColour} hair, no bangs, no fringe, hair parted naturally, IMPORTANT: must be straight hair with no curls or waves in every image`.trim());
  } else if (hairStyle.toLowerCase() === "curly") {
    parts.push(`${hairColour} curly hair, natural curls, IMPORTANT: must have curly hair in every image`.trim());
  } else if (hairStyle.toLowerCase() === "short") {
    parts.push(`short ${hairColour} hair, IMPORTANT: must have short hair in every image`.trim());
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

  parts.push("slight space above the head, natural framing, authentic influencer style instagram photo, natural lighting, realistic skin");
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
  return extractXaiImageUrl(data);
}

/* ── helper: strip "Do not generate" prefix from negative strings ── */
function extractNegativeKeywords(negativeText: string): string {
  return negativeText
    .replace(/^Do not generate\s*/i, "")
    .replace(/\.\s*$/, "")
    .trim();
}

/* ── fal.ai Seedream: text-to-image ───────────────────── */
async function falTextToImage(prompt: string, negativePrompt: string, apiKey: string): Promise<string | null> {
  console.log("falTextToImage calling:", prompt.slice(0, 120));

  const response = await fetch("https://fal.run/fal-ai/bytedance/seedream/v4.5/text-to-image", {
    method: "POST",
    signal: AbortSignal.timeout(XAI_REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: negativePrompt,
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

/* ── fal.ai Seedream: image edit ──────────────────────── */
async function falImageEdit(
  prompt: string,
  imageUrls: string[],
  negativePrompt: string,
  apiKey: string
): Promise<string | null> {
  console.log("falImageEdit calling with", imageUrls.length, "reference images");

  const response = await fetch("https://fal.run/fal-ai/bytedance/seedream/v4.5/edit", {
    method: "POST",
    signal: AbortSignal.timeout(XAI_REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_urls: imageUrls,
      negative_prompt: negativePrompt,
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
  if (ACTIVE_MODEL === "seedream") {
    const falKey = Deno.env.get("FAL_API_KEY");
    if (!falKey) throw new Error("FAL_API_KEY is not configured");
    return falTextToImage(positivePrompt, extractNegativeKeywords(negativeText), falKey);
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
  if (ACTIVE_MODEL === "seedream") {
    const falKey = Deno.env.get("FAL_API_KEY");
    if (!falKey) throw new Error("FAL_API_KEY is not configured");
    return falImageEdit(positivePrompt, imageUrls, extractNegativeKeywords(negativeText), falKey);
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
    "diamond face shape, high angular cheekbones, narrow pointed chin, sharp elegant jawline, full plush lips, refined narrow nose with high bridge, large wide-set almond-shaped eyes, thin softly arched brows, delicate bone structure, EXACT SAME hair style and colour as described",
    "round soft face shape, low wide cheekbones, rounded chin, gentle curved jawline, thin defined lips with strong cupid's bow, straight button nose, deep-set hooded eyes set close together, thick straight brows, robust bone structure, EXACT SAME hair style and colour as described",
    "square strong face shape, flat wide cheekbones, broad flat chin, strong angular jaw, medium naturally asymmetric lips, small upturned nose, large round doe eyes set wide apart, arched dramatic brows, prominent bone structure, EXACT SAME hair style and colour as described",
  ];

  const beautyCore = "extremely attractive young instagram model, youthful 18 to 21, slim defined face, matte skin with visible pores, long hair past shoulders, subtle pink tinted lips, light mascara, friendly expression, white crew neck t-shirt, white background";

  const imageUrls: string[] = [];
  const targetCount = Math.min(count, 3);

  // Generate faces sequentially to avoid rate limits and timeouts
  for (let i = 0; i < targetCount; i++) {
    const variation = variations[i] || variations[0];
    const faceOnlyPrompt = stripFacePromptBodyLanguage(prompt);
    const positivePrompt = `${faceOnlyPrompt}, ${beautyCore}, ${variation}, ${FACE_QUALITY}`;
    console.log(`Face gen ${i + 1}/${targetCount} starting...`);

    let retries = 0;
    const maxRetries = 2;
    while (retries <= maxRetries) {
      try {
        const url = await routerTextToImage(positivePrompt, FACE_NEGATIVE, apiKey);
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
  slim: "slim toned body, smaller chest, narrow waist, lean athletic figure, visible collarbones, slender arms and legs",
  regular: "soft feminine body, shapely figure, large DD bust, defined waist, feminine hips, balanced proportions",
  average: "soft feminine body, shapely figure, large DD bust, defined waist, feminine hips, balanced proportions",
  curvy: "very curvy full figure, very large bust, wide hips, thick thighs, hourglass shape, voluptuous proportions",
  thick: "very curvy full figure, very large bust, wide hips, thick thighs, hourglass shape, voluptuous proportions",
};

/* ── body-type prompt modifier (appended to body-anchor & photo prompts) ── */
const BODY_PROMPT_MODIFIER: Record<string, string> = {
  slim: "petite slender frame, narrow hips, small A-B cup chest, toned flat stomach, delicate build, slim thighs",
  regular: "hourglass figure, feminine curves, large D-DD cup bust, defined waist, wider hips, soft feminine shape",
  curvy: "very voluptuous, extremely large G-H cup bust, very wide hips, thick thighs, maximum curves, exaggerated hourglass",
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
    const anglePositive = `Same person exactly as in the reference image, side profile view, head turned approximately 60-70 degrees to the right showing the side of the face, ear visible, nose in profile, jawline visible from the side, genuine side-profile angle NOT a slight head turn, wearing white crew neck t-shirt, plain white background, passport photo style, head and top of shoulders only, natural matte skin, no glossy or oily skin, ${characterTraits}. ${FACE_QUALITY}`;
    const angleResult = await routerImageEdit(anglePositive, FACE_NEGATIVE, [faceUrl], apiKey, "3:4");
    if (angleResult) {
      angleUrl = await storeImagePermanently(angleResult, userId, adminClient, "angle");
      console.log("Angle generated:", angleUrl?.slice(0, 80));
    }
  } catch (e) {
    console.error("3/4 angle generation failed:", e);
  }

  const BODY_NEGATIVE = "Do not generate long arms, elongated arms, arms past hips, muscular arms, veiny arms, glossy skin, shiny skin, waxy skin, plastic skin, crossed legs, sitting, kneeling, extra limbs, missing limbs, extra fingers, bad anatomy, deformed, mannequin, cropped limbs, masculine, old skin, wrinkles.";

  try {
    console.log("Generating full-body anchor...");
    const bodyKey = (bodyType || "regular").toLowerCase();
    const bodyDesc = BODY_ANCHOR_MAP[bodyKey] || BODY_ANCHOR_MAP.regular;
    const bodyModifier = BODY_PROMPT_MODIFIER[bodyKey] || BODY_PROMPT_MODIFIER.regular;
    const bodyPositive = `Same face as reference image, natural photo, front-facing, slight hip tilt, head to just below hips, fitted low-cut top, tight black leggings, ${bodyDesc}, standing upright, white background, matte skin with pores, normal length arms ending at mid-thigh, feminine soft build`;
    const bodyResult = await routerImageEdit(bodyPositive, BODY_NEGATIVE, [faceUrl], apiKey, "2:3");
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
