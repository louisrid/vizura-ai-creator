# Memory: index.md

Design system: near-black (#141414) + off-white (#fafafa), subtle purple accent (260 65% 55%). Plus Jakarta Sans Bold/ExtraBold. 12px border-radius. Rounded corners everywhere. Soft shadows, subtle gradients, glass effects.
Pages: Create (/), Auth (/auth), Gallery (/gallery), Reset Password (/reset-password). Paywall overlay component.
Button variants: hero (rounded-xl, shadow-medium), hero-outline for nav. All buttons have rounded-lg.
Nav: sticky header, dark bg. Logged-in users get dropdown menu with profile info, credits, nav links, logout.
Backend: Lovable Cloud (Supabase). Tables: profiles, credits, subscriptions, generations.
Auth: Supabase email/password. New users get 1 free credit via trigger.
Edge functions: generate (AI image gen), create-checkout (Stripe), stripe-webhook (payment handling).
Stripe: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET secrets + real price IDs.
Design tokens: --accent-purple, --accent-purple-light, shadow-soft, shadow-medium, shadow-glow. gradient-subtle, gradient-card, glass CSS classes.
