# Memory: index.md
Updated: now

Design system: pure black (#000) + white (#fff), no colors/gradients. Plus Jakarta Sans ExtraBold. 0px border-radius. Thick spacing. Lowercase everything.
Pages: Landing (/), Generate (/generate), Auth (/auth), Paywall overlay component.
Button variants: hero, hero-outline for on-dark surfaces.
Nav token: --nav (black bg), --nav-foreground (white text).
Backend: Lovable Cloud (Supabase). Tables: profiles, credits, subscriptions, generations.
Auth: Supabase email/password. New users get 1 free credit via trigger.
Edge functions: generate (AI image gen via xAI Grok Imagine API), create-checkout (Stripe), stripe-webhook (payment handling).
Stripe: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET secrets + real price IDs.
Credits rebranded to "gems" across entire app. DB table stays `credits` but all UI/variables say gems. Green gem icon (--gem-green: 145 72% 44%) in header badge. Gem icon from lucide-react.

## Pricing
- Subscription: $7 first month, $20/month after, 50 gems each month
- Top-ups: 15 gems/$9, 35 gems/$20, 80 gems/$40
- Character creation: 30 gems
- Photo generation: 1 gem
- Face regeneration: 1 gem

## Character Creator (7 trait groups)
1. Skin: pale, tan, asian, dark
2. Body type: slim, regular, curvy
3. Chest: small, medium, large
4. Hair: straight, curly, bangs, short
5. Hair colour: blonde, brunette, black, pink
6. Eyes: brown, blue, green, hazel
7. Makeup: natural, model, egirl

## Flow
Create character → loading → pick your face (3 portraits) → confirm → cooking overlay (30s progress) → my characters

## Memories
- [Border thickness](mem://design/border-thickness) — All borders use 4px consistently. Gradient border padding also 4px.
