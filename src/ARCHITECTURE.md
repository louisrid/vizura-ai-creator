# Facefox Architecture

Context file for new developers or AI sessions. Read before writing code. Keep in sync when architecture changes.

## What Facefox is

AI character creator at facefox.lovable.app. Users pick traits → generate 3 face options → produce photos in scenes/outfits. Stack: React + TypeScript + Vite, Supabase (auth, DB, edge functions), xAI Grok Imagine Image API. GitHub under louisrid org with 2-way Lovable sync.

## Critical rules

1. Zero creative additions. Only make explicitly requested changes.
2. `useOnboarded` defaults to `true` for unresolved state — prevents lock-flashes on returning users.
3. Never remove localStorage cache reads from useState initializers — they prevent flash-of-wrong-state.
4. Never duplicate shared code: `invokeGenerate`, `MenuButton`, `LockOverlay`, `LoadingScreen`, `useOnboarded`, `visualStepType` pattern.
5. Every page must render correctly on the first frame from cached data. No flicker, no black flash, no header-before-content.
6. All text lowercase. Only exception: "XL" for bust size.
7. Text is white (#ffffff) or black (#000000) only. Never grey. Semi-transparent white counts as grey. `hsl(var(--border-mid))` is for borders only.
8. Buttons don't react to being pressed (no darken/scale/opacity). Global `-webkit-tap-highlight-color: transparent`. Allowlisted exceptions: back buttons, overlay close buttons, Index.tsx dropdown toggles, CharacterDetail emoji buttons, shadcn `hero` variant.
9. Match existing patterns (inline styles vs Tailwind — don't mix within a file).

## Naming

- `/` signed out or not onboarded = "Start screen" (never "Home").
- `/` signed in + onboarded = "Home" (dashboard).
- `/auth` = "Login screen" (existing users only).

## User states

`onboarding_complete` on profiles table, cached in localStorage as `facefox_onboarding_state`, read via `useOnboarded()`.

- **Not onboarded** (0 characters): locks on everything except create character. MenuButton visible but disabled (opacity 0.45). First face/angle/body regen free. OnboardingRedirectGate blocks /storage, /create, /history, /top-ups.
- **Onboarded** (1+ characters): full access, regens cost gems with confirm dialog.

## Gem economy

Costs in `supabase/functions/generate/index.ts`: photo 10, face gen/regen 30, angle/body regen 10. New users seed at 0 balance. During onboarding, deductions are skipped via `if (!onboardingUser)` guards. First regens use atomic slot claims (`UPDATE ... WHERE counter = 0`) to prevent double-spend.

## Core patterns

### Onboarding state — `useOnboarded()`

Only way to read onboarding state in components. Reads localStorage synchronously on mount (no flash), fetches DB in background, listens for `facefox:onboarding-changed` event. Default unresolved state: `onboardingComplete: true`. Use `resolved` flag to distinguish "unresolved" from "resolved onboarded". To update cache, use `mergeCachedOnboardingState` — it dispatches the change event.

### App data — `useAppData()`

Characters and generations cached in AppDataContext. Read `characters`, `generations`, `charactersReady`, `generationsReady`. `charactersReady`/`generationsReady` initialize true if localStorage has cached data — enables first-frame render.

### Splash + blocking loaders

Yellow loading bar is two layers: HTML splash (index.html) pre-React, then React `<LoadingScreen />` in App.tsx when `blockingLoaders > 0` covers all in-app transitions.

Splash-hide gate (`stillResolving` in App.tsx) holds until auth resolves, `blockingLoaders === 0`, AND for logged-in users on content routes: `charactersReady && generationsReady && onboardingResolved`. Static routes (/auth, /reset-password, /help, /info) are exempt.

Pages register blocking loaders via `registerBlockingLoader()` in useLayoutEffect while loading. Pages return `null` during load — App overlay shows instead. Header renders only after `headerRevealed` flips true.

Auth.tsx holds splash 600ms after navigate so target page can register its own blocker.

### Menu (Header.tsx)

MenuButton used inline and in a portal when `slideMenuMode` is active. Global touchstart/move/end listeners handle drag-to-highlight slide-menu gesture.

- `touchStartTimeRef` + 150ms grace window in `handleMove` prevents finger-overlap with just-opened dropdown from triggering false slide
- `suppressNextItemClickRef` prevents double-fire between touchend navigation and synthetic click

Menu items: Home, Create character, Create photo, My characters, Storage, Gems, My account. No log out (only from My Account page).

### Slide transitions (GuidedCreator.tsx)

Layout alignment keyed on `visualStepType` state (updates 450ms after step change, matched to slide exit duration). Prevents layout jump when incoming/outgoing slides have different alignments. Do not reintroduce `heroExiting` — `visualStepType` supersedes it.

Arrow fade-in delayed 450ms via `showNavigationDelayed` so arrows enter with the incoming slide.

### Creator flow variants

One `GuidedCreator` handles four via `flowVariant`:
- `guest-onboarding` — hero → SET1 → name → traits → signup
- `member-onboarding` — skips signup
- `returning-skip` — name → traits only (from menu)
- `returning-full` — hero → name → traits

Do not build a parallel creator.

### SignupGate direct navigate

After signup, SignupGate's useEffect writes draft + prompt to storage and navigates DIRECTLY to /choose-face. No Home route-through, no indirect redirects. `navigatedRef` guard ensures single fire.

### Caching keys

Synchronous first-frame reads: `facefox_cached_user`, `facefox_onboarding_state`, `facefox_cached_characters`, `facefox_cached_generations`. Cache-first, DB in background.

## Design

- Background: #000000
- Primary yellow: #cbc5c0 (load bar, arrows, accents)
- Cyan: #00e0ff (gems, generation progress)
- Red destructive: #ff4444
- Card: `hsl(var(--card))` (`hsl(0 0% 6%)`)
- Borders: 2px `hsl(var(--border-mid))` (borders only, never text)
- Corners: 10px radius
- Font: `-apple-system, 'SF Pro Display', system-ui`, weight 800-900
- Gem-cost buttons: #050a10 fill, 2px #00e0ff border
- Bottom padding: all pages use `pb-[280px]` except mobile create-photo (Index.tsx) which uses `pb-[140px]` (fixed create button sits below with its own gradient)

## Admin

`louisjridland@gmail.com` = admin. Shows admin button on Account page, gates admin edge functions. No subscription/gem overrides — uses real data. All admin `<img>` tags need `onError` handlers (xAI URLs expire). Admin loading states return `null`, App yellow overlay covers.

## Common changes

- **New gem cost**: edit constants at top of `generate/index.ts`. Mirror existing `if (!onboardingUser)` guard pattern to keep it free during onboarding.
- **New page**: create file in `src/pages/`, add `<Route>` in App.tsx, use `pb-[280px]` bottom, register blocking loader in useLayoutEffect if loading data.
- **New menu item**: add to `menuItems` array in Header.tsx, handle in dropdown onClick AND touchend navigation branch.
- **Fade duration**: long fades 0.45s easeInOut, short 0.15-0.25s. Don't add new values without checking existing.

## What NOT to touch without care

- Atomic regen claims (`UPDATE ... WHERE counter = 0`) — prevents double-spend race
- `useOnboarded` default of `true` — changing to false re-introduces lock flashes
- `AnimatePresence mode="wait"` on slide content — without it, slides overlap
- `startupSplash.ts` blocking-loader refcount — holds the splash
- `stillResolving` data-loading gate in App.tsx — prevents refresh flash
- `writeCachedOnboardingState` event dispatch — without it, useOnboarded subscribers don't update
- `GuidedCreator` flowVariant logic — one component for all creator flows
- `visualStepType` 450ms-delayed layout key — prevents slide-transition layout jump
- SignupGate's `navigatedRef` + direct navigate — replacing with route-through-Home breaks email signup
- 150ms grace in menu `handleMove` — prevents false slide-to-select
- Session keys starting with `facefox_` — many, wired into auth/flow-resume paths. Grep before deleting.
