# Memory: index.md
Updated: now

Design system: pure black (#000) + white (#fff), no colors/gradients. Plus Jakarta Sans ExtraBold. 0px border-radius. Thick spacing. Lowercase everything.
Pages: Landing (/), Generate (/generate), Auth (/auth), Paywall overlay component.
Button variants: hero, hero-outline for on-dark surfaces.
Nav token: --nav (black bg), --nav-foreground (white text).
Backend: Lovable Cloud (Supabase). Tables: profiles, credits, subscriptions, generations.
Auth: Supabase email/password. New users get 1 free credit via trigger.
Edge functions: generate (AI image gen), create-checkout (Stripe), stripe-webhook (payment handling).
Stripe: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET secrets + real price IDs.
Credits rebranded to "gems" across entire app. DB table stays `credits` but all UI/variables say gems. Green gem icon (--gem-green: 145 72% 44%) in header badge. Gem icon from lucide-react.

## Memories
- [Border thickness](mem://design/border-thickness) — All borders use 4px consistently. Gradient border padding also 4px.
