Design system: pure black + white base. Plus Jakarta Sans ExtraBold. 12px border-radius. Lowercase everything.
Purple used SPARINGLY — only gradient borders, active menu selection, small accent icons. NOT for filled buttons/backgrounds.
Purple gradient: deep 270 80% 30% → lighter 258 65% 62%. CSS: .gradient-purple, .gradient-purple-text, .border-gradient-purple (mask-based).
Buttons: solid black (bg-primary). Menu icon: white on dark bg. Page titles: plain foreground text.
Nav token: --nav (black bg), --nav-foreground (white text).
Backend: Lovable Cloud. Tables: profiles, credits, subscriptions, generations.
Auth: email/password. New users get 1 free credit via trigger.
Edge functions: generate, create-checkout, stripe-webhook.
Stripe: needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.
Menu order: create character (first/home), create photo, my characters, storage, account, help.
Coming soon pages: create photo, my characters, storage, account, help, settings.