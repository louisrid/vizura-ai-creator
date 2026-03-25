Design system: pure black (#000) + white (#fff), no colors/gradients. Plus Jakarta Sans ExtraBold. 0px border-radius. Thick spacing. Lowercase everything.
Pages: Create (/), Generate (/generate), Auth (/auth), My Characters, Storage, Gallery, Account/Help/Settings (coming soon).
Button variants: hero, hero-outline for on-dark surfaces.
Nav token: --nav (black bg), --nav-foreground (white text).
Backend: Lovable Cloud (Supabase). Tables: profiles, credits, subscriptions, generations.
Auth: Supabase email/password. New users get 1 free credit via trigger.
Edge functions: generate (AI image gen), create-checkout (Stripe), stripe-webhook (payment handling).
Stripe: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET secrets + real price IDs.
Product: photorealistic AI women (Instagram aesthetic, influencer-style). NOT anime/cartoon.
Create page controls: hair colour, eye colour, skin tone, body type (slim/regular/curvy), extra detail text input. No outfit, no age, no teen.
Removed: showcase banner, popular prompts, guide dropdown, anime references.
