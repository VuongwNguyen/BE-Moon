# Next.js Migration — 3D Experiences (Phase 1)

## Context

The project is migrating from an Express + static-HTML frontend to Next.js.
Given the scope (backend API, portal, admin, auth pages, and four
WebGL/canvas "experiences"), the migration is split into independent
sub-projects, each with its own spec. This is the **first** sub-project:
rewriting the four public viewing experiences — `galaxy-moon`, `fall`,
`aurora`, `story` — as a Next.js app, chosen first to validate the highest-risk
technical piece (Three.js → react-three-fiber) early.

Later sub-projects (not covered here): backend API → Next.js route handlers,
portal/admin/auth pages, and production cutover/routing between the old
Express server and the new Next.js app.

## Current State (for reference)

- `index.js` serves a single public entry point `GET /view/?galaxyId=...`
  that picks one of three pre-read HTML templates (`galaxy`, `fall`, `story`)
  based on `galaxy.template` / `galaxy.storyType`, injects OG meta tags
  server-side (title/description/image, using the first active gallery photo
  as `og:image`), and serves it.
- `public/galaxy-moon/js/script.js` (1578 lines) — Three.js particle galaxy,
  imperative scene/camera/renderer setup, `OrbitControls`,
  `FontLoader`/`TextGeometry` for 3D text, heart-shaped image textures sized
  by gallery photo count, theme colors from galaxy data.
- `public/fall/js/fall.js` (1106 lines) — Three.js starfield + particle dust
  scene.
- `public/aurora/js/aurora.js` (365 lines) — Three.js scene with a custom
  GLSL fragment shader (`DOME_FRAG`) driving an animated sky dome.
- `public/story/js/story.js` + `effects.js` (297 lines) — DOM-based
  slideshow (chapters/photos driven by `public/shared/story-config.json`)
  with Canvas2D background effects (stardust/firefly/aurora), **not**
  Three.js.
- All four independently: read `galaxyId` from the query string, fetch
  `/galaxies/:id/view` (+ `/gallary/items` for fall/aurora/story), and
  duplicate an inline `musicManager` object (built on
  `public/shared/js/sc-widget-audio.js`) for SoundCloud-backed background
  audio with autoplay-retry logic.
- Three.js is loaded via browser `importmap` from `unpkg.com` (no bundler),
  currently allowlisted in the Express `helmet` CSP `script-src`.

## Goals

- Rebuild the four experiences as a Next.js (App Router, TypeScript) app in
  `web/`, functionally equivalent to the current versions.
- Rewrite the three Three.js experiences (`galaxy-moon`, `fall`, `aurora`)
  using `@react-three/fiber` + `@react-three/drei` (declarative, not a thin
  imperative wrapper) — an intentional higher-risk/higher-payoff choice made
  by the project owner to get idiomatic React/Three.js code going forward.
- Rewrite `story` as a React component, keeping its Canvas2D effects
  imperative (`useEffect`-managed, same pattern as today — low risk, not a
  Three.js concern).
- Deduplicate the repeated `musicManager` and data-fetching logic across the
  four experiences into shared hooks.
- Reproduce the current OG-tag server-side rendering behavior using the
  Next.js Metadata API.

## Non-Goals

- Migrating the Express backend API itself (routes/controllers/models) —
  separate sub-project.
- Migrating portal, admin, auth, privacy/terms pages — separate sub-project.
- Production routing/cutover between the Express server and the Next.js app
  — separate sub-project. This phase only needs to run standalone in dev
  (Next.js dev server proxying API calls to the existing Express server).
- Automated visual/pixel regression testing — not feasible for WebGL scenes;
  verification is manual side-by-side comparison (see Testing).

## Architecture

### Location & routing

- New Next.js 15 app at `web/`, App Router, TypeScript, in the same repo,
  run independently during this phase (`web/` dev server on a different port
  than Express, e.g. 3000 vs 3030).
- Single route `web/app/view/page.tsx` replaces the Express
  `GET /view/` handler:
  - Server Component. Reads `galaxyId` from `searchParams`.
  - Fetches galaxy meta server-side via an **absolute** backend URL
    (`process.env.BACKEND_API_URL`) — Next.js rewrites only apply to
    requests that hit the Next.js server (browser/client fetches), not to
    server-side `fetch()` calls made during rendering, so this needs its own
    configured origin.
  - `generateMetadata()` reproduces the current OG tag logic: title
    `"{name} — Lumora"`, description referencing the galaxy name, `og:image`
    from the first active gallery photo (falls back to `/og-image.png`),
    `og:url` from the request URL.
  - Selects which experience component to render using the same precedence
    as today: `storyType` set and `skip_se` query param is not `"true"` →
    `StoryExperience`; otherwise map `template` (`"galaxy"` default,
    `"fall"`) → `GalaxyMoonExperience` / `FallExperience`. (`aurora` is not
    currently wired into the template-selection logic in `index.js` — keep
    it that way; it's reachable directly today and stays reachable the same
    way, not through `/view`.)
  - 404s (JSON) when the galaxy doesn't exist or isn't `active`, matching
    current behavior.
- Client-side data fetching (inside the experience components) uses
  relative fetches (`/galaxies/:id/view`, `/gallary/items?...`), proxied to
  the Express server via `rewrites()` in `web/next.config.ts` — no CORS
  changes needed on the Express side during this phase.

