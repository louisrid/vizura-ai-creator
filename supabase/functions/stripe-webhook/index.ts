import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      throw new Error("Missing Stripe configuration");
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("No signature", { status: 400 });
    }

    // Verify signature
    const sigParts = signature.split(",");
    const timestampPart = sigParts.find(p => p.startsWith("t="));
    if (!timestampPart) {
      return new Response("Invalid signature format", { status: 400 });
    }

    const timestamp = parseInt(timestampPart.split("=")[1]);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      return new Response("Timestamp too old", { status: 400 });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(STRIPE_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signedPayload = `${timestamp}.${body}`;
    const expectedSig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    const expectedHex = Array.from(new Uint8Array(expectedSig))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const v1Sig = sigParts.find(p => p.startsWith("v1="))?.split("=")[1];
    if (expectedHex !== v1Sig) {
      return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(body);
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const metadata = session.metadata || {};
        const customerId = session.customer;

        if (metadata.type === "topup") {
          // One-time top-up: add credits
          const credits = parseInt(metadata.credits || "0");
          const userId = metadata.user_id;
          if (credits > 0 && userId) {
            const { data: creditRow } = await adminClient
              .from("credits")
              .select("balance")
              .eq("user_id", userId)
              .single();

            if (creditRow) {
              await adminClient
                .from("credits")
                .update({ balance: creditRow.balance + credits, updated_at: new Date().toISOString() })
                .eq("user_id", userId);
            } else {
              await adminClient
                .from("credits")
                .insert({ user_id: userId, balance: credits });
            }
          }
        } else if (metadata.type === "membership") {
          // Subscription: update subscriptions table
          const userId = metadata.user_id;
          const subscriptionId = session.subscription;

          if (userId && subscriptionId) {
            // Fetch subscription details from Stripe
            const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
              headers: { Authorization: `Basic ${btoa(STRIPE_SECRET_KEY + ":")}` },
            });
            const sub = await subRes.json();

            await adminClient.from("subscriptions").upsert({
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: sub.status || "active",
              current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            }, { onConflict: "user_id" });

            // Give initial membership credits
            const MEMBERSHIP_CREDITS = 50;
            const { data: creditRow } = await adminClient
              .from("credits")
              .select("balance")
              .eq("user_id", userId)
              .single();

            if (creditRow) {
              await adminClient
                .from("credits")
                .update({ balance: creditRow.balance + MEMBERSHIP_CREDITS, updated_at: new Date().toISOString() })
                .eq("user_id", userId);
            } else {
              await adminClient
                .from("credits")
                .insert({ user_id: userId, balance: MEMBERSHIP_CREDITS });
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const { data: subRecord } = await adminClient
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (subRecord) {
          await adminClient.from("subscriptions").update({
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }).eq("stripe_customer_id", customerId);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Only add credits for recurring invoices (not the first one, handled by checkout.session.completed)
        if (invoice.billing_reason === "subscription_cycle") {
          const { data: subRecord } = await adminClient
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (subRecord) {
            const MEMBERSHIP_CREDITS = 50;
            const { data: creditRow } = await adminClient
              .from("credits")
              .select("balance")
              .eq("user_id", subRecord.user_id)
              .single();

            const newBalance = (creditRow?.balance ?? 0) + MEMBERSHIP_CREDITS;
            await adminClient
              .from("credits")
              .update({ balance: newBalance })
              .eq("user_id", subRecord.user_id);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        await adminClient.from("subscriptions").update({
          status: "canceled",
          stripe_subscription_id: null,
        }).eq("stripe_customer_id", customerId);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
