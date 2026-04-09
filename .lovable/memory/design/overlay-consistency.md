# Memory: design/overlay-consistency
Updated: now

All overlay/modal backdrops use rgba(0,0,0,0.83) with backdrop-blur(4px) site-wide. This applies to: RegenerateConfirmDialog, CharacterDetail delete dialog, Storage expanded view, Home image preview, History expanded view, and all shadcn dialog/drawer/sheet/alert-dialog components. X dismiss buttons use the popup-style 28px circle (backgroundColor #1a1a1a, positioned top: -10 right: -10 or top: 16 right: 16 for full-screen overlays) with X icon (size 14, strokeWidth 3, white). Clicking outside the modal content dismisses it in all cases.
