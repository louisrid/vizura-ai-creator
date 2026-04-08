---
name: Border thickness
description: All borders use 2px consistently. Border colors are always full brightness — never dim or faded.
type: design
---
All borders standardised to 2px across all components and pages. Selection highlights (pick face, character grid new item) use 3px solid #facc15. Non-selected images have no border (padding used to maintain size). Yellow borders use full #facc15 (same as button fill). Blue borders use #00e0ff (gem box, regenerate circles, gem-cost buttons). Red borders use full #ff4444 or hsl(var(--destructive)) (delete buttons, cancel subscription, sign out). No rgba or opacity on border colors — always full brightness.

Character detail content boxes (name+photos, traits) have NO border — just #111111 fill with 16px radius. Character detail layout: content at top (name/photos/traits), generous breathing gap in middle showing dot decal, action buttons near bottom (create photo + delete).

Confirmation popups use: 83% opacity black overlay (rgba(0,0,0,0.83)), pure black popup box (#000000 bg, 2px solid #333 grey border, 16px radius, compact padding 28px 24px 24px). Cancel buttons labelled "no" with dark grey fill (#333) and white text. X dismiss circle (28px, grey #333 fill, no border, thick white X icon) positioned top-right at (-10, -10). Tapping overlay outside popup dismisses it. Swipe-back gesture while popup is open dismisses it (same as cancel). Smooth 0.18s fade+scale animation. Popup width max-w-sm.

Gem-cost buttons use the "gem box" style: dark tinted fill (#050a10), 2px solid #00e0ff border, #00e0ff text, with gem icon inline. Format: "action • N 💎". Only buttons that actually spend gems show gem costs. Navigation buttons (e.g. "create photo" on character detail) do NOT show gems.

All buttons with coloured borders get a subtle tinted fill toward their border colour instead of pure black:
- Blue (#00e0ff) bordered buttons → #050a10 fill
- Red (#ff4444) bordered buttons → #100505 fill (delete button), #1a0505 fill (delete confirm), #100808 fill (sign out)
- Yellow (#facc15) bordered buttons → rgba(250,204,21,0.08) fill (back arrows)

No plain grey buttons on action screens. All interactive buttons use coloured borders with tinted fills matching the design system.

Single photo regeneration: frontend sends `regenerate_single: "angle"|"body"` with `character_id` and `selected_face_url`. Edge function deducts 1 gem, regenerates only the specified photo, and returns only that URL. Frontend updates only that one photo in state.
