# Memory: index.md

Design system: pure black + white, no colors except purple gradient accents. Plus Jakarta Sans ExtraBold. 0px border-radius. Thick spacing. Lowercase everything. All borders border-2 (2px). Gradient: bottom-left light purple (255 65% 80%) → top-right dark purple (265 45% 60%). Gradient border padding 4px. --border at 75% lightness.
Pages: Landing (/), Generate (/generate), Auth (/auth), Paywall overlay component.
Button variants: hero, hero-outline for on-dark surfaces.
Nav token: --nav (black bg), --nav-foreground (white text).
Backend: Lovable Cloud (Supabase). Tables: profiles, credits, subscriptions, generations.
Auth: Supabase email/password. New users get 1 free credit via trigger.
Edge functions: generate (AI image gen), create-checkout (Stripe), stripe-webhook (payment handling).
Stripe: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET secrets + real price IDs.
