Design system: pure black (#000) + white (#fff) base. Plus Jakarta Sans ExtraBold. 12px border-radius. Thick spacing. Lowercase everything.
Purple gradient accent: 260 60% 68% → 280 55% 78%. Used on buttons, menu icon, page titles, focus states, coming soon cards.
CSS utilities: .gradient-purple (bg), .gradient-purple-text (text clip), shadow-glow (purple glow).
Nav token: --nav (black bg), --nav-foreground (white text). Menu button uses gradient-purple.
Backend: Lovable Cloud (Supabase). Tables: profiles, credits, subscriptions, generations.
Auth: Supabase email/password. New users get 1 free credit via trigger.
Edge functions: generate (AI image gen), create-checkout (Stripe), stripe-webhook.
Stripe: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET secrets + real price IDs.
Menu order: create character (first/home), create photo, my characters, storage, account, help.
Coming soon pages: create photo, my characters, storage, account, help, settings.