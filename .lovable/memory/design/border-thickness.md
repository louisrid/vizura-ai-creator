---
name: Border thickness
description: All borders use 2px consistently. Border colors are always full brightness — never dim or faded.
type: design
---
All borders standardised to 2px across all components and pages. Selection highlights (pick face, character grid new item) use 3px solid #facc15. Non-selected images have no border (padding used to maintain size). Yellow borders use full #facc15 (same as button fill). Blue borders use #00e0ff (gem box, regenerate circles). Red borders use full #ff4444 or hsl(var(--destructive)) (delete buttons, cancel subscription). No rgba or opacity on border colors — always full brightness.

Confirmation popups use: 90% opacity black overlay (rgba(0,0,0,0.90)), grey bordered box (#333 border, #111111 fill, 16px radius, generous padding), smooth scale+fade animation (0.2s). Gem costs are shown inside action buttons as "action · 1 gem" format. No separate gem text outside buttons.
