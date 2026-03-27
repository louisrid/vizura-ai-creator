# Memory: index.md
Updated: now

Design system: pure black (#000) + white (#fff), no colors/gradients. Plus Jakarta Sans ExtraBold. 0px border-radius. Thick spacing. Lowercase everything.
All borders use 5px consistently (border-[5px]). Gradient border padding also 5px.
Pages: Landing (/), Create Photo (/create-photo), Character Creator (/), My Characters, Auth (/auth), Account, Membership, Top-ups, Storage.
Button variants: hero, hero-outline for on-dark surfaces.
Nav token: --nav (black bg), --nav-foreground (white text).
Backend: Lovable Cloud (Supabase). Tables: profiles, credits, subscriptions, generations, characters.
Auth: Supabase email/password. New users get 0 credits via trigger.
Edge functions: generate (AI image gen), create-checkout (Stripe), stripe-webhook (payment handling).
Stripe: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET secrets + real price IDs.
Characters table: stores user characters with traits (name, country, age, hair, eye, body, style, description).
Create photo page: has character dropdown that auto-fills prompt from saved character traits.
Storage page: grid of generated photos from generations table with expand/download/delete.
