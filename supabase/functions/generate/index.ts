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

/* ── photo prompt constants ────────────────────────────── */
const PHOTO_IDENTITY = "Exact same woman as the two uploaded face reference images, identical face from every angle, perfect face match to both references";

const PHOTO_BODY_FIGURE: Record<string, Record<string, string>> = {
  slim: {
    regular: "Slim toned figure with full C-D cup breasts, narrow waist, narrow hips, toned slim arms, flat toned stomach, fit figure",
    "extra large": "Slim toned figure with very large prominent breasts, narrow waist, narrow hips, toned slim arms, flat toned stomach, fit figure",
  },
  regular: {
    regular: "Hourglass figure with full C-D cup breasts, defined waist, feminine hips, toned slim arms, flat toned stomach, fit figure",
    "extra large": "Hourglass figure with very large prominent breasts, defined waist, feminine hips, toned slim arms, flat toned stomach, fit figure",
  },
  curvy: {
    regular: "Curvaceous hourglass figure with full C-D cup breasts, narrow waist, wide hips, toned slim arms, flat toned stomach, fit figure",
    "extra large": "Curvaceous hourglass figure with very large prominent breasts, narrow waist, wide hips, toned slim arms, flat toned stomach, fit figure",
  },
  thick: {
    regular: "Curvaceous hourglass figure with full C-D cup breasts, narrow waist, wide hips, toned slim arms, flat toned stomach, fit figure",
    "extra large": "Curvaceous hourglass figure with very large prominent breasts, narrow waist, wide hips, toned slim arms, flat toned stomach, fit figure",
  },
};

const PHOTO_SKIN_TONE: Record<string, string> = {
  white: "fair skin",
  pale: "very pale fair skin",
  tan: "warm olive skin",
  asian: "warm golden skin",
  black: "rich dark skin",
  dark: "rich dark skin",
};

const PHOTO_MAKEUP = "Natural makeup with defined eyeliner, full lashes, rosy blush, glossy nude-pink lips";

const PHOTO_CAMERA_ANGLE: Record<string, string> = {
  selfie: "Shot from close overhead three-quarter angle on iPhone front camera",
  photo: "Shot from standing three-quarter angle on iPhone camera",
  mirror_selfie: "Shot from front-on chest height on iPhone front camera",
};

const PHOTO_TECH_TAIL = "entire image completely sharp edge to edge with deep depth of field and zero background blur or bokeh, flat iPhone dynamic range not DSLR, realistic skin with visible pore texture and micro-detail no airbrushed smoothness no freckles no moles, subtle digital camera noise and compression artefacts, candid not studio, slightly imperfect framing, natural asymmetry in hair and makeup";

/* ── face generation constants ─────────────────────────── */
const FACE_IDENTITY_TAIL = "Passport photo, plain white background, face and upper shoulders centred with space above head, low-scoop white top at neckline, soft even lighting, looking at camera, confident subtle closed-mouth smile. Realistic skin with visible pore texture and micro-detail no airbrushed smoothness no freckles no moles, sharp focus, matte finish.";

const FACE_AGE_DESC: Record<string, string> = {
  young: "20 year old young-woman with round soft face, soft cheeks, big bright-eyes, small-nose, natural lips, smooth skin, soft jaw, small-chin, youthful compact features",
  older: "24 year old woman with visible cheekbones, clean jawline, balanced features, clear skin",
};

const FACE_RACE_FEATURES: Record<string, string> = {
  asian: "East-asian eyelid-fold, flatter nose-bridge, soft round face, clearly asian complexion, warm skin not orange, no green cast",
  black: "Fuller natural lips, wider soft nose, slim face, brown-toned blush, brown lip colour, visible makeup",
  dark: "Fuller natural lips, wider soft nose, slim face, brown-toned blush, brown lip colour, visible makeup",
  tan: "Defined brow-bone, olive warm undertone, strong lashes",
};

const FACE_VARIATIONS = [
  "Big round doe-eyes, small button-nose, soft lips, soft-round face, smooth-chin",
  "Very large doe-eyes, small button-nose, soft natural lips, soft-round face, smooth-chin",
  "Large bright almond-eyes, small button-nose, soft lips, slim oval face, smooth-chin",
];

const FACE_MAKEUP_VARIATIONS = [
  "Defined mascara, eyeliner, eyeshadow, blush, lip tint, polished influencer makeup",
  "Mascara, eyeliner, light eyeshadow, blush, natural polished makeup",
  "Defined mascara, eyeliner, eyeshadow, blush, lip colour, glam makeup",
];

/* ── angle/body generation constants ───────────────────── */
const REF_IDENTITY_SINGLE = "Exact same woman as the uploaded face reference image, identical face from every angle, perfect face match to the reference";
const REF_TECH_TAIL = "Realistic skin with visible pore texture and micro-detail no airbrushed smoothness no freckles no moles, entire image completely sharp edge to edge, matte finish";

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

const normalizeBodyType = (v: string) => {
  const k = v.toLowerCase();
  if (k === "thin") return "slim";
  return k;
};


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
    let characterHairStyle = "straight";
    let characterHairColour = "";
    let characterCountry = "";
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
        characterBodyType = normalizeBodyType((charData.body || "regular").toLowerCase());
        characterBustSize = (charData.bust_size || "regular").toLowerCase();
        const hairMatch = charData.description?.match(/^(.*?)\s*hair\./i);
        characterHairStyle = (hairMatch?.[1]?.trim() || "straight").toLowerCase();
        characterHairColour = charData.hair?.toLowerCase() === "blonde" ? "cool white-blonde" : (charData.hair || "");
        characterCountry = (charData.country || "").toLowerCase();
        if (charData.face_image_url) faceImageUrls.push(charData.face_image_url);
        if (charData.face_angle_url) faceImageUrls.push(charData.face_angle_url);
        // temporarily disabled: body anchor reference
        // if (charData.body_anchor_url) faceImageUrls.push(charData.body_anchor_url);
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
    let sceneExpansion: { scene: string; hair_context: string; outfit: string; lighting: string; background: string } | null = null;
    let finalPrompt: string = prompt;
    try {
      if (isFaceRegen) {
        imageUrls = await generateFaceImages(prompt, 3, XAI_API_KEY, adminClient, userId, previousFaces);
      } else {
        console.log("Aspect ratio:", aspectRatio, "| Photo type:", photoType, "| Character:", characterId);
        console.log("Face references:", faceImageUrls.length);

        sceneExpansion = await expandSceneWithGrok(prompt, photoType, expression, characterBodyType, characterBustSize, characterHairStyle, characterHairColour, XAI_API_KEY);
        if (!sceneExpansion) console.log("Scene expansion failed, using fallback");
        finalPrompt = buildFinalPrompt(sceneExpansion, prompt, photoType, characterTraits, characterBodyType, expression, characterBustSize, characterCountry, characterHairStyle, characterHairColour);
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

    if (!isFaceRegen && sceneExpansion) {
      await logGeneration(adminClient, userId, characterId, JSON.stringify(sceneExpansion), "scene_expansion", 0, true);
    }
    const loggedPrompt = !isFaceRegen ? finalPrompt : prompt;
    await logGeneration(adminClient, userId, characterId, loggedPrompt, genType, gemCost, true);

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
