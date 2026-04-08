---
name: Border thickness
description: Two border tiers. Thin container borders use 1.5px. Thick action button borders use 2px. Border colors are always full brightness.
type: design
---
**Thin borders (1.5px):** Container/card borders, input borders, dropdown borders, grid item borders, dashed placeholder borders. Colors: #1a1a1a, #222, border-border, rgba(255,255,255,0.08). These are decorative/structural borders.

**Thick borders (2px):** Action buttons with colored borders (#facc15 yellow, #00e0ff blue, #ff4444 red), popup box borders (#333), gem counter border (#00e0ff). These are interactive/emphasis borders.

**Selection borders (3px):** Active selection highlights use 3px solid #facc15 (pick face, character grid new item).

Character detail content boxes (name+photos, traits) use 1.5px solid #facc15 yellow border with rgba(250,204,21,0.08) tinted fill. Trait pills inside use 1.5px solid #222 with rgba(250,204,21,0.04) fill.

Confirmation popups use: 83% opacity black overlay (rgba(0,0,0,0.83)), pure black popup box (#000000 bg, 2px solid #333 grey border, 16px radius, compact padding 28px 24px 24px). Cancel buttons labelled "no" with dark grey fill (#333) and white text. X dismiss circle (28px, grey #333 fill, no border, thick white X icon) positioned top-right at (-10, -10). Tapping overlay outside popup dismisses it. Swipe-back gesture dismisses it. Smooth 0.18s fade+scale animation. Popup width max-w-sm.

Gem-cost buttons use the "gem box" style: dark tinted fill (#050a10), 2px solid #00e0ff border, #00e0ff text, with gem icon inline. Format: "action • N 💎".

All buttons with coloured borders get a subtle tinted fill:
- Blue (#00e0ff) → #050a10 fill
- Red (#ff4444) → #100505 fill (delete), #1a0505 fill (delete confirm), #100808 fill (sign out)
- Yellow (#facc15) → rgba(250,204,21,0.08) fill (login button, character detail boxes)

All button icons appear on the RIGHT side of text (e.g. "create photo 📷", "download ⬇️"). Exception: gem counter in header keeps icon on left.

No plain grey buttons on action screens. All interactive buttons use coloured borders with tinted fills.