### Shared hooks & components

To remove the duplication across the four experiences:

- **`useGalaxyView(galaxyId)`** (`web/lib/hooks/useGalaxyView.ts`) — replaces
  the near-identical `fetchGalaxyView()` / `fetchData()` functions in each
  script. Fetches `/galaxies/:id/view` and `/gallary/items` in parallel,
  returns `{ images, captions, music, theme, name, loading }`.
- **`useMusicManager(url)`** (`web/lib/hooks/useMusicManager.ts`) — replaces
  the inline `musicManager` object duplicated in each HTML file. Wraps
  `sc-widget-audio.js`'s `createGalaxyAudio`, keeps the existing
  autoplay-retry behavior (immediate play attempt, `oncanplay`/
  `onloadeddata`/`onloadedmetadata` handlers, up to 10 retries at 500ms,
  refocus/visibilitychange re-attempts). Returns `{ isPlaying, toggle }`.
- **`<LandscapeWarning />`** — shared portrait-mode overlay (used by
  galaxy-moon, fall, aurora).
- **`<AudioToggleButton />`** — shared play/pause button, wired to
  `useMusicManager`.
- Per-route CSS Modules: `galaxy-moon/css/style.css` (270 lines) carried
  over near-verbatim into a CSS Module for `GalaxyMoonExperience`; the
  inline `<style>` blocks in `fall/index.html` and `aurora/index.html`
  become their own CSS Modules.

### Three.js → react-three-fiber rewrites

New npm dependencies: `three`, `@react-three/fiber`, `@react-three/drei`
(replacing the `unpkg.com` importmap — also allows removing `unpkg.com` /
`cdnjs.cloudflare.com` Three.js entries from CSP `script-src` once this app
is the only consumer).

- **`GalaxyMoonExperience`** (from `script.js`): particle galaxy (~100k
  point buffer geometry, arm/spin/randomness params) as `<points>` +
  `bufferGeometry`, updated via `useFrame`; `<OrbitControls>` from drei;
  `FontLoader`/`TextGeometry` 3D text via drei's `<Text3D>` (or a manual
  loader in `useEffect` if `<Text3D>` doesn't cover the current styling);
  heart-shaped image textures whose density interpolates with gallery photo
  count, via `useTexture`/`TextureLoader`.
- **`FallExperience`** (from `fall.js`): starfield + particle dust as
  `<points>`, same `useFrame`-driven animation approach.
- **`AuroraExperience`** (from `aurora.js`): sky dome as a `shaderMaterial`
  (drei) + `extend()`, reusing the existing `DOME_FRAG` GLSL source
  unchanged — only the material's declaration style changes, not the shader
  logic.
- Each experience component owns its own `<Canvas>`, receives
  `{ images, captions, music, theme, name }` from `useGalaxyView`, and is
  responsible for cleanup on unmount (R3F handles WebGL context/animation
  frame teardown automatically, but this is verified manually — see
  Testing).

### Story experience

- **`StoryExperience`** (from `story.js` + `effects.js`): slideshow
  state (current chapter/photo index, progress percentage, hook-text
  overlay visibility) becomes React `useState`/`useEffect` instead of direct
  DOM manipulation. Loads `public/shared/story-config.json` (kept as a
  static asset served from `web/public/`), groups gallery items by
  `stage`, resolves per-chapter hook text the same way as today.
  Redirect-on-failure behavior (`window.location.replace` to
  `/view/?galaxyId=...&skip_se=true`) is preserved.
- Canvas2D background effects (`stardust`, `firefly`, `aurora` — from
  `effects.js`) are **not** rewritten in R3F; they stay as the existing
  imperative `requestAnimationFrame` functions, invoked from a `useEffect`
  that returns the existing cleanup (`cancelAnimationFrame`) function. This
  is plain Canvas2D, unrelated to Three.js, and the current code is already
  low-risk/well-isolated (`initEffect(name, canvas)` factory).

## Testing / Verification

No automated visual regression testing (not feasible for WebGL scene output).
Verification is manual, side-by-side:

1. Run Express (port 3030, current behavior) and the Next.js dev server
   (port 3000, new behavior) simultaneously against the same real
   `galaxyId` values covering each template/storyType.
2. For each of the four experiences, manually confirm: correct `galaxyId`
   read from query, `theme.colors` applied, background music plays
   (including the autoplay-retry path), portrait/landscape warning behaves
   the same, particle counts/animation look equivalent, no console errors,
   no WebGL context leak across route navigation (mount/unmount a few
   times and check memory/context count in devtools).
3. `next build` must succeed with no type errors before considering this
   phase done.
4. Pure-logic pieces (`useGalaxyView`, `useMusicManager`, `StoryExperience`'s
   chapter state machine) may get lightweight unit tests if convenient, but
   this isn't a hard requirement given the project has no existing test
   suite convention to match.

## Open Questions / Decisions Deferred

- Exact production routing between Express and this Next.js app (path-based
  split, reverse proxy, or full cutover) is deferred to a future
  "deployment/cutover" sub-project.
- Backend API migration to Next.js route handlers is a separate sub-project;
  until then this app always talks to the existing Express API.
