import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── config ─────────────────────────────────────────────── */
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const XAI_REQUEST_TIMEOUT_MS = 120_000;

/* ── gem costs ─────────────────────────────────────────── */
const GEM_COST_PHOTO = 10;
const GEM_COST_FACE_GEN = 30;
const GEM_COST_FACE_REGEN = 30;
const GEM_COST_SINGLE_REGEN = 10;
const GEM_COST_CHARACTER = 50;
const GEM_COST_ANGLE = 10;
const GEM_COST_BODY = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── prompt constants (photo generation) ───────────────── */
const CAMERA_SELFIE = "Casual iPhone selfie of a woman";

const CAMERA_PHOTO = "Casual iPhone photo of a woman";

const CAMERA_MIRROR = "Casual iPhone mirror selfie of a woman standing in front of a full-length mirror, hip popped to one side, one hand holding phone at chest height";

const PHOTO_BODY_DESC: Record<string, string> = {
  slim: "Slim toned figure with narrow waist, narrow hips, toned slim arms, flat toned stomach, fit figure",
  thin: "Slim toned figure with narrow waist, narrow hips, toned slim arms, flat toned stomach, fit figure",
  regular: "Hourglass figure with defined waist, feminine hips, toned slim arms, flat toned stomach, fit figure",
  average: "Hourglass figure with defined waist, feminine hips, toned slim arms, flat toned stomach, fit figure",
  curvy: "Curvaceous hourglass figure with narrow waist, wide hips, toned slim arms, flat toned stomach, fit figure",
  thick: "Curvaceous hourglass figure with narrow waist, wide hips, toned slim arms, flat toned stomach, fit figure",
};

const PHOTO_BUST_DESC: Record<string, string> = {
  regular: "prominent chest",
  "extra large": "very large prominent breasts",
};

const PHOTO_SKIN_TONE: Record<string, string> = {
  white: "fair skin",
  pale: "very pale fair skin",
  tan: "warm olive skin",
  asian: "warm golden skin",
  black: "rich dark skin",
  dark: "rich dark skin",
};

const PHOTO_EXPR: Record<string, string> = {
  "casual smile": "relaxed sultry expression with gentle closed-mouth smile",
  "straight face": "serious straight face, no smile, vogue editorial expression, lips together",
  "big smile": "big open-mouth smile showing teeth, happy joyful energy",
  "pout": "duck face pout, lips pushed forward, playful pouty expression",
};

/* ── face generation quality prompt ─────────────────────── */
const FACE_QUALITY = "passport photo, plain white background, face and upper shoulders centred with space above head, low-scoop white top at neckline, soft even lighting, looking at camera, sharp focus, entire image completely sharp edge to edge with deep depth of field and zero background blur or bokeh, realistic skin with visible pore texture and micro-detail no airbrushed smoothness no freckles no moles";

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
  white: "light pale skin with warm undertone",
  pale: "very pale fair skin",
  tan: "olive mediterranean skin tone",
  asian: "asian skin tone",
  black: "rich dark skin with natural healthy glow",
  dark: "rich dark skin with natural healthy glow",
};

const normalizeBodyType = (v: string) => {
  const k = v.toLowerCase();
  if (k === "thin") return "slim";
  return k;
};

const BODY_MAP: Record<string, string> = {
  slim: "slim body, narrow waist",
  thin: "slim body, narrow waist",
  regular: "soft feminine body, defined waist",
  average: "soft feminine body, defined waist",
  curvy: "curvy feminine figure, wide hips, defined waist",
  thick: "curvy feminine figure, wide hips, defined waist",
};

const MAKEUP_MAP: Record<string, string> = {
  natural: "natural minimal makeup with visible lip gloss and subtle mascara",
  classic: "classic polished makeup with defined eyeliner, mascara, subtle contour, lip colour",
};

function ageToDescription(ageStr: string): string {
  const num = parseInt(ageStr, 10);
  if (isNaN(num) || num <= 24) return "20 year old young-woman, round soft face, soft cheeks, big bright-eyes, small-nose, natural lips, smooth skin, soft jaw, small-chin, youthful compact features";
  return "24 year old woman, visible cheekbones, clean jawline, balanced features, clear skin";
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
    .replace(/\b[A-Z]-[A-Z]\s+cup\s+breasts[^,]*/gi, "")
    .replace(/\bvery-large\s+DD-E\s+cup\s+breasts[^,]*/gi, "")
    .replace(/\bproportional\s+to\s+frame\b/gi, "")
    .replace(/\bfull\s+heavy-chest[^,]*/gi, "")
    .replace(/\bvisible\s+cleavage[^,]*/gi, "")
    .replace(/\bmatte\s+textured\s+skin\s+across\s+chest\b/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/,{2,}/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^,|,$/g, "");
}

