# Memory: style/design-tokens
Updated: now

The application uses a unified design system with a 10px squircle corner radius and 2px border thickness. 

**Two standardised greys sitewide (no other grey values):**
- **Lighter grey (borders)**: `hsl(var(--border-mid))` = `0 0% 14%` (#242424) — all borders, dividers. NEVER used for fills or text.
- **Darker grey (fills)**: `hsl(var(--card))` = `0 0% 10%` (#1a1a1a) — all card backgrounds, container fills, input fields, skeleton loaders, hover states
- Rule: lighter grey = borders ONLY. Darker grey = fills ONLY. Never mix.
- `--muted-foreground` is `0 0% 100%` (white) — no grey text anywhere
- All text is pure white (#ffffff) or pure black (#000000), never grey

High-visibility elements (active dropdowns, copy buttons, gem packs) utilize a solid yellow fill (#ffe603) with black text. All greys are audited sitewide — only two variants exist.

Lock overlays use `inset: 0` with `boxShadow: 0 0 0 4px rgba(0,0,0,0.80)` to darken borders while clipping to element shape. Lock state defaults to hidden and is only shown after confirming the user has no characters (never flashes on load).
