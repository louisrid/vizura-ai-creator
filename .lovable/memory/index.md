# Memory: index.md

Updated: now

Design system: pure black (#000) + white (#fff), yellow #facc15 accents. -apple-system / SF Pro Display font, weight 800-900. 12px border-radius on buttons/inputs, 14px on cards. Lowercase everything.
Pages: Landing (/), Generate (/generate), Auth (/auth), Paywall overlay component.
Button variants: hero, hero-outline for on-dark surfaces. Primary buttons: yellow bg, black text. Secondary: #111 bg, #222 border, white text.
Nav token: --nav (black bg), --nav-foreground (white text).
Backend: Lovable Cloud (Supabase). Tables: profiles, credits, subscriptions, generations.
Auth: Supabase email/password. New users get 1 free credit via trigger.
Edge functions: generate (AI image gen via xAI Grok Imagine API), create-checkout (Stripe), stripe-webhook (payment handling).
Stripe: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET secrets + real price IDs.
Credits rebranded to "gems" across entire app. DB table stays `credits` but all UI/variables say gems. Gem icon from lucide-react.

## Pricing
- Subscription: $7 first month, $20/month after, 50 gems each month
- Top-ups: 15 gems/$9, 35 gems/$20, 80 gems/$40
- Character creation: 30 gems
- Photo generation: 1 gem
- Face regeneration: 1 gem

## Wizard (Guided Creator)
- First slide: Hero screen with animated rotating yellow rings (#facc15), emoji 👩‍🎤, "vizura" title, yellow "get started" button, dark "login" button (guest only). Rings animation is ONLY on this screen.
- All subsequent slides: clean layout with emoji, title, interactive pills. Navigation arrows (62x62, #111 bg, #222 border, white icon) at bottom with yellow progress dots.
- All overlays/flows unified: black backgrounds, 12px radius buttons, #111/#222 for secondary elements, yellow for primary actions.

## Flow
Create character → loading → pick your face (3 portraits) → confirm → cooking overlay (30s progress) → my characters

## Memories
- [Border thickness](mem://design/border-thickness) — Borders use 2px solid #222 consistently.