/* ── bust size descriptor ── */
const BUST_SIZE_MAP: Record<string, string> = {
  regular: "prominent chest",
  "extra large": "very large prominent breasts",
};

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
    if (skinKey === "asian") parts.push("east asian facial structure, flatter nose bridge, monolid or subtle double eyelid");
    if (skinKey === "black" || skinKey === "dark") parts.push("natural african facial structure, wider nose, full natural lips");
    if (skinKey === "tan") parts.push("mediterranean facial structure, defined brow bone, olive undertone");
  }

  const bodyKey = normalizeBodyType((char.body || "regular").toLowerCase());
  parts.push(BODY_MAP[bodyKey] || BODY_MAP.regular);

  const rawBust = (char.bust_size || "regular").toLowerCase();
  const bustKey = (rawBust === "xl" || rawBust === "extra large") ? "extra large" : "regular";
  const bustDesc = BUST_SIZE_MAP[bustKey] || "";
  if (bustDesc) parts.push(bustDesc);

  if (bustKey === "extra large") {
    const bodyIdx = parts.findIndex(p => p.includes("slim body") || p.includes("narrow waist") || p.includes("petite"));
    if (bodyIdx >= 0) {
      parts[bodyIdx] = "slim toned body with narrow waist but very large chest";
    }
  }

  if (bodyKey === "slim" || bodyKey === "thin") {
    parts.push("lean angular face, no roundness or puffiness in face");
  } else if (bodyKey === "regular" || bodyKey === "average") {
    parts.push("soft face but not fat, no round chubby face");
  }
  
  const hairStyleMatch = char.description?.match(/^(.*?)\s*hair\./i);
  let hairStyle = hairStyleMatch?.[1]?.trim() || "";
  const hairColour = char.hair || "";
  const mappedHairColour = hairColour.toLowerCase() === "blonde" ? "cool white-blonde" : hairColour;
  if (hairStyle.toLowerCase() === "bangs") {
    parts.push(`long ${mappedHairColour} hair draped over shoulders onto chest with soft curtain-parted bangs framing face, IMPORTANT: curtain bangs not flat fringe, hair must be long draped over shoulders in every image`.trim());
  } else if (hairStyle.toLowerCase() === "straight") {
    const strandChance = Math.random() < 0.4 ? " with several thick strands falling onto cheeks" : "";
    parts.push(`long straight ${mappedHairColour} hair${strandChance}, draped over shoulders onto chest, naturally parted, IMPORTANT: hair must be long draped over shoulders in every image`.trim());
  } else if (hairStyle.toLowerCase() === "curly" || hairStyle.toLowerCase() === "wavy") {
    parts.push(`long ${mappedHairColour} hair with soft voluminous waves draped over shoulders onto chest, IMPORTANT: hair must be long draped over shoulders in every image`.trim());
  } else if (hairStyle || hairColour) {
    parts.push(`long ${hairStyle} ${mappedHairColour} hair draped over shoulders onto chest`.trim());
  }
  
  if (char.eye) {
    const eyeMap: Record<string, string> = {
      blue: "subtle dark grey-blue",
      green: "dark rich emerald-green",
      brown: "warm deep brown",
    };
    const eyeKey = char.eye.toLowerCase();
    const eyeColour = eyeMap[eyeKey] || char.eye;
    parts.push(`${eyeColour} eyes`);
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

/* ── Grok-3 prompt rewriter ──────────────────────────────
 * Converts short user scene text + character data into one
 * dataset-style prompt (~180 words, 9-section structure)
 * via a small Grok-3 chat call with few-shot examples.
 * Returns null on failure so caller falls back to template.
 */
async function rewritePromptWithGrok(
  userScene: string,
  photoType: string,
  bodyType: string | undefined,
  bustSize: string | undefined,
  expression: string | undefined,
  character: any,
  apiKey: string,
): Promise<string | null> {
  const photoTypeLabel = photoType === "selfie"
    ? "Casual iPhone selfie"
    : photoType === "mirror_selfie"
      ? "Casual iPhone mirror selfie"
      : "Casual iPhone photo";

  const desc = (character?.description || "").trim();
  const descAfterHair = desc.replace(/^.*?hair\.\s*/i, "").replace(/\[emoji:.+?\]/g, "").trim();
  const hasExplicitJewelry = /jewelry|jewellery|necklace|earring|bracelet|ring|pendant|choker/i.test(descAfterHair);
  const jewelryText = hasExplicitJewelry ? descAfterHair : "";

  const ctxParts: string[] = [];
  if (bodyType) ctxParts.push(`body type: ${bodyType}`);
  if (bustSize === "extra large") ctxParts.push(`bust: very large prominent breasts`);
  if (character?.country) ctxParts.push(`skin/ethnicity: ${character.country}`);
  if (character?.hair) ctxParts.push(`hair colour: ${character.hair}`);
  if (character?.style) ctxParts.push(`makeup style: ${character.style}`);
  if (expression) ctxParts.push(`expression: ${expression}`);
  if (jewelryText) ctxParts.push(`jewelry to include: ${jewelryText}`);
  else ctxParts.push(`jewelry: NONE — do not add any jewelry`);
  if (!character?.style) ctxParts.push(`makeup: NONE specified — keep makeup minimal and natural, do not invent specific products`);
  const characterContext = ctxParts.join("; ");

  const systemMsg = `You rewrite short photo descriptions into ONE detailed prompt that matches the exact style of the examples. The output goes to xAI's image edit endpoint along with separate reference images of a specific woman, so the prompt must NEVER mention "reference image", "same woman", "matching identity", "AI", or anything that hints this is generated. Write as a real photographer's brief.

CAMERA TYPE — STRICT:
- The user-given camera type prefix MUST be the literal first words of the prompt. If "Casual iPhone selfie", start with "Casual iPhone selfie of a woman ...". If "Casual iPhone photo", start with "Casual iPhone photo of a woman ...". If "Casual iPhone mirror selfie", start with "Casual iPhone mirror selfie of a woman ..." and the scene MUST take place in front of a mirror with phone visible in the reflection.
- A SELFIE means held with one hand at arm's length — pose must reflect this (no two-handed poses, no third-person framing).
- A PHOTO means third-person — someone else is taking it. Pose can be full body, hands free.
- A MIRROR SELFIE means standing in front of a full-length or bathroom mirror, phone visible in hand and reflection.

USER WORDS — LOCKED:
- Anything the user explicitly mentioned (outfit type, location, pose, lighting, props) MUST appear in your output as they intended.
- DO NOT replace, contradict, or "improve" user-supplied details.
- INVENT defaults ONLY for slots the user did NOT mention.

CHARACTER CONTEXT — STRICT:
- Use the body, hair colour, skin/ethnicity, makeup style, expression EXACTLY as given in the character context.
- JEWELRY: if the context says "jewelry: NONE — do not add any jewelry", DO NOT mention jewelry at all in your output. Skip section 6 entirely. If the context lists specific jewelry, include it verbatim using "Layered jewelry: [items]".
- MAKEUP: if the context lists a makeup style, write a natural matching makeup sentence. If the context says "makeup: NONE specified", keep makeup vague and minimal ("natural minimal makeup") — do NOT invent specific eyeliner colours, lip products, or brand-style descriptions.

OUTPUT FORMAT:
- ONE paragraph, sentences joined by periods.
- 150–200 words.
- No preamble, no quotes, no explanation, no markdown.
- Section order: (1) camera + scene + pose + body angle + expression / (2) body figure + skin tone / (3) hair / (4) outfit with fabric and fit / (5) makeup (only if applicable) / (6) jewelry (only if listed in context) / (7) lighting / (8) concrete named background props ending in "fully sharp in background" / (9) shot angle + camera tech tail.
- BACKGROUND: name 2-3 concrete props or surfaces ("beige pillows and fabric", "turquoise pool water and stone patio", "white tile bathroom with chrome fixtures") then "fully sharp in background".
- END WITH EXACTLY this verbatim tail: "entire image completely sharp edge to edge with deep depth of field and zero background blur or bokeh, flat iPhone dynamic range not DSLR, realistic skin with visible pore texture and micro-detail no airbrushed smoothness no freckles no moles, subtle digital camera noise and compression artefacts, candid not studio, slightly imperfect framing, natural asymmetry in hair and makeup."`;

  const example1 = "Casual iPhone selfie of a woman lying on a beige textured couch, propped up on her left elbow with left hand in her hair, head tilted slightly, body angled toward camera, direct eye contact with relaxed sultry expression lips slightly parted. Curvaceous hourglass figure with very large prominent breasts, narrow waist, wide hips, toned slim arms, flat toned stomach, fit figure, fair skin. Long center-parted blonde hair with two loose side braids and face-framing strands. Wearing a tight white ribbed-knit long-sleeve bodysuit with deep plunging asymmetrical neckline showing maximum cleavage, high-cut at hips with thin white underwear straps visible. Natural makeup with heavy black winged eyeliner, full lashes, rosy blush, glossy nude-pink lips. Layered jewelry: small white pearl strand necklace, thin gold chain with tiny rectangular pendant, small silver hoop earring. Warm bedside lamp lighting from behind creating uneven harsh glow with blown-out highlights on the wall behind her and real shadows across one side of her face, specular highlights on nose and lip, slight sheen on skin. Cozy bedroom with beige pillows and fabric fully sharp in background. Shot from close three-quarter overhead angle on iPhone front camera, entire image completely sharp edge to edge with deep depth of field and zero background blur or bokeh, flat iPhone dynamic range not DSLR, realistic skin with visible pore texture and micro-detail no airbrushed smoothness no freckles no moles, subtle digital camera noise and compression artefacts, candid not studio, slightly imperfect framing, natural asymmetry in hair and makeup.";

  const example2 = "Casual iPhone photo of a woman sitting on the edge of a swimming pool with her legs dangling in the water, leaning back on both hands behind her, head tilted slightly toward camera, direct eye contact with relaxed sultry expression lips slightly parted. Curvaceous hourglass figure with very large prominent breasts, narrow waist, wide hips, toned slim arms, flat toned stomach, fit figure, fair skin. Long center-parted blonde hair loose and slightly damp with face-framing strands. Wearing a tiny white triangle string bikini with deep plunging top showing maximum cleavage and matching low-rise tie-side bottoms sitting high on her hips. Natural makeup with heavy black winged eyeliner, full lashes, rosy blush, glossy nude-pink lips. Layered jewelry: small white pearl strand necklace, thin gold chain with tiny rectangular pendant, small silver hoop earring. Harsh direct overhead midday sunlight creating strong real shadows across one side of her face, specular highlights on nose and lip, slight sheen on skin. Turquoise swimming pool water and sun-bleached stone patio fully sharp in background. Shot from standing three-quarter angle slightly above on iPhone camera, entire image completely sharp edge to edge with deep depth of field and zero background blur or bokeh, flat iPhone dynamic range not DSLR, realistic skin with visible pore texture and micro-detail no airbrushed smoothness no freckles no moles, subtle digital camera noise and compression artefacts, candid not studio, slightly imperfect framing, natural asymmetry in hair and makeup.";

  const example3 = "Casual iPhone selfie of a woman sitting cross-legged on a messy unmade bed, one hand holding phone up, other hand pulling the collar of her hoodie to one side exposing her shoulder and collarbone, head tilted slightly, direct eye contact with relaxed sultry expression lips slightly parted. Curvaceous hourglass figure with very large prominent breasts, narrow waist, wide hips, toned slim arms, flat toned stomach, fit figure, warm golden skin. Long straight jet black hair with vivid pink dyed ends loose and slightly messy with face-framing strands. Wearing an oversized cream cropped hoodie pulled off one shoulder showing bare shoulder and collarbone with deep cleavage visible at the neckline, paired with tiny black cotton shorts barely visible under the hoodie hem. Soft natural makeup with thin brown eyeliner, wispy lashes, peachy blush, glossy mauve lips. Layered jewelry: thin silver chain choker, small gold hoop earrings, delicate silver ring on index finger. Warm fairy light string lighting draped on the wall behind creating soft uneven glow with real shadows across one side of her face, specular highlights on nose and lip, slight sheen on skin. Cozy bedroom with white walls and pinned polaroid photos fully sharp in background. Shot from close front-on slightly above angle on iPhone front camera, entire image completely sharp edge to edge with deep depth of field and zero background blur or bokeh, flat iPhone dynamic range not DSLR, realistic skin with visible pore texture and micro-detail no airbrushed smoothness no freckles no moles, subtle digital camera noise and compression artefacts, candid not studio, slightly imperfect framing, natural asymmetry in hair and makeup.";

  const userMsg = `User input: "${userScene}"
Camera type to use: ${photoTypeLabel}
Character context to use: ${characterContext}

EXAMPLE 1 (couch bodysuit selfie):
${example1}

EXAMPLE 2 (pool bikini photo):
${example2}

EXAMPLE 3 (bedroom hoodie selfie, asian pink hair):
${example3}

Now write ONE prompt in the exact same style for the user input above. Output only the rewritten prompt.`;

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: userMsg },
        ],
        temperature: 0.7,
        max_tokens: 700,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("Grok rewrite failed:", response.status, errText);
      return null;
    }
    const data = await response.json();
    const rewritten = data?.choices?.[0]?.message?.content?.trim();
    if (!rewritten || rewritten.length < 100) {
      console.error("Grok rewrite empty/short:", rewritten);
      return null;
    }
    console.log("REWRITTEN PROMPT:", rewritten);
    return rewritten;
  } catch (err) {
    console.error("Grok rewrite threw:", err);
    return null;
  }
}

/* ── build final photo prompt (dataset-matching structure, no reference language) ── */
function buildFinalPrompt(
  scenePrompt: string,
  photoType: string,
  _characterTraits: string | null,
  bodyType?: string,
  expression?: string,
  bustSize?: string,
  character?: any,
): string {
  const parts: string[] = [];

  // 1. CAMERA + SCENE + EXPRESSION
  // The scene prompt from the user carries pose, location, outfit, props, lighting.
  // We only prepend the camera type and append the expression.
  let camera = CAMERA_PHOTO;
  if (photoType === "selfie") camera = CAMERA_SELFIE;
  else if (photoType === "mirror_selfie") camera = CAMERA_MIRROR;

  const exprStr = expression
    ? (PHOTO_EXPR[expression] || expression)
    : "direct eye contact with relaxed sultry expression lips slightly parted";

  parts.push(`${camera} ${scenePrompt}, ${exprStr}`);

  // 2. BODY (figure + bust + skin tone)
  const normBody = normalizeBodyType((bodyType || "regular").toLowerCase());
  const bodyDesc = PHOTO_BODY_DESC[normBody] || PHOTO_BODY_DESC.regular;
  const bustKey = (bustSize === "xl" || bustSize === "extra large") ? "extra large" : "regular";
  const skinKey = (character?.country || "").toLowerCase();
  const skinTone = PHOTO_SKIN_TONE[skinKey] || "fair skin";

  const bodyWithBust = bustKey === "extra large"
    ? `${bodyDesc.replace(/(with )/, `with very large prominent breasts, `)}, ${skinTone}`
    : `${bodyDesc}, ${skinTone}`;
  parts.push(bodyWithBust);

  // 3. HAIR
  if (character) {
    const hairStyleMatch = character.description?.match(/^(.*?)\s*hair\./i);
    const hairStyle = (hairStyleMatch?.[1]?.trim() || "").toLowerCase();
    const hairColour = character.hair || "";
    const mappedColour = hairColour.toLowerCase() === "blonde" ? "cool white-blonde" : hairColour;
    let hairDesc = `Long ${mappedColour} hair draped over shoulders with face-framing strands`.trim();
    if (hairStyle === "bangs") {
      hairDesc = `Long center-parted ${mappedColour} hair with soft curtain bangs and face-framing strands, draped over shoulders`;
    } else if (hairStyle === "straight") {
      hairDesc = `Long straight center-parted ${mappedColour} hair draped over shoulders with face-framing strands`;
    } else if (hairStyle === "curly" || hairStyle === "wavy") {
      hairDesc = `Long ${mappedColour} hair with soft voluminous waves draped over shoulders with face-framing strands`;
    } else if (hairStyle) {
      hairDesc = `Long ${hairStyle} ${mappedColour} hair draped over shoulders with face-framing strands`.trim();
    }
    parts.push(hairDesc);
  }

  // 4. MAKEUP — only if character has style set AND scene prompt doesn't already describe makeup
  const sceneHasMakeup = /makeup|eyeliner|mascara|lipstick|lip gloss|blush/i.test(scenePrompt);
  if (character && !sceneHasMakeup) {
    const mk = (character.style || "").toLowerCase();
    if (mk === "natural") {
      parts.push("Natural makeup with heavy black winged eyeliner, full lashes, rosy blush, glossy nude-pink lips");
    } else if (mk === "classic") {
      parts.push("Classic polished makeup with defined eyeliner, full lashes, subtle contour, mascara, glossy lip colour");
    } else if (mk) {
      parts.push(`${mk} makeup with defined eyeliner, full lashes, blush, glossy lips`);
    }
  }

  // 5. JEWELRY — only if character description has extras AND scene doesn't mention them
  const sceneHasJewelry = /jewelry|jewellery|necklace|earring|bracelet|ring|pendant|choker/i.test(scenePrompt);
  if (character?.description && !sceneHasJewelry) {
    const extras = character.description.replace(/^.*?hair\.\s*/i, "").replace(/\[emoji:.+?\]/g, "").trim();
    if (extras) {
      const hasJewelryInExtras = /jewelry|jewellery|necklace|earring|bracelet|ring|pendant|choker/i.test(extras);
      parts.push(hasJewelryInExtras ? extras : `Layered jewelry: ${extras}`);
    }
  }

  // 6. LIGHTING — only if scene prompt doesn't already describe it
  const sceneHasLight = /light|glow|shadow|sun|lamp|neon|golden.hour|backlit|moonlight|fluorescent|dim|bright/i.test(scenePrompt);
  if (!sceneHasLight) {
    parts.push("Natural lighting from the side creating uneven glow with real shadows across one side of her face, specular highlights on nose and lip, slight sheen on skin");
  }

  // 7. BACKGROUND — force concrete sharpness on background environment and props
  parts.push(`Every object and surface in the background fully sharp in focus, no bokeh, no shallow depth of field, background environment and props crystal clear`);

  // 8. CAMERA ANGLE + FULL TECH TAIL
  let angleLine = "";
  if (photoType === "selfie") {
    angleLine = "Shot from close three-quarter angle on iPhone front camera";
  } else if (photoType === "mirror_selfie") {
    angleLine = "Shot from front-on chest height on iPhone front camera with phone visible in the mirror reflection";
  } else {
    angleLine = "Shot from standing three-quarter angle on iPhone camera";
  }

  parts.push(`${angleLine}, entire image completely sharp edge to edge with deep depth of field and zero background blur or bokeh, flat iPhone dynamic range not DSLR, realistic skin with visible pore texture and micro-detail no airbrushed smoothness no freckles no moles, subtle digital camera noise and compression artefacts, candid not studio, slightly imperfect framing, natural asymmetry in hair and makeup`);

  const finalPrompt = parts.filter(Boolean).join(". ");
  console.log("FINAL PROMPT:", finalPrompt);
  return finalPrompt;
}

