---
name: Border thickness
description: All borders use 2px consistently. Border colors are always full brightness — never dim or faded.
type: design
---
All borders standardised to 2px across all components and pages. Selection highlights (pick face, character grid new item) use 3px solid #facc15. Non-selected images have no border (padding used to maintain size). Yellow borders use full #facc15 (same as button fill). Blue borders use #00e0ff (gem box, regenerate circles, gem-cost buttons). Red borders use full #ff4444 or hsl(var(--destructive)) (delete buttons, cancel subscription). No rgba or opacity on border colors — always full brightness.

Character detail content boxes (name+photos, traits) have NO border — just #111111 fill with 16px radius.

Confirmation popups use: 94% opacity black overlay (rgba(0,0,0,0.94)), pure black popup box (#000000 bg, #000000 border, 16px radius, generous padding 36px 28px 28px). Cancel/back buttons use dark grey fill (#333) with white text. X dismiss circle (28px, grey #333 fill, no border, thick white X icon) positioned top-right at (-10, -10). Tapping overlay outside popup dismisses it. Smooth 0.18s fade+scale animation. Popup width max-w-sm (wider than before).

Gem-cost buttons use the "gem box" style: dark fill (#0a0a0a), 2px solid #00e0ff border, #00e0ff text, with gem icon inline. Format: "action • N 💎". Only buttons that actually spend gems show gem costs. Navigation buttons (e.g. "create photo" on character detail) do NOT show gems.
