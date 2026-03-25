# Memory: index.md
Updated: now

Design system: pure black (#000) + white (#fff), no colors/gradients on fills. Plus Jakarta Sans ExtraBold. 12px border-radius. Thick spacing. Lowercase everything.
Purple gradient: ONLY for borders, active states, small accents. Lighter palette: dark 265/50%/55%, mid 260/55%/65%, light 255/60%/78%. Gradient border 3px thick.
Border token --border: 0 0% 82% (darker/more visible).
Pages: Landing (/), Generate (/generate), Auth (/auth), Paywall overlay component.
Button variants: hero, hero-outline for on-dark surfaces. Solid black fills, no gradient fills.
Nav token: --nav (black bg), --nav-foreground (white text).
Backend: Lovable Cloud (Supabase). Tables: profiles, credits, subscriptions, generations.
Auth: Supabase email/password. New users get 1 free credit via trigger.
Edge functions: generate (AI image gen), create-checkout (Stripe), stripe-webhook (payment handling).
Stripe: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET secrets + real price IDs.