/* ── check for content policy errors ───────────────────── */
function isContentPolicyError(status: number, text: string): boolean {
  if (status < 400 || status >= 500) return false;
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
    body.image = { url: imageUrls[0], type: "image_url" };
  } else {
    body.images = imageUrls.map((url) => ({ url, type: "image_url" }));
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
  userId: string,
  previousFaces: string[] = []
): Promise<string[]> {
  const variations = [
    "big round doe-eyes, small button-nose, soft lips, soft-round face, smooth-chin, SAME hair style and colour as described",
    "very large doe-eyes, small button-nose, soft natural lips, soft-round face, smooth-chin, SAME hair style and colour as described",
    "large bright almond-eyes, small button-nose, soft lips, slim oval face, smooth-chin, SAME hair style and colour as described",
  ];

  const makeupVariations = [
    "defined mascara, eyeliner, eyeshadow, blush, lip tint, polished influencer makeup",
    "mascara, eyeliner, light eyeshadow, blush, natural polished makeup",
    "defined mascara, eyeliner, eyeshadow, blush, lip colour, glam makeup",
  ];

  const beautyCore = "extremely attractive young-woman, soft-rounded jaw, small-rounded chin, slim face, very small button-nose, skin with visible pores and colour variation, long styled hair past shoulders, plump lips with soft pink tint, mascara, eyeliner, eyeshadow, blush, confident subtle closed-mouth smile";

  const imageUrls: string[] = [];
  const targetCount = Math.min(count, 3);
  const previousSet = new Set(previousFaces.filter(Boolean));

  for (let i = 0; i < targetCount; i++) {
    const variation = variations[i] || variations[0];
    const makeupVar = makeupVariations[i] || makeupVariations[0];
    const faceOnlyPrompt = stripFacePromptBodyLanguage(prompt);

    let tonedPrompt = faceOnlyPrompt;

    const blondePattern = /\b(cool\s+white-blonde|white-blonde|platinum-blonde|blonde)\b/i;
    if (blondePattern.test(tonedPrompt)) {
      const picks = ["cool white-blonde", "cool white-blonde", "light platinum-blonde"];
      tonedPrompt = tonedPrompt.replace(blondePattern, picks[Math.floor(Math.random() * picks.length)]);
    }

    const raceFeatures: Record<string, string> = {
      asian: ", east-asian eyelid-fold, flatter nose-bridge, soft round face, clearly asian complexion, warm skin not orange, no green cast",
      black: ", fuller natural lips, wider soft nose, slim face, brown-toned blush, brown lip colour, visible makeup",
      dark: ", fuller natural lips, wider soft nose, slim face, brown-toned blush, brown lip colour, visible makeup",
      tan: ", defined brow-bone, olive warm undertone, strong lashes",
    };
    let raceAppend = "";
    for (const [key, features] of Object.entries(raceFeatures)) {
      if (tonedPrompt.toLowerCase().includes(key + " skin") || tonedPrompt.toLowerCase().includes(key + " tone")) {
        raceAppend = features;
        break;
      }
    }

    const regenDiscriminator = `variation token ${crypto.randomUUID().slice(0, 8)}, distinct facial micro-choices, clearly different option set from previous generated faces while preserving same identity`;
    const positivePrompt = `${tonedPrompt}, ${beautyCore}, ${makeupVar}, ${variation}${raceAppend}. ${FACE_QUALITY}, ${regenDiscriminator}`;
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
        if (previousSet.has(permanentUrl)) {
          console.warn(`Face ${i + 1} matched previous stored URL, retrying...`);
          if (retries < maxRetries) {
            retries++;
            await new Promise(r => setTimeout(r, 700));
            continue;
          }
        }
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
  thin: "slim toned body, narrow waist, lean figure",
  regular: "soft feminine body, defined waist, feminine hips",
  average: "soft feminine body, defined waist, feminine hips",
  curvy: "curvy feminine figure, defined waist, wider hips, soft thighs, hourglass shape",
  thick: "curvy feminine figure, defined waist, wider hips, soft thighs, hourglass shape",
};

/* ── generate 3/4 angle + full-body anchor from reference face ── */
async function generateAngleAndBody(
  faceUrl: string,
  characterTraits: string,
  bodyType: string,
  bustSize: string,
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
      const rawAngleBust = (bustSize || "regular").toLowerCase();
      const angleBustKey = (rawAngleBust === "xl" || rawAngleBust === "extra large") ? "extra large" : "regular";
      const bustDesc = BUST_SIZE_MAP[angleBustKey] || "";
      const anglePrompt = `The exact same woman as in the reference image, 100% identical facial features, exact same face shape, eye shape and color, nose, lips, jawline, IDENTICAL hair color tone highlights and style with no warmth or coolness shift, identical skin tone and texture, preserve every detail from the reference. A ${characterTraits.includes('young-woman') ? 'young-woman' : 'woman'} with ${characterTraits}. ${bustDesc}. Tight white v-neck top, same white background, same lighting, entire image completely sharp edge to edge with deep depth of field and zero background blur or bokeh. Head turned 45 degrees to the left showing 3/4 profile. Framed from top of head to stomach. Realistic skin with visible pore texture and micro-detail no airbrushed smoothness no freckles no moles. Relaxed neutral expression, lips together.`;
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
      const bodyKey = normalizeBodyType((bodyType || "regular").toLowerCase());
      const bodyDesc = BODY_ANCHOR_MAP[bodyKey] || BODY_ANCHOR_MAP.regular;
      const rawBodyBust = (bustSize || "regular").toLowerCase();
      const bustKey = (rawBodyBust === "xl" || rawBodyBust === "extra large") ? "extra large" : "regular";
      const bustDesc = BUST_SIZE_MAP[bustKey] || "";

      const bodyPrompt = `The exact same woman as in the reference image, 100% identical facial features, exact same face shape, eye shape and color, nose, lips, jawline, IDENTICAL hair color tone highlights and style with no warmth or coolness shift, identical skin tone and texture, preserve every detail from the reference. Petite young woman, standing straight upright facing camera, relaxed natural posture, arms behind back. Tight white v-neck top tucked into leggings, ${bustDesc}, visible cleavage, chest filling the top. Tight black leggings. Same white background, same lighting, entire image completely sharp edge to edge with deep depth of field and zero background blur or bokeh. ${bodyDesc}, natural feminine body not athletic not muscular, smooth flat-stomach. Realistic skin with visible pore texture and micro-detail no airbrushed smoothness no freckles no moles. Neutral relaxed expression, lips together. Framed with space above head down to mid-thigh.`;
      console.log("Body anchor prompt:", bodyPrompt.slice(0, 200));
      const bodyResult = await xaiImageEdit(bodyPrompt, [faceUrl], apiKey, "2:3");
      if (bodyResult) {
        bodyAnchorUrl = await storeImagePermanently(bodyResult, userId, adminClient, "body");
      }
      console.log("Body anchor generated:", bodyAnchorUrl?.slice(0, 80));
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
    return await xaiImageEdit(finalPrompt, faceImageUrls, apiKey, safeRatio);
  }
  return await xaiTextToImage(finalPrompt, apiKey);
}

