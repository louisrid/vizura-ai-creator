# Facefox Architecture

A map of how this codebase works, patterns to follow, and how to make common changes safely. Keep this in sync when you change architecture.

## File organisation

- `src/pages/` — top-level routes. One file per screen (Home, ChooseFace, CharacterDetail, Index = create-photo, Account, Auth, Storage, TopUps, Admin, History, Help, Info).

- `src/components/` — reusable UI. Notable: `GuidedCreator.tsx` (the onboarding/creator modal, lives in a portal — handles ALL creator flows including returning-user "returning-skip" and "returning-full" variants), `Header.tsx` (top bar + dropdown menu + slide-menu portal), `InstructionalSlide.tsx` (full-screen SET slides), `LockOverlay.tsx` (greyed-out lock visual).

- `src/hooks/` — shared hooks. `useOnboarded` is the single source of truth for onboarding state — always use it instead of reading the cache directly.

- `src/lib/` — pure helpers. `onboardingState.ts` (cache + DB sync), `generateApi.ts` (edge function invoker with retry), `navGuard.ts` (navigation interception), `displayAge.ts`, `startupSplash.ts` (blocking-loader registry).

- `src/contexts/` — global React contexts. `AuthContext`, `AppDataContext` (characters + generations cache), `CreditsContext` (gem balance), `SubscriptionContext`.

- `supabase/functions/` — edge functions. `generate` is the main image gen endpoint. `claim-free-gems`, `add-credits`, `create-checkout`, `stripe-webhook`, `admin-*`, `ensure-test-account`.

- `supabase/migrations/` — DB schema changes. Append-only timestamped SQL.

## Core patterns

### Onboarding state — `useOnboarded()`

Call this hook from any page or component that needs to know if the user is onboarded. It reads localStorage synchronously on mount (no flash) and fetches the DB in the background. It also listens for a `facefox:onboarding-changed` custom event so mid-session updates propagate instantly.

Default when unresolved: `onboardingComplete = true` (safe default — prevents flashing locks on returning users).

If you need to distinguish "unresolved" from "resolved onboarded", use the `resolved` flag.

To update onboarding cache, use `mergeCachedOnboardingState` in `src/lib/onboardingState.ts` — it dispatches the change event automatically.

### Character data — `useAppData()`

Characters and generations are cached in AppDataContext. Read `characters`, `generations`, `charactersReady`, `generationsReady` from it. Call `refreshCharacters()`, `refreshGenerations()`, or `refreshAll()` when you need a fresh pull.

### Gem economy

Gem costs are defined as constants in `supabase/functions/generate/index.ts` at the top of the file. Each flow (single regen, angle+body, face gen, face regen, photo) has its own gem-deduction block. During onboarding, deductions are SKIPPED entirely by an `if (!onboardingUser)` guard. The first regen of each type (face, angle, body) is free during onboarding, enforced via atomic slot claims (`UPDATE ... WHERE counter = 0`) so rapid double-taps can't double-spend. New users start at `balance = 0`; `claim-free-gems` gives them 5 after onboarding.

### Blocking loaders + startup splash

The yellow splash (in index.html) stays up until `blockingLoaders === 0` AND auth resolves. Route components register blocking loaders in `useLayoutEffect` while their data is loading. When all loaders unregister, splash fades. The header and routes both render only after `headerRevealed` flips true, so they appear together, not header-first. Don't bypass the splash — it's what makes first-load feel smooth.

### Menu dropdown (Header.tsx)

The hamburger button is extracted into a `MenuButton` component (at top of Header.tsx) and used in two places: inline in the header, and in a portal (`slideMenuButton`) when `slideMenuMode` data-attribute is set by GuidedCreator. The inline cluster is hidden when `slideMenuMode` is on — the portal button takes over.

Touch handling: a single global `touchstart`/`touchmove`/`touchend` listener bridges from the menu button to the portaled dropdown for drag-highlight. To prevent the touch handler + the synthetic click event from double-firing navigation, `suppressNextItemClickRef` is set true after touchend navigates, consumed by the next onClick.

### Arrow fade timing (GuidedCreator.tsx)

Slide content uses `AnimatePresence mode="wait"` (exit then enter, both 0.45s). Arrows have their own AnimatePresence. To prevent arrows fading in over a still-exiting hero/signup slide, the arrow-visibility state `showNavigationDelayed` delays entry by 450ms after `showNavigation` flips true, but flips false instantly on exit. Result: arrows fade in alongside the incoming slide, and fade out alongside the outgoing slide.

### Creator flow variants (GuidedCreator.tsx)

One `GuidedCreator` component handles four variants via `flowVariant`:

- `guest-onboarding` — logged-out first-time visitor sees hero → SET1 → name → traits → signup

- `member-onboarding` — logged-in but not onboarded, skips hero

- `returning-skip` — already onboarded, creator opened quickly (e.g. from menu) with reduced UI

- `returning-full` — already onboarded, full creator flow minus hero/signup

Do not build a parallel creator component. Use these variants.

## How to make common changes

### Add a new gem cost

Edit the constants at the top of `supabase/functions/generate/index.ts`. If the new flow has its own deduction block, mirror the existing `if (!onboardingUser) { ...deduct... }` pattern so it stays free during onboarding.

### Add a new page

1. Create `src/pages/YourPage.tsx`.

2. Add a `<Route path="..." element={<YourPage />} />` inside the Routes block in `src/App.tsx`.

3. If the page needs data, register a blocking loader in useLayoutEffect so the splash holds while loading.

### Change onboarding rules

Regen limits are columns on the `profiles` table (`onboarding_face_regens_used`, `onboarding_angle_regens_used`, `onboarding_body_regens_used`). Atomic claim happens in `generate/index.ts` — look for `.update({...: 1}).eq("user_id", userId).eq(counterCol, 0)` patterns.

To change "first X is free" rules, find the matching atomic claim and the matching `if (!onboarding...)` deduction guard.

### Change a fade duration

All long fades are 0.45s easeInOut. Short functional transitions are 0.15–0.25s. Don't introduce new values without a reason — check existing durations first.

### Add a new menu item

Edit `menuItems` array in `Header.tsx`. Handle the click in the dropdown onClick handler and in the touchend handler's navigation branch.

## What NOT to touch without care

- **Atomic regen claims** — the `UPDATE ... WHERE counter = 0` pattern is what prevents double-spend. Don't split this into a read-then-write — it re-introduces the race.

- **`useOnboarded` default of `true`** — changing it to `false` re-introduces lock flashes on returning users.

- **`AnimatePresence mode="wait"` on slide content** — without it, slides overlap during transitions.

- **`startupSplash.ts` blocking-loader refcount** — it's what holds the splash for first load.

- **Session-storage keys starting with `facefox_`** — there are many, wired into multiple auth and flow-resume paths. Grep before deleting any.

- **`writeCachedOnboardingState` event dispatch** — all `useOnboarded` subscribers listen for `facefox:onboarding-changed`. Without the dispatch, cache updates won't propagate across components.

- **`GuidedCreator.tsx` flowVariant logic** — it's the one creator component for ALL flows (onboarding + returning users). Do not duplicate into a separate file.

## File size reference

Pages under 300 lines, components under 500, edge functions under 1500. If something grows past these, split it.
