# Memory: index.md
Updated: now

Design system: pure black (#000) + white (#fff), no colors/gradients. Plus Jakarta Sans ExtraBold. 0px border-radius. Thick spacing. Lowercase everything.
Border thickness: border-[3px] for prominent borders, border-2 for subtle ones. Gradient border padding: 3px. Previously 5px/3px — reduced globally.
Pages: Landing (/), Generate (/generate), Auth (/auth), Paywall overlay component.
Button variants: hero, hero-outline for on-dark surfaces.
Nav token: --nav (black bg), --nav-foreground (white text).
Backend: Lovable Cloud (Supabase). Tables: profiles, credits, subscriptions, generations.
Auth: Supabase email/password. New users get 1 free credit via trigger.
Edge functions: generate (AI image gen), create-checkout (Stripe), stripe-webhook (payment handling).
Stripe: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET secrets + real price IDs.
Header user icon: filled UserRound (fill+stroke), white on black, only shown when logged in.