/* ── handler ───────────────────────────────────────────── */
/* ── banned words filter ────────────────────────────────── */
const BANNED_WORDS = [
  "naked", "nude", "topless", "tits", "nipples", "butthole", "pussy",
  "dick", "cock", "penis", "vagina", "asshole", "anal", "cum", "sex",
  "fuck", "porn",
];
const BANNED_RE = new RegExp(`\\b(${BANNED_WORDS.join("|")})\\b`, "i");

/* ── helper: check if user is in onboarding (not yet completed) ── */
async function isOnboardingUser(adminClient: any, userId: string): Promise<boolean> {
  const { data: profile } = await adminClient
    .from("profiles")
    .select("onboarding_complete")
    .eq("user_id", userId)
    .single();
  return profile ? !profile.onboarding_complete : true;
}

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

    if (isRateLimited(userId)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded — max 10 per minute" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const rawPrompt = body?.prompt;
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
    const previousFaces = Array.isArray(body?.previous_faces)
      ? body.previous_faces.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
      : [];

    /* ── banned words check ── */
    if (rawPrompt && BANNED_RE.test(rawPrompt)) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await logRejectedPrompt(adminClient, userId, rawPrompt);
      return new Response(
        JSON.stringify({ error: "Prompt not allowed", code: "CONTENT_POLICY" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ── SINGLE PHOTO REGENERATION FLOW (angle or body) ── */
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

      /* ── onboarding check + atomic slot claim for free regen ── */
      const onboarding = await isOnboardingUser(adminClient, userId);
      let creditData: { balance: number } | null = null;
      if (onboarding) {
        const counterCol = regenerateSingle === "angle" ? "onboarding_angle_regens_used" : "onboarding_body_regens_used";
        // Conditional update claims the slot only if it has not been used yet.
        // If another concurrent request already claimed it, 0 rows are returned.
        const { data: claimed } = await adminClient
          .from("profiles")
          .update({ [counterCol]: 1, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq(counterCol, 0)
          .select(counterCol);
        if (!claimed || claimed.length === 0) {
          return new Response(
            JSON.stringify({ error: "Regen limit reached", code: "ONBOARDING_REGEN_LIMIT" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Slot claimed successfully — regen is FREE during onboarding, no gem deduction.
      } else {
        /* ── non-onboarding users: normal gem deduction ── */
        const { data: cd } = await adminClient
          .from("credits")
          .select("balance")
          .eq("user_id", userId)
          .single();
        creditData = cd;
        if (!creditData || creditData.balance < GEM_COST_SINGLE_REGEN) {
          return new Response(
            JSON.stringify({ error: "No gems remaining", code: "NO_GEMS" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        await adminClient
          .from("credits")
          .update({ balance: creditData.balance - GEM_COST_SINGLE_REGEN, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      }

      // Always fetch fresh character data from DB
      const { data: charData } = await adminClient
        .from("characters")
        .select("*")
        .eq("id", singleCharId)
        .eq("user_id", userId)
        .single();

      if (!charData || !charData.face_image_url) {
        if (creditData) await adminClient.from("credits").update({ balance: creditData.balance, updated_at: new Date().toISOString() }).eq("user_id", userId);
        return new Response(JSON.stringify({ error: "Character not found or missing face image" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const oldUrl = regenerateSingle === "angle" ? charData.face_angle_url : charData.body_anchor_url;

      const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
      if (!XAI_API_KEY) throw new Error("XAI_API_KEY is not configured");

      const traits = buildCharacterTraits(charData);
      const dbBodyType = normalizeBodyType((charData.body || "regular").toLowerCase());
      const dbBustSize = (charData.bust_size || "regular").toLowerCase();

      const freshFaceUrl = charData.face_image_url;
      console.log(`=== SINGLE REGENERATION: ${regenerateSingle} (using fresh DB face URL) ===`);

      try {
        const { angleUrl, bodyAnchorUrl } = await generateAngleAndBody(
          freshFaceUrl, traits, dbBodyType, dbBustSize, XAI_API_KEY, adminClient, userId, regenerateSingle
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


        await logGeneration(adminClient, userId, singleCharId, "character references", regenerateSingle, GEM_COST_SINGLE_REGEN, true);

        return new Response(
          JSON.stringify({
            angle_url: angleUrl,
            body_anchor_url: bodyAnchorUrl,
            gems_remaining: creditData ? creditData.balance - GEM_COST_SINGLE_REGEN : undefined,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e: any) {
        if (creditData) await adminClient.from("credits").update({ balance: creditData.balance, updated_at: new Date().toISOString() }).eq("user_id", userId);
        console.error("Single regeneration error:", e);
        if (e?.contentPolicy) {
          await logRejectedPrompt(adminClient, userId, "character references");
          await logGeneration(adminClient, userId, singleCharId, "character references", regenerateSingle, 0, false, "content_policy");
          return new Response(
            JSON.stringify({ error: "prompt not allowed", code: "CONTENT_POLICY" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        await logGeneration(adminClient, userId, singleCharId, "character references", regenerateSingle, 0, false, e?.message || "unknown");
        return new Response(
          JSON.stringify({ error: "generation error" }),
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

      /* ── deduct gems for angle + body (skipped during onboarding) ── */
      const onboardingAngleBody = await isOnboardingUser(adminClient, userId);
      let creditData: { balance: number } | null = null;
      if (!onboardingAngleBody) {
        let angleCost = 0;
        if (regenerateTarget === "angle") angleCost = GEM_COST_ANGLE;
        else if (regenerateTarget === "body") angleCost = GEM_COST_BODY;
        else angleCost = GEM_COST_ANGLE + GEM_COST_BODY; // both

        const { data: cd } = await adminClient
          .from("credits")
          .select("balance")
          .eq("user_id", userId)
          .single();
        creditData = cd;
        if (!creditData || creditData.balance < angleCost) {
          return new Response(
            JSON.stringify({ error: "No gems remaining", code: "NO_GEMS" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        await adminClient
          .from("credits")
          .update({ balance: creditData.balance - angleCost, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      }

      let dbBodyType = "regular";
      let dbBustSize = "regular";
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
          dbBodyType = normalizeBodyType((charData.body || "regular").toLowerCase());
          dbBustSize = (charData.bust_size || "regular").toLowerCase();
          console.log("Built character traits from DB:", traits.slice(0, 120));
          console.log("Body type from DB:", dbBodyType, "| Bust size:", dbBustSize);
        }

        if (charData?.face_angle_url && charData?.body_anchor_url) {
          if (creditData) {
            await adminClient.from("credits").update({ balance: creditData.balance, updated_at: new Date().toISOString() }).eq("user_id", userId);
          }
          console.log("Angle + body already exist, skipping generation for character:", angleCharacterId);
          return new Response(
            JSON.stringify({ angle_url: charData.face_angle_url, body_anchor_url: charData.body_anchor_url, skipped: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { angleUrl, bodyAnchorUrl } = await generateAngleAndBody(
        selectedFaceUrl, traits, dbBodyType, dbBustSize, Deno.env.get("XAI_API_KEY")!, adminClient, userId, regenerateTarget
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
    let characterBustSize: string | undefined;
    let faceImageUrls: string[] = [];
    let charData: any = null;
    if (characterId) {
      const { data: cd } = await adminClient
        .from("characters")
        .select("*")
        .eq("id", characterId)
        .eq("user_id", userId)
        .single();

      charData = cd;
      if (charData) {
        characterTraits = buildCharacterTraits(charData);
        characterBodyType = normalizeBodyType((charData.body || "regular").toLowerCase());
        characterBustSize = (charData.bust_size || "regular").toLowerCase();
        if (charData.face_image_url) faceImageUrls.push(charData.face_image_url);
        if (charData.face_angle_url) faceImageUrls.push(charData.face_angle_url);
        if (charData.body_anchor_url) faceImageUrls.push(charData.body_anchor_url);
      }
    }

    if (vibeReferenceUrl) {
      faceImageUrls.push(vibeReferenceUrl);
    }

    /* ── STANDARD GEM-BASED FLOW (faces + photos) ── */
    const isFaceRegen = body?.face_regen === true;
    const gemCost = isFaceRegen ? GEM_COST_FACE_REGEN : GEM_COST_PHOTO;

    /* ── onboarding face regen limit check (atomic slot claim) ── */
    // Only enforce the limit on actual regens (when previous_faces is provided),
    // not on the initial face generation.
    const isActualRegen = isFaceRegen && Array.isArray(body?.previous_faces) && body.previous_faces.length > 0;
    const onboardingFace = await isOnboardingUser(adminClient, userId);
    if (isActualRegen && onboardingFace) {
      const { data: claimed } = await adminClient
        .from("profiles")
        .update({ onboarding_face_regens_used: 1, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("onboarding_face_regens_used", 0)
        .select("onboarding_face_regens_used");
      if (!claimed || claimed.length === 0) {
        return new Response(
          JSON.stringify({ error: "Regen limit reached", code: "ONBOARDING_REGEN_LIMIT" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    /* ── onboarding: block photo generation (only faces/angles/body allowed) ── */
    if (!isFaceRegen && !generateAngles) {
      const onboarding = await isOnboardingUser(adminClient, userId);
      if (onboarding) {
        return new Response(
          JSON.stringify({ error: "Complete onboarding first", code: "ONBOARDING_BLOCKED" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    /* ── deduct gems (skipped during onboarding for free face gen/regen) ── */
    let creditData: { balance: number } | null = null;
    if (!onboardingFace) {
      const { data: cd } = await adminClient
        .from("credits")
        .select("balance")
        .eq("user_id", userId)
        .single();
      creditData = cd;
      if (!creditData || creditData.balance < gemCost) {
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
          balance: creditData.balance - gemCost,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) throw new Error("XAI_API_KEY is not configured");

    let imageUrls: string[];
    try {
      if (isFaceRegen) {
        imageUrls = await generateFaceImages(prompt, 3, XAI_API_KEY, adminClient, userId, previousFaces);
      } else {
        console.log("Aspect ratio:", aspectRatio, "| Photo type:", photoType, "| Character:", characterId);
        console.log("Face references:", faceImageUrls.length);

        let finalPrompt = await rewritePromptWithGrok(prompt, photoType, characterBodyType, characterBustSize, expression, charData, XAI_API_KEY);
        if (!finalPrompt) {
          console.log("Grok rewrite failed, using deterministic fallback");
          finalPrompt = buildFinalPrompt(prompt, photoType, characterTraits, characterBodyType, expression, characterBustSize, charData);
        }
        const grokResult = await generatePhoto(finalPrompt, faceImageUrls, XAI_API_KEY, aspectRatio);
        const result = grokResult ? await storeImagePermanently(grokResult, userId, adminClient, "photo") : null;

        if (result) {
          imageUrls = [result];
        } else {
          imageUrls = [];
        }
      }
    } catch (e: any) {
      if (creditData) await adminClient
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
          JSON.stringify({ error: "generation error" }),
          { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Generation error:", e);
      await logGeneration(adminClient, userId, characterId, prompt, genType, 0, false, e?.message || "unknown");
      return new Response(
        JSON.stringify({ error: "generation error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (imageUrls.length === 0) {
      if (creditData) await adminClient
        .from("credits")
        .update({
          balance: creditData.balance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      return new Response(
        JSON.stringify({ error: "generation error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const genType = isFaceRegen ? "face" : "photo";

    if (!isFaceRegen) {
      await adminClient.from("generations").insert({
        user_id: userId,
        prompt: rawPrompt,
        image_urls: imageUrls,
        character_id: characterId || null,
      });
    }

    await logGeneration(adminClient, userId, characterId, prompt, genType, gemCost, true);

    return new Response(
      JSON.stringify({
        images: imageUrls,
        gems_remaining: creditData ? creditData.balance - gemCost : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate error:", e);
    return new Response(
      JSON.stringify({ error: "generation error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
