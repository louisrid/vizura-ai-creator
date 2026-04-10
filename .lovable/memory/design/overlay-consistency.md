# Memory: design/overlay-consistency
Updated: now

All overlay/modal backdrops use rgba(0,0,0,0.83) with backdrop-blur(4px) site-wide. This applies to: RegenerateConfirmDialog, CharacterDetail delete dialog, Storage expanded view, Home image preview, History expanded view, and all shadcn dialog/drawer/sheet/alert-dialog components. X dismiss buttons use a 36px circle (backgroundColor #1a1a1a, border 2px solid rgba(255,255,255,0.25), positioned top: -12 right: -12) with X icon (size 16, strokeWidth 3, white). Clicking outside the modal content dismisses it in all cases.
