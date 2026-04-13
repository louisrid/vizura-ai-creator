# Memory: style/design-tokens
Updated: now

The application uses a unified design system with a 10px squircle corner radius and 2px border thickness. 

**Two standardised greys sitewide (no other grey values):**
- **Dark surface**: `hsl(var(--card))` = `0 0% 10%` (#1a1a1a) — all card backgrounds, container fills, input fields, skeleton loaders, hover states
- **Mid border/text**: `hsl(var(--border-mid))` = `0 0% 25%` (#404040) — all borders, dividers, muted/secondary text, placeholder text, icon fills
- `--muted-foreground` matches `--border-mid` (0 0% 25%) for Tailwind class consistency

High-visibility elements (active dropdowns, copy buttons, gem packs) utilize a solid yellow fill (#ffe603) with black text. Backgrounds for inputs and containers use `hsl(var(--card))`. All greys are audited sitewide — only two variants exist.

Lock overlays use `inset: 0` with `boxShadow: 0 0 0 4px rgba(0,0,0,0.80)` to darken borders while clipping to element shape. Parent wrappers for "see all"/"manage" use `overflow: hidden` + `borderRadius: 10`.
