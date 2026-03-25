# Memory: index.md
Updated: now

Design system: pure black (#000) + white (#fff), no colors/gradients except purple accent gradient. Plus Jakarta Sans ExtraBold. **rounded-2xl** border-radius everywhere. **border-4** on all containers/inputs/cards. Lowercase everything.
Purple gradient: gradient-purple-text class + SVG linearGradient (id="icon-gradient-purple") for icons. Used on header active page, menu active items, coming soon accents.
Spacing: pt-12 pb-12 on all page mains. BackButton + mb-10 gap before PageTitle on inner pages. mb-10 after PageTitle.
Text sizes: text-3xl (titles), text-sm (buttons/labels), text-xs (small labels/hints), text-[10px] (micro hints).
Button height: h-16 (primary CTA), h-14 (paywall), h-10 (small/outline), h-12 (default).
Nav token: --nav (black bg), --nav-foreground (white text). Menu button rounded-2xl.
Backend: Lovable Cloud (Supabase). Tables: profiles, credits, subscriptions, generations.
Auth: Supabase email/password. New users get 1 free credit via trigger.
Edge functions: generate (AI image gen), create-checkout (Stripe), stripe-webhook (payment handling).
Stripe: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET secrets + real price IDs.
