# Memory: style/design-tokens
Updated: now

The application uses a unified design system with a 10px squircle corner radius and 2px border thickness. 

**Two standardised greys sitewide (no other grey values):**
- **Border grey**: `hsl(var(--border-mid))` = `0 0% 22%` (#383838) — all borders, dividers, button outlines, user icon. NEVER used for fills or text.
- **Card/fill grey**: `hsl(var(--card))` = `0 0% 6%` (#0f0f0f) — all card backgrounds and container fills.
- **Dark fill grey**: `hsl(0 0% 10%)` (#1a1a1a) — dropdown menus, dividers in dropdowns, skeleton loaders, empty character/photo slots.
- Rule: borders use border-mid only. Fills use card (6%) or dark fill (10%). Never mix tiers.
- `--muted-foreground` is `0 0% 100%` (white) — no grey text anywhere
- All text is pure white (#ffffff) or pure black (#000000), never grey

High-visibility elements (active dropdowns, copy buttons, gem packs) utilize a solid yellow fill (#ffe603) with black text. All greys are audited sitewide — only two variants exist.

Lock overlays use `inset: 0` with `boxShadow: 0 0 0 4px rgba(0,0,0,0.80)` to darken borders while clipping to element shape. Lock state defaults to hidden and is only shown after confirming the user has no characters (never flashes on load).
