# Memory: index.md
Updated: now

Design system: black nav + off-white bg (96%) + white card containers. Plus Jakarta Sans ExtraBold. 0px border-radius. Thick spacing. Lowercase everything. No gradients — flat cartoony colors only.
Accent: neon yellow (55 100% 50%) for highlights/active states. Neon green (130 100% 42%) for buy/CTA buttons. No purple gradients.
All borders use 5px consistently (border-[5px]).
Pages: Landing (/), Create Photo (/create), Character Creator (/), My Characters, Auth (/auth), Account, Membership, Top-ups, Storage.
Button variants: hero, hero-outline for on-dark surfaces.
Nav token: --nav (black bg), --nav-foreground (white text).
Backend: Lovable Cloud (Supabase). Tables: profiles, credits, subscriptions, generations, characters.
Auth: Supabase email/password. New users get 0 credits via trigger.
Edge functions: generate (AI image gen), create-checkout (Stripe), stripe-webhook (payment handling).
Security: All tables have RLS (auth.uid()=user_id). Edge functions gated by IS_DEMO_MODE env var (defaults true). Generate has 10/min rate limit + input sanitisation. Client-side sanitiseText() in src/lib/sanitise.ts.
Stripe: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET secrets + real price IDs.
Characters table: stores user characters with traits (name, country, age, hair, eye, body, style, description).
Create photo page: has character dropdown that auto-fills prompt from saved character traits.
Storage page: grid of generated photos from generations table with expand/download/delete.
