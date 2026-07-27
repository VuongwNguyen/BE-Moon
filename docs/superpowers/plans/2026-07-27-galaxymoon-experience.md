# GalaxyMoonExperience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stub `web/components/experiences/GalaxyMoonExperience.tsx` (from the Foundation plan) with a full react-three-fiber port of `public/galaxy-moon/js/script.js` — the default/most-used viewing experience: a 100k-particle spiral galaxy with per-photo "heart" point clouds, a central storm-shaded planet, rotating caption rings, shooting stars, and a click-to-begin camera flythrough.

**Architecture:** One `<Canvas>` composed of ~10 focused R3F components under `web/components/experiences/galaxy-moon/`, driven by `useGalaxyView` + a new `useHeartImages` hook (both already built). Canvas-texture generation (glow sprites, heart-photo neon frames, the procedural planet texture) is factored into pure functions in `web/lib/galaxy-moon/canvasTextures.ts`, ported byte-faithful from the original. Per-frame imperative work (shooting star lifecycle, heart-cloud near/far material swap, ripple-capable particle shader, planet rotation) uses `useFrame` + refs, mirroring the original's direct object mutation instead of React re-renders — this is deliberate: re-rendering 100k particles or re-running a per-point distance scan through React state would be far slower and less faithful than flipping `.material`/`.geometry` on a ref, exactly as the original does.

**Tech Stack:** `three`, `@react-three/fiber`, `@react-three/drei` (new dependencies — replaces the original's `unpkg.com` importmap). TypeScript, CSS Modules for the 2D chrome (intro hint overlay). Vitest for the pure, non-canvas logic only.

**Source of truth this plan ports from (unchanged, still at the repo root during this phase):**
- `public/galaxy-moon/js/script.js` (1578 lines — the file this plan replaces)
- `public/galaxy-moon/index.html` (DOM structure, importmap, inline `window.dataLove2Loveloom` global, `musicManager`)
- `public/galaxy-moon/css/style.css` (background gradient, canvas layering — already partially ported in the Foundation plan's `LandscapeWarning`/`AudioToggleButton`)

## Fidelity decisions (read before starting any task)

The original source has several genuine bugs/dead code, found and traced line-by-line. This plan makes an explicit call on each — implementers must follow these, not "improve" further or silently diverge:

1. **Galaxy particle color is fixed, not theme-driven.** The main spiral's per-point color always lerps `0xff66ff → 0x66ffff` (script.js:194-199) regardless of the galaxy's theme. Theme `primary`/`secondary` colors are used ONLY for the heart-photo point clouds' "far" color (script.js:130-131, 370-378). **Preserve this exactly** — do not make the main galaxy theme-colored, even though it looks like an oversight.
2. **The ripple shader uniform (`uRippleTime`) is dead.** It's declared (`-1.0` initial value) and the vertex shader branches on it, but nothing in script.js ever sets it to a positive value — the ripple effect never fires today. **Port the shader as-is** (harmless, and a future task might wire up a trigger) but do not add any new code that triggers it.
3. **`FontLoader`/`TextGeometry` imports are unused dead code.** The "text rings" are canvas-texture-mapped cylinders, not real 3D typography. **Do not install or import these** — `@react-three/drei`'s `<Text3D>` is not needed anywhere in this port.
4. **`updateTextRingsRotation()` is dead code** — its loop only acts on ring children with `userData.initialAngle` set, which never happens for the single cylinder mesh each ring actually contains. Ring motion is entirely driven by `animatePlanetSystem()`'s direct `ringGroup.rotation`/`.position.y` writes. **Do not port `updateTextRingsRotation`.**
5. **Bug — real, being fixed:** `createShootingStar()` (script.js:502-605) has planet-atmosphere-creation code (`atmosphereGeometry`/`atmosphereMaterial`/`planet.add(atmosphere)`, script.js:541-571) accidentally nested inside it — almost certainly a copy/paste error. The practical effect: **every time a shooting star spawns, a brand new atmosphere sphere is added to the planet and never removed**, an unbounded leak over a long session. **Fix: create the planet's atmosphere exactly once, as part of the `Planet` component, not per shooting star.** This is a deliberate, documented deviation from literal script.js behavior — flagging it here so it isn't missed or "faithfully" re-broken.
6. **Bug — real, being fixed:** the click handler's post-intro branch does `raycaster.intersectObjects(heartPointClouds)` (script.js:1471) where `heartPointClouds` is never declared anywhere in the file — a guaranteed `ReferenceError` if that branch is ever reached (clicking anywhere after the intro has started, when the click doesn't hit the planet). **Fix: make this branch a no-op** (do nothing) instead of reproducing a crash — this matches the *observable* original behavior (nothing useful happens) without the pointless runtime error.
7. **Heart cloud near/far distance check is a real per-frame O(n) scan** (script.js:1245-1277: for every heart-cloud point, every frame, compute world position and distance to camera). **Preserve this exactly**, including its cost — do not "optimize" it into a bounding-sphere check or similar, since that would change the exact swap threshold behavior (a bounding-sphere approximation could flip near/far at a different moment than the original's per-point scan).

## File Structure

```
web/lib/galaxy-moon/
  heartDensity.ts            — computePointsPerGroup(numGroups) pure function + test
  spiralPoints.ts            — generateGalaxyPoints / generateHeartGroupPoints pure generators + tests
  canvasTextures.ts          — createGlowTexture, createNeonTexture, createPlanetTexture (pure canvas factories)
  useHeartImages.ts          — hook: window.dataLove2Loveloom.data.heartImages + gallery photos, + test
web/components/experiences/
  GalaxyMoonExperience.tsx   — REPLACES the stub. Canvas shell, intro/hint UI, click-to-start wiring, shared hooks/components
  galaxy-moon/
    Background.tsx           — central glow + 15 nebula sprites (GlowSprite-based)
    Starfield.tsx             — 20k background stars with the 10%→100% reveal-on-start drawRange trick
    ShootingStars.tsx         — spawn/animate pool of shooting stars
    GalaxyParticles.tsx       — the 100k-point spiral shader system
    HeartPointCloud.tsx       — one heart-photo point cloud (near/far swap); GalaxyMoonExperience renders one per photo
    Planet.tsx                — central planet (storm shader + procedural texture + single atmosphere shell)
    TextRings.tsx             — rotating caption rings around the planet
    HintIcon.tsx              — pre-intro tap cursor + pulsing ring + "Chạm Vào Tinh Cầu" sprite
    CameraFlythrough.tsx      — drives the camera's 3-phase eased path once triggered
```

---

### Task 1: Install dependencies and pure math helpers

**Files:**
- Modify: `web/package.json` (add `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`)
- Create: `web/lib/galaxy-moon/heartDensity.ts`
- Test: `web/lib/galaxy-moon/heartDensity.test.ts`
- Create: `web/lib/galaxy-moon/spiralPoints.ts`
- Test: `web/lib/galaxy-moon/spiralPoints.test.ts`

`computePointsPerGroup` ports the density-interpolation math from script.js:143-165 (how many points each heart photo's cloud gets, scaling down as photo count grows). `generateGalaxyPoints`/`generateHeartGroupPoints` port the spiral-distribution math shared by the main galaxy (script.js:167-205) and each heart cloud (script.js:333-381) — factored out since both use the identical `radius/branchAngle/spinAngle/random offset` formula, differing only in which points get skipped and what colors they get.

- [ ] **Step 1: Install R3F dependencies**

```bash
cd web && npm install three @react-three/fiber @react-three/drei && npm install -D @types/three
```

- [ ] **Step 2: Write the failing test for `computePointsPerGroup`**

```ts
// web/lib/galaxy-moon/heartDensity.test.ts
import { describe, it, expect } from "vitest";
import { computePointsPerGroup } from "./heartDensity";

describe("computePointsPerGroup", () => {
  it("returns max density for zero or one group", () => {
    expect(computePointsPerGroup(0, 100000)).toBe(15000);
    expect(computePointsPerGroup(1, 100000)).toBe(15000);
  });

  it("returns min density at or beyond the max-groups-for-scale threshold", () => {
    expect(computePointsPerGroup(9, 100000)).toBe(4000);
    expect(computePointsPerGroup(20, 100000)).toBe(4000);
  });

  it("interpolates linearly between max and min density", () => {
    // t = (5-1)/(9-1) = 0.5 -> halfway between 15000 and 4000
    expect(computePointsPerGroup(5, 100000)).toBe(Math.floor(15000 * 0.5 + 4000 * 0.5));
  });

  it("caps total points at galaxyPointCount when groups * density would exceed it", () => {
    // 1 group would want 15000, but the galaxy only has 10000 points total
    expect(computePointsPerGroup(1, 10000)).toBe(10000);
  });
});
```

- [ ] **Step 2b: Run the test to verify it fails**

```bash
cd web && npx vitest run lib/galaxy-moon/heartDensity.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write `web/lib/galaxy-moon/heartDensity.ts`**

Direct port of script.js:143-165.

```ts
// web/lib/galaxy-moon/heartDensity.ts
const MAX_DENSITY = 15000;
const MIN_DENSITY = 4000;
const MAX_GROUPS_FOR_SCALE = 9;

export function computePointsPerGroup(numGroups: number, galaxyPointCount: number): number {
  let pointsPerGroup: number;

  if (numGroups <= 1) {
    pointsPerGroup = MAX_DENSITY;
  } else if (numGroups >= MAX_GROUPS_FOR_SCALE) {
    pointsPerGroup = MIN_DENSITY;
  } else {
    const t = (numGroups - 1) / (MAX_GROUPS_FOR_SCALE - 1);
    pointsPerGroup = Math.floor(MAX_DENSITY * (1 - t) + MIN_DENSITY * t);
  }

  if (pointsPerGroup * numGroups > galaxyPointCount) {
    pointsPerGroup = Math.floor(galaxyPointCount / numGroups);
  }

  return pointsPerGroup;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd web && npx vitest run lib/galaxy-moon/heartDensity.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing test for `spiralPoints`**

These test structural invariants (array lengths, coordinate bounds, color channel ranges), not exact random values, since the functions use `Math.random()`.

```ts
// web/lib/galaxy-moon/spiralPoints.test.ts
import { describe, it, expect } from "vitest";
import { generateGalaxyPoints, generateHeartGroupPoints } from "./spiralPoints";

const params = {
  count: 2000,
  arms: 6,
  radius: 100,
  spin: 0.5,
  randomness: 0.2,
  randomnessPower: 20,
};

describe("generateGalaxyPoints", () => {
  it("produces matching-length position and color arrays, no larger than 3x count", () => {
    const { positions, colors } = generateGalaxyPoints(params);
    expect(positions.length).toBe(colors.length);
    expect(positions.length).toBeLessThanOrEqual(params.count * 3);
    expect(positions.length % 3).toBe(0);
  });

  it("keeps every point within the configured radius (plus randomness jitter)", () => {
    const { positions } = generateGalaxyPoints(params);
    const maxJitter = params.randomness * params.radius;
    for (let i = 0; i < positions.length; i += 3) {
      const dist = Math.hypot(positions[i], positions[i + 2]);
      expect(dist).toBeLessThanOrEqual(params.radius + maxJitter + 1e-6);
    }
  });

  it("keeps color channels within [0, 1]", () => {
    const { colors } = generateGalaxyPoints(params);
    for (const c of colors) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });
});

describe("generateHeartGroupPoints", () => {
  const insideColor = { r: 1, g: 0.4, b: 1 };
  const outsideColor = { r: 0.28, g: 0.72, b: 0.72 };

  it("only places points at radius >= 30 (hollow center, no probability)", () => {
    const { positions } = generateHeartGroupPoints({
      ...params,
      pointsPerGroup: 500,
      groupIndex: 0,
      insideColor,
      outsideColor,
    });
    for (let i = 0; i < positions.length; i += 3) {
      const dist = Math.hypot(positions[i], positions[i + 2]);
      expect(dist).toBeGreaterThanOrEqual(30 - (params.randomness * params.radius) - 1e-6);
    }
  });

  it("produces near (white) and far (theme-lerped) color arrays of matching length", () => {
    const { positions, colorsNear, colorsFar } = generateHeartGroupPoints({
      ...params,
      pointsPerGroup: 500,
      groupIndex: 0,
      insideColor,
      outsideColor,
    });
    expect(colorsNear.length).toBe(positions.length);
    expect(colorsFar.length).toBe(positions.length);
    // near color is always white-ish (script.js:365-368: colorNear = new THREE.Color(0xffffff))
    for (let i = 0; i < colorsNear.length; i++) {
      expect(colorsNear[i]).toBeCloseTo(1, 5);
    }
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
cd web && npx vitest run lib/galaxy-moon/spiralPoints.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 7: Write `web/lib/galaxy-moon/spiralPoints.ts`**

Ports script.js:167-205 (main galaxy) and script.js:339-381 (heart groups). Both share the identical position formula; only the skip condition and color assignment differ, so they're split into a shared internal `spiralPosition()` helper plus the two public generators.

```ts
// web/lib/galaxy-moon/spiralPoints.ts

interface SpiralParams {
  count: number;
  arms: number;
  radius: number;
  spin: number;
  randomness: number;
  randomnessPower: number;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function spiralPosition(index: number, arms: number, radius: number, spin: number, randomness: number, randomnessPower: number) {
  const r = Math.pow(Math.random(), randomnessPower) * radius;
  const branchAngle = ((index % arms) / arms) * Math.PI * 2;
  const spinAngle = r * spin;
  const randomX = (Math.random() - 0.5) * randomness * r;
  const randomY = (Math.random() - 0.5) * randomness * r * 0.5;
  const randomZ = (Math.random() - 0.5) * randomness * r;
  const totalAngle = branchAngle + spinAngle;
  return {
    radius: r,
    x: Math.cos(totalAngle) * r + randomX,
    y: randomY,
    z: Math.sin(totalAngle) * r + randomZ,
  };
}

function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

/** Main galaxy spiral (script.js:167-205). Color always lerps a fixed magenta->cyan pair, never theme colors — this is intentional, see plan's Fidelity decision #1. */
export function generateGalaxyPoints(params: SpiralParams): { positions: Float32Array; colors: Float32Array } {
  const { count, arms, radius, spin, randomness, randomnessPower } = params;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const FIXED_INSIDE: RGB = { r: 1, g: 0.4, b: 1 }; // 0xff66ff
  const FIXED_OUTSIDE: RGB = { r: 0.4, g: 1, b: 1 }; // 0x66ffff
  let pointIdx = 0;

  for (let i = 0; i < count; i++) {
    const p = spiralPosition(i, arms, radius, spin, randomness, randomnessPower);
    if (p.radius < 30 && Math.random() < 0.7) continue;

    const i3 = pointIdx * 3;
    positions[i3] = p.x;
    positions[i3 + 1] = p.y;
    positions[i3 + 2] = p.z;

    const mixed = lerpColor(FIXED_INSIDE, FIXED_OUTSIDE, p.radius / radius);
    const scale = 0.7 + 0.3 * Math.random();
    colors[i3] = mixed.r * scale;
    colors[i3 + 1] = mixed.g * scale;
    colors[i3 + 2] = mixed.b * scale;

    pointIdx++;
  }

  return { positions: positions.slice(0, pointIdx * 3), colors: colors.slice(0, pointIdx * 3) };
}

interface HeartGroupParams extends SpiralParams {
  pointsPerGroup: number;
  groupIndex: number;
  insideColor: RGB;
  outsideColor: RGB;
}

/** One heart-photo point cloud's spiral positions + near(white)/far(theme-lerped) colors (script.js:339-381). Hollow center is a hard radius<30 cutoff here, unlike the main galaxy's probabilistic skip. */
export function generateHeartGroupPoints(params: HeartGroupParams): {
  positions: Float32Array;
  colorsNear: Float32Array;
  colorsFar: Float32Array;
} {
  const { pointsPerGroup, groupIndex, arms, radius, spin, randomness, randomnessPower, insideColor, outsideColor } = params;
  const positions = new Float32Array(pointsPerGroup * 3);
  const colorsNear = new Float32Array(pointsPerGroup * 3);
  const colorsFar = new Float32Array(pointsPerGroup * 3);
  let validPointCount = 0;

  for (let i = 0; i < pointsPerGroup; i++) {
    const globalIdx = groupIndex * pointsPerGroup + i;
    const p = spiralPosition(globalIdx, arms, radius, spin, randomness, randomnessPower);
    if (p.radius < 30) continue;

    const idx = validPointCount * 3;
    positions[idx] = p.x;
    positions[idx + 1] = p.y;
    positions[idx + 2] = p.z;

    colorsNear[idx] = 1;
    colorsNear[idx + 1] = 1;
    colorsNear[idx + 2] = 1;

    const far = lerpColor(insideColor, outsideColor, p.radius / radius);
    const scale = 0.7 + 0.3 * Math.random();
    colorsFar[idx] = far.r * scale;
    colorsFar[idx + 1] = far.g * scale;
    colorsFar[idx + 2] = far.b * scale;

    validPointCount++;
  }

  return {
    positions: positions.slice(0, validPointCount * 3),
    colorsNear: colorsNear.slice(0, validPointCount * 3),
    colorsFar: colorsFar.slice(0, validPointCount * 3),
  };
}
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
cd web && npx vitest run lib/galaxy-moon/spiralPoints.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 9: Commit**

```bash
git add web/package.json web/package-lock.json web/lib/galaxy-moon/heartDensity.ts web/lib/galaxy-moon/heartDensity.test.ts web/lib/galaxy-moon/spiralPoints.ts web/lib/galaxy-moon/spiralPoints.test.ts
git commit -m "feat(web): add react-three-fiber deps and pure galaxy-point/density math"
```

---

### Task 2: Canvas texture factories

**Files:**
- Create: `web/lib/galaxy-moon/canvasTextures.ts`

Pure functions returning `THREE.CanvasTexture`, ported verbatim from script.js's `createGlowMaterial` (script.js:66-92, texture-generation half only — the Sprite/material wrapping happens in the `Background`/`HintIcon` R3F components, Tasks 3 and 8), `createNeonTexture` (script.js:277-330), and `createPlanetTexture` (script.js:642-718). No automated tests — canvas 2D isn't implemented in the jsdom test environment, and these are faithfully-transcribed drawing routines with no meaningful pure-logic to isolate (consistent with how `web/lib/story/effects.ts` was handled in the Foundation plan).

- [ ] **Step 1: Write `web/lib/galaxy-moon/canvasTextures.ts`**

```ts
// web/lib/galaxy-moon/canvasTextures.ts
import * as THREE from "three";

/** Radial gradient glow sprite texture (script.js:66-82). */
export function createGlowTexture(color: string, size = 128): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** Rounded-rect-cropped photo texture used by heart point clouds (script.js:277-330). */
export function createNeonTexture(image: HTMLImageElement, size: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const aspectRatio = image.width / image.height;
  let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;
  if (aspectRatio > 1) {
    drawWidth = size;
    drawHeight = size / aspectRatio;
    offsetX = 0;
    offsetY = (size - drawHeight) / 2;
  } else {
    drawHeight = size;
    drawWidth = size * aspectRatio;
    offsetX = (size - drawWidth) / 2;
    offsetY = 0;
  }
  ctx.clearRect(0, 0, size, size);
  const cornerRadius = size * 0.1;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(offsetX + cornerRadius, offsetY);
  ctx.lineTo(offsetX + drawWidth - cornerRadius, offsetY);
  ctx.arcTo(offsetX + drawWidth, offsetY, offsetX + drawWidth, offsetY + cornerRadius, cornerRadius);
  ctx.lineTo(offsetX + drawWidth, offsetY + drawHeight - cornerRadius);
  ctx.arcTo(offsetX + drawWidth, offsetY + drawHeight, offsetX + drawWidth - cornerRadius, offsetY + drawHeight, cornerRadius);
  ctx.lineTo(offsetX + cornerRadius, offsetY + drawHeight);
  ctx.arcTo(offsetX, offsetY + drawHeight, offsetX, offsetY + drawHeight - cornerRadius, cornerRadius);
  ctx.lineTo(offsetX, offsetY + cornerRadius);
  ctx.arcTo(offsetX, offsetY, offsetX + cornerRadius, offsetY, cornerRadius);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  ctx.restore();
  return new THREE.CanvasTexture(canvas);
}

/** Procedural planet surface texture: gradient base + random spots + swirl strokes + blur (script.js:642-718). */
export function createPlanetTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, size / 8, size / 2, size / 2, size / 2);
  gradient.addColorStop(0.0, "#f8bbd0");
  gradient.addColorStop(0.12, "#f48fb1");
  gradient.addColorStop(0.22, "#f06292");
  gradient.addColorStop(0.35, "#ffffff");
  gradient.addColorStop(0.5, "#e1aaff");
  gradient.addColorStop(0.62, "#a259f7");
  gradient.addColorStop(0.75, "#b2ff59");
  gradient.addColorStop(1.0, "#3fd8c7");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const spotColors = [
    "#f8bbd0", "#f8bbd0", "#f48fb1", "#f48fb1", "#f06292", "#f06292",
    "#ffffff", "#e1aaff", "#a259f7", "#b2ff59",
  ];
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 30 + Math.random() * 120;
    const color = spotColors[Math.floor(Math.random() * spotColors.length)];
    const spotGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    spotGradient.addColorStop(0, color + "cc");
    spotGradient.addColorStop(1, color + "00");
    ctx.fillStyle = spotGradient;
    ctx.fillRect(0, 0, size, size);
  }

  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.bezierCurveTo(
      Math.random() * size, Math.random() * size,
      Math.random() * size, Math.random() * size,
      Math.random() * size, Math.random() * size,
    );
    ctx.strokeStyle = "rgba(180, 120, 200, " + (0.12 + Math.random() * 0.18) + ")";
    ctx.lineWidth = 8 + Math.random() * 18;
    ctx.stroke();
  }

  if (ctx.filter !== undefined) {
    ctx.filter = "blur(2px)";
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
  }

  return new THREE.CanvasTexture(canvas);
}
```

- [ ] **Step 2: Confirm it type-checks cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/galaxy-moon/canvasTextures.ts
git commit -m "feat(web): port galaxy-moon canvas texture factories (glow/neon/planet)"
```

---

### Task 3: `useHeartImages` hook

**Files:**
- Create: `web/lib/galaxy-moon/useHeartImages.ts`
- Test: `web/lib/galaxy-moon/useHeartImages.test.ts`

Ports `getHeartImages()` (script.js:1556-1576): combines any images already on `window.dataLove2Loveloom.data.heartImages` (set by an inline script in the original `index.html` — always empty in practice, per `public/galaxy-moon/index.html`'s inline `window.dataLove2Loveloom = { data: { heartImages: undefined, ... } }`, but the original code defends against it being populated) with the galaxy's gallery photos fetched from `/gallary/items?galaxyId=`. Since `useGalaxyView` (Foundation plan) already fetches gallery items via the same endpoint, this hook takes the already-fetched `images: string[]` from `useGalaxyView` as an input rather than re-fetching — a deliberate simplification (no behavior change: same final list, one fewer redundant network call).

- [ ] **Step 1: Write the failing test**

```ts
// web/lib/galaxy-moon/useHeartImages.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHeartImages } from "./useHeartImages";

declare global {
  interface Window {
    dataLove2Loveloom?: { data: { heartImages?: string[] } };
  }
}

describe("useHeartImages", () => {
  afterEach(() => {
    delete window.dataLove2Loveloom;
  });

  it("returns only gallery images when no global heartImages are set", () => {
    const { result } = renderHook(() => useHeartImages(["https://x/a.jpg", "https://x/b.jpg"]));
    expect(result.current).toEqual(["https://x/a.jpg", "https://x/b.jpg"]);
  });

  it("prepends window.dataLove2Loveloom.data.heartImages when present", () => {
    window.dataLove2Loveloom = { data: { heartImages: ["https://x/global.jpg"] } };
    const { result } = renderHook(() => useHeartImages(["https://x/a.jpg"]));
    expect(result.current).toEqual(["https://x/global.jpg", "https://x/a.jpg"]);
  });

  it("returns an empty array when there are no images anywhere", () => {
    const { result } = renderHook(() => useHeartImages([]));
    expect(result.current).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd web && npx vitest run lib/galaxy-moon/useHeartImages.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write `web/lib/galaxy-moon/useHeartImages.ts`**

```ts
// web/lib/galaxy-moon/useHeartImages.ts
"use client";

import { useMemo } from "react";

declare global {
  interface Window {
    dataLove2Loveloom?: { data?: { heartImages?: string[] } };
  }
}

/** Combines any pre-set window global heart images with the galaxy's gallery photos (script.js:1556-1576). */
export function useHeartImages(galleryImages: string[]): string[] {
  return useMemo(() => {
    const globalImages = typeof window !== "undefined" ? window.dataLove2Loveloom?.data?.heartImages ?? [] : [];
    return [...globalImages, ...galleryImages];
  }, [galleryImages]);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd web && npx vitest run lib/galaxy-moon/useHeartImages.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/galaxy-moon/useHeartImages.ts web/lib/galaxy-moon/useHeartImages.test.ts
git commit -m "feat(web): add useHeartImages hook"
```

---

### Task 4: `Background` and `Starfield` components

**Files:**
- Create: `web/components/experiences/galaxy-moon/Background.tsx`
- Create: `web/components/experiences/galaxy-moon/Starfield.tsx`

`Background` ports the central glow + 15 random nebula sprites (script.js:96-113). `Starfield` ports the 20k-star background (script.js:473-497) including the "only 10% of stars visible until the intro starts" `setDrawRange` trick (script.js:1404-1407, 1467-1469).

- [ ] **Step 1: Write `web/components/experiences/galaxy-moon/Background.tsx`**

```tsx
// web/components/experiences/galaxy-moon/Background.tsx
"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { createGlowTexture } from "@/lib/galaxy-moon/canvasTextures";

function GlowSprite({
  color,
  size,
  scale,
  position,
  opacity,
}: {
  color: string;
  size: number;
  scale: number;
  position?: [number, number, number];
  opacity: number;
}) {
  const texture = useMemo(() => createGlowTexture(color, size), [color, size]);
  return (
    <sprite position={position} scale={[scale, scale, 1]}>
      <spriteMaterial map={texture} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}

/** Central glow + 15 random nebula clouds (script.js:96-113). */
export function Background() {
  const nebulae = useMemo(
    () =>
      Array.from({ length: 15 }, () => {
        const hue = Math.random() * 360;
        return {
          color: `hsla(${hue}, 80%, 50%, 0.6)`,
          position: [(Math.random() - 0.5) * 175, (Math.random() - 0.5) * 175, (Math.random() - 0.5) * 175] as [
            number,
            number,
            number,
          ],
        };
      }),
    [],
  );

  return (
    <>
      <GlowSprite color="rgba(255,255,255,0.8)" size={156} scale={8} opacity={0.25} />
      {nebulae.map((n, i) => (
        <GlowSprite key={i} color={n.color} size={256} scale={100} position={n.position} opacity={0.55} />
      ))}
    </>
  );
}
```

- [ ] **Step 2: Write `web/components/experiences/galaxy-moon/Starfield.tsx`**

```tsx
// web/components/experiences/galaxy-moon/Starfield.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const STAR_COUNT = 20000;
const VISIBLE_BEFORE_START = Math.floor(STAR_COUNT * 0.1);

interface StarfieldProps {
  introStarted: boolean;
}

/** 20k background stars; only 10% are visible until the user starts the intro (script.js:473-497, 1404-1407, 1467-1469). */
export function Starfield({ introStarted }: StarfieldProps) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 900;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 900;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 900;
    }
    return arr;
  }, []);

  useEffect(() => {
    geometryRef.current?.setDrawRange(0, introStarted ? STAR_COUNT : VISIBLE_BEFORE_START);
  }, [introStarted]);

  return (
    <points renderOrder={999}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={0xffffff} size={0.7} transparent opacity={0.7} depthWrite={false} />
    </points>
  );
}
```

- [ ] **Step 3: Confirm it type-checks cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add web/components/experiences/galaxy-moon/Background.tsx web/components/experiences/galaxy-moon/Starfield.tsx
git commit -m "feat(web): port galaxy-moon Background and Starfield components"
```

---

### Task 5: `GalaxyParticles` component

**Files:**
- Create: `web/components/experiences/galaxy-moon/GalaxyParticles.tsx`

Ports the 100k-point spiral shader system (script.js:122-275) using `generateGalaxyPoints` from Task 1 and the ripple-capable `ShaderMaterial` (script.js:217-273). Per Fidelity decision #2, the ripple uniform is wired up but nothing triggers it — this is intentional.

- [ ] **Step 1: Write `web/components/experiences/galaxy-moon/GalaxyParticles.tsx`**

```tsx
// web/components/experiences/galaxy-moon/GalaxyParticles.tsx
"use client";

import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { generateGalaxyPoints } from "@/lib/galaxy-moon/spiralPoints";

const GALAXY_PARAMS = {
  count: 100000,
  arms: 6,
  radius: 100,
  spin: 0.5,
  randomness: 0.2,
  randomnessPower: 20,
};

const VERTEX_SHADER = `
  uniform float uSize;
  uniform float uTime;
  uniform float uRippleTime;
  uniform float uRippleSpeed;
  uniform float uRippleWidth;

  varying vec3 vColor;

  void main() {
      vColor = color;

      vec4 modelPosition = modelMatrix * vec4(position, 1.0);

      if (uRippleTime > 0.0) {
          float rippleRadius = (uTime - uRippleTime) * uRippleSpeed;
          float particleDist = length(modelPosition.xyz);

          float strength = 1.0 - smoothstep(rippleRadius - uRippleWidth, rippleRadius + uRippleWidth, particleDist);
          strength *= smoothstep(rippleRadius + uRippleWidth, rippleRadius - uRippleWidth, particleDist);

          if (strength > 0.0) {
              vColor += vec3(strength * 2.0);
          }
      }

      vec4 viewPosition = viewMatrix * modelPosition;
      gl_Position = projectionMatrix * viewPosition;
      gl_PointSize = uSize / -viewPosition.z;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;

      gl_FragColor = vec4(vColor, 1.0);
  }
`;

/** Main 100k-point spiral galaxy (script.js:122-275). Color is fixed magenta->cyan — NOT theme-driven, see plan Fidelity decision #1. */
export function GalaxyParticles() {
  const { gl } = useThree();

  const { positions, colors } = useMemo(() => generateGalaxyPoints(GALAXY_PARAMS), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uSize: { value: 50.0 * gl.getPixelRatio() },
      uRippleTime: { value: -1.0 },
      uRippleSpeed: { value: 40.0 },
      uRippleWidth: { value: 20.0 },
    }),
    [gl],
  );

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
        vertexColors
      />
    </points>
  );
}
```

- [ ] **Step 2: Confirm it type-checks cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/components/experiences/galaxy-moon/GalaxyParticles.tsx
git commit -m "feat(web): port GalaxyParticles (100k-point ripple-shader spiral)"
```

---

### Task 6: `HeartPointCloud` component

**Files:**
- Create: `web/components/experiences/galaxy-moon/HeartPointCloud.tsx`

Ports one heart-photo point cloud, including the async image-load-then-texture step (script.js:426-467) and the per-frame near/far material swap based on camera distance (script.js:1244-1277). Per Fidelity decision #7, the distance check is a full per-point scan every frame — preserved exactly.

- [ ] **Step 1: Write `web/components/experiences/galaxy-moon/HeartPointCloud.tsx`**

```tsx
// web/components/experiences/galaxy-moon/HeartPointCloud.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { generateHeartGroupPoints } from "@/lib/galaxy-moon/spiralPoints";
import { createNeonTexture } from "@/lib/galaxy-moon/canvasTextures";

const GALAXY_PARAMS = {
  count: 100000,
  arms: 6,
  radius: 100,
  spin: 0.5,
  randomness: 0.2,
  randomnessPower: 20,
};

const NEAR_DISTANCE = 10;

interface HeartPointCloudProps {
  imageUrl: string;
  groupIndex: number;
  pointsPerGroup: number;
  insideColor: THREE.Color;
  outsideColor: THREE.Color;
}

/** One heart-photo point cloud with near(opaque, white)/far(additive, theme-colored) material swap (script.js:333-467, 1244-1277). */
export function HeartPointCloud({ imageUrl, groupIndex, pointsPerGroup, insideColor, outsideColor }: HeartPointCloudProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  const built = useMemo(() => {
    const { positions, colorsNear, colorsFar } = generateHeartGroupPoints({
      ...GALAXY_PARAMS,
      pointsPerGroup,
      groupIndex,
      insideColor: { r: insideColor.r, g: insideColor.g, b: insideColor.b },
      outsideColor: { r: outsideColor.r, g: outsideColor.g, b: outsideColor.b },
    });
    if (positions.length === 0) return null;

    let cx = 0, cy = 0, cz = 0;
    const count = positions.length / 3;
    for (let i = 0; i < count; i++) {
      cx += positions[i * 3];
      cy += positions[i * 3 + 1];
      cz += positions[i * 3 + 2];
    }
    cx /= count;
    cy /= count;
    cz /= count;

    const centered = new Float32Array(positions.length);
    for (let i = 0; i < count; i++) {
      centered[i * 3] = positions[i * 3] - cx;
      centered[i * 3 + 1] = positions[i * 3 + 1] - cy;
      centered[i * 3 + 2] = positions[i * 3 + 2] - cz;
    }

    const geometryNear = new THREE.BufferGeometry();
    geometryNear.setAttribute("position", new THREE.BufferAttribute(centered, 3));
    geometryNear.setAttribute("color", new THREE.BufferAttribute(colorsNear, 3));

    const geometryFar = new THREE.BufferGeometry();
    geometryFar.setAttribute("position", new THREE.BufferAttribute(centered, 3));
    geometryFar.setAttribute("color", new THREE.BufferAttribute(colorsFar, 3));

    return { geometryNear, geometryFar, center: new THREE.Vector3(cx, cy, cz) };
  }, [pointsPerGroup, groupIndex, insideColor, outsideColor]);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      if (!cancelled) setTexture(createNeonTexture(img, 256));
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const materials = useMemo(() => {
    if (!texture) return null;
    return {
      near: new THREE.PointsMaterial({
        size: 1.8,
        map: texture,
        transparent: false,
        alphaTest: 0.2,
        depthWrite: true,
        depthTest: true,
        blending: THREE.NormalBlending,
        vertexColors: true,
      }),
      far: new THREE.PointsMaterial({
        size: 1.8,
        map: texture,
        transparent: true,
        alphaTest: 0.2,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
      }),
    };
  }, [texture]);

  useFrame(({ camera }) => {
    const points = pointsRef.current;
    if (!points || !built || !materials) return;

    const geometry = points.geometry;
    const positionAttr = geometry.getAttribute("position");
    let isClose = false;
    for (let i = 0; i < positionAttr.count; i++) {
      const worldX = positionAttr.getX(i) + points.position.x;
      const worldY = positionAttr.getY(i) + points.position.y;
      const worldZ = positionAttr.getZ(i) + points.position.z;
      const distance = camera.position.distanceTo(new THREE.Vector3(worldX, worldY, worldZ));
      if (distance < NEAR_DISTANCE) {
        isClose = true;
        break;
      }
    }

    const wantGeometry = isClose ? built.geometryNear : built.geometryFar;
    const wantMaterial = isClose ? materials.near : materials.far;
    if (points.geometry !== wantGeometry) points.geometry = wantGeometry;
    if (points.material !== wantMaterial) points.material = wantMaterial;
  });

  if (!built || !materials) return null;

  return (
    <points
      ref={pointsRef}
      geometry={built.geometryFar}
      material={materials.far}
      position={built.center}
    />
  );
}
```

- [ ] **Step 2: Confirm it type-checks cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/components/experiences/galaxy-moon/HeartPointCloud.tsx
git commit -m "feat(web): port HeartPointCloud with near/far material swap"
```

---

### Task 7: `Planet` component

**Files:**
- Create: `web/components/experiences/galaxy-moon/Planet.tsx`

Ports the central planet (script.js:639-765): procedural texture (Task 2), the storm-swirl `ShaderMaterial` (script.js:720-749), and — per Fidelity decision #5 — a single atmosphere shell created once here (not per-shooting-star, which was the original's bug).

- [ ] **Step 1: Write `web/components/experiences/galaxy-moon/Planet.tsx`**

```tsx
// web/components/experiences/galaxy-moon/Planet.tsx
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createPlanetTexture } from "@/lib/galaxy-moon/canvasTextures";

const PLANET_RADIUS = 10;

const STORM_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const STORM_FRAGMENT_SHADER = `
  uniform float time;
  uniform sampler2D baseTexture;
  varying vec2 vUv;
  void main() {
      vec2 uv = vUv;
      float angle = length(uv - vec2(0.5)) * 3.0;
      float twist = sin(angle * 3.0 + time) * 0.1;
      uv.x += twist * sin(time * 0.5);
      uv.y += twist * cos(time * 0.5);
      vec4 texColor = texture2D(baseTexture, uv);
      float noise = sin(uv.x * 10.0 + time) * sin(uv.y * 10.0 + time) * 0.1;
      texColor.rgb += noise * vec3(0.8, 0.4, 0.2);
      gl_FragColor = texColor;
  }
`;

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormal;
  void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  varying vec3 vNormal;
  uniform vec3 glowColor;
  void main() {
      float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      gl_FragColor = vec4(glowColor, 1.0) * intensity;
  }
`;

interface PlanetProps {
  visible: boolean;
  onClick?: () => void;
}

/** Central planet: procedural texture + storm-swirl shader + a single atmosphere shell (script.js:639-765). Atmosphere is created once here, not per-shooting-star — see plan Fidelity decision #5. `onClick` is attached directly to the planet's own mesh so R3F's built-in raycasting only ever fires for an actual hit on the planet — this also implements Fidelity decision #6 for free: clicking anywhere else in the scene has no handler attached there, so it's naturally a no-op instead of the original's `ReferenceError`. No ref needs to be exposed to the parent — the click target IS the mesh this component owns. */
export function Planet({ visible, onClick }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => createPlanetTexture(), []);
  const stormUniforms = useMemo(() => ({ time: { value: 0.0 }, baseTexture: { value: texture } }), [texture]);
  const atmosphereUniforms = useMemo(() => ({ glowColor: { value: new THREE.Color(0xe0b3ff) } }), []);

  useFrame((_, delta) => {
    stormUniforms.time.value += delta * 0.5;
    if (meshRef.current) meshRef.current.rotation.y = stormUniforms.time.value * 0.08;
  });

  return (
    <group visible={visible}>
      <mesh ref={meshRef} name="main-planet" onClick={onClick}>
        <sphereGeometry args={[PLANET_RADIUS, 48, 48]} />
        <shaderMaterial uniforms={stormUniforms} vertexShader={STORM_VERTEX_SHADER} fragmentShader={STORM_FRAGMENT_SHADER} />
      </mesh>
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS * 1.05, 48, 48]} />
        <shaderMaterial
          uniforms={atmosphereUniforms}
          vertexShader={ATMOSPHERE_VERTEX_SHADER}
          fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
        />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 2: Confirm it type-checks cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/components/experiences/galaxy-moon/Planet.tsx
git commit -m "feat(web): port Planet component with storm shader and single atmosphere shell"
```

---

### Task 8: `TextRings` component

**Files:**
- Create: `web/components/experiences/galaxy-moon/TextRings.tsx`

Ports the rotating caption-text cylinders around the planet (script.js:767-921, minus the dead `updateTextRingsRotation` per Fidelity decision #4) and their per-frame wobble/pulse (script.js:948-985 — note `tiltSpeed`/`rollSpeed`/`pitchSpeed` are all `0` in the original, so no actual tilt/roll/pitch motion occurs, only `angleOffset`-driven Y-rotation and a sine-based vertical bob and opacity pulse; preserve this exactly, don't "activate" the unused wobble parameters).

- [ ] **Step 1: Write `web/components/experiences/galaxy-moon/TextRings.tsx`**

```tsx
// web/components/experiences/galaxy-moon/TextRings.tsx
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PLANET_RADIUS = 10;
const RING_SPACING = 5;

function getCharType(char: string): "cjk" | "latin" | "other" {
  const code = char.charCodeAt(0);
  if (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3040 && code <= 0x309f) ||
    (code >= 0x30a0 && code <= 0x30ff) ||
    (code >= 0xac00 && code <= 0xd7af)
  ) {
    return "cjk";
  }
  if (code >= 0 && code <= 0x7f) return "latin";
  return "other";
}

function buildRingTexture(text: string, ringRadius: number): { texture: THREE.CanvasTexture; repeat: number } {
  const separator = "   ";
  const repeatedSegment = text + separator;
  const textureHeight = 200;
  const fontSize = Math.max(120, 0.9 * textureHeight);

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d")!;
  measureCtx.font = `bold ${fontSize}px Arial, sans-serif`;
  const segmentWidth = measureCtx.measureText(repeatedSegment).width;
  const circumference = 2 * Math.PI * ringRadius * 180;
  const repeatCount = Math.ceil(circumference / segmentWidth);

  let fullText = "";
  for (let j = 0; j < repeatCount; j++) fullText += repeatedSegment;
  let finalWidth = segmentWidth * repeatCount;
  if (finalWidth < 1 || !fullText) {
    fullText = repeatedSegment;
    finalWidth = segmentWidth;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(Math.max(1, finalWidth));
  canvas.height = textureHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, textureHeight);
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "#e0b3ff";
  ctx.shadowBlur = 24;
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#fff";
  ctx.strokeText(fullText, 0, textureHeight * 0.8);
  ctx.shadowColor = "#ffb3de";
  ctx.shadowBlur = 16;
  ctx.fillText(fullText, 0, textureHeight * 0.8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = finalWidth / circumference;
  texture.needsUpdate = true;

  return { texture, repeat: repeatCount };
}

interface TextRingsProps {
  texts: string[];
}

/** Rotating caption-text cylinders orbiting the planet (script.js:767-985). Tilt/roll/pitch speeds are 0 in the original — only angleOffset rotation, vertical bob, and opacity pulse actually animate; see plan Fidelity decision #4. */
export function TextRings({ texts }: TextRingsProps) {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const phasesRef = useRef<number[]>([]);

  const rings = useMemo(() => {
    if (phasesRef.current.length !== texts.length) {
      phasesRef.current = texts.map(() => Math.random() * Math.PI * 2);
    }
    return texts.map((text, i) => {
      const ringRadius = PLANET_RADIUS * 1.1 + i * RING_SPACING;
      const { texture } = buildRingTexture(text + "   ", ringRadius);
      return {
        ringRadius,
        texture,
        initialRotationX: (i / texts.length) * Math.PI,
      };
    });
  }, [texts]);

  useFrame(() => {
    const time = Date.now() * 0.001;
    rings.forEach((ring, index) => {
      const group = groupRefs.current[index];
      if (!group) return;
      const angleOffset = (group.userData.angleOffset ?? 0) + 0.008;
      group.userData.angleOffset = angleOffset;

      group.rotation.x = (index / rings.length) * Math.PI;
      group.rotation.z = 0; // rollSpeed is 0 in the original
      group.rotation.y = angleOffset; // pitchSpeed is 0, so no added pitch term

      const phase = phasesRef.current[index];
      group.position.y = Math.sin(time * 0 + phase) * 0.3; // tiltSpeed is 0, matches original's dead wobble

      const pulse = (Math.sin(time * 1.5 + index) + 1) / 2;
      const mesh = group.children[0] as THREE.Mesh | undefined;
      const material = mesh?.material as THREE.MeshBasicMaterial | undefined;
      if (material) material.opacity = 0.7 + pulse * 0.3;
    });
  });

  return (
    <>
      {rings.map((ring, i) => (
        <group key={i} ref={(el) => { groupRefs.current[i] = el; }} rotation={[ring.initialRotationX, 0, 0]}>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[ring.ringRadius, ring.ringRadius, 1, 128, 1, true]} />
            <meshBasicMaterial map={ring.texture} transparent side={THREE.DoubleSide} alphaTest={0.01} />
          </mesh>
        </group>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Confirm it type-checks cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/components/experiences/galaxy-moon/TextRings.tsx
git commit -m "feat(web): port TextRings component"
```

---

### Task 9: `ShootingStars` component

**Files:**
- Create: `web/components/experiences/galaxy-moon/ShootingStars.tsx`

Ports the shooting-star spawn/animate pool (script.js:499-638, 1205-1242), **excluding** the erroneous per-spawn atmosphere creation per Fidelity decision #5 (the `Planet` component, Task 7, already creates one atmosphere shell).

- [ ] **Step 1: Write `web/components/experiences/galaxy-moon/ShootingStars.tsx`**

```tsx
// web/components/experiences/galaxy-moon/ShootingStars.tsx
"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const TRAIL_LENGTH = 100;
const MAX_CONCURRENT = 3;
const SPAWN_CHANCE_PER_FRAME = 0.02;

interface ShootingStarState {
  group: THREE.Group;
  curve: THREE.CubicBezierCurve3;
  progress: number;
  speed: number;
  life: number;
  maxLife: number;
  head: THREE.Mesh;
  glowMaterial: THREE.ShaderMaterial;
  trail: THREE.Line;
  trailPoints: THREE.Vector3[];
}

function createRandomCurve(): THREE.CubicBezierCurve3 {
  const startPoint = new THREE.Vector3(-200 + Math.random() * 100, -100 + Math.random() * 200, -100 + Math.random() * 200);
  const endPoint = new THREE.Vector3(
    600 + Math.random() * 200,
    startPoint.y + (-100 + Math.random() * 200),
    startPoint.z + (-100 + Math.random() * 200),
  );
  const controlPoint1 = new THREE.Vector3(
    startPoint.x + 200 + Math.random() * 100,
    startPoint.y + (-50 + Math.random() * 100),
    startPoint.z + (-50 + Math.random() * 100),
  );
  const controlPoint2 = new THREE.Vector3(
    endPoint.x - 200 + Math.random() * 100,
    endPoint.y + (-50 + Math.random() * 100),
    endPoint.z + (-50 + Math.random() * 100),
  );
  return new THREE.CubicBezierCurve3(startPoint, controlPoint1, controlPoint2, endPoint);
}

/** Spawning/animating shooting star pool (script.js:499-638, 1205-1242). The per-spawn planet-atmosphere creation from the original is intentionally NOT ported here — see plan Fidelity decision #5; the Planet component owns the atmosphere. */
export function ShootingStars() {
  const { scene } = useThree();
  const starsRef = useRef<ShootingStarState[]>([]);

  function spawn() {
    const headGeometry = new THREE.SphereGeometry(2, 32, 32);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    const head = new THREE.Mesh(headGeometry, headMaterial);

    const glowGeometry = new THREE.SphereGeometry(3, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform float time;
        void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(1.0, 1.0, 1.0, intensity * (0.8 + sin(time * 5.0) * 0.2));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    head.add(glow);

    const curve = createRandomCurve();
    const trailPoints = Array.from({ length: TRAIL_LENGTH }, (_, i) => curve.getPoint(i / (TRAIL_LENGTH - 1)));
    const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
    const trailMaterial = new THREE.LineBasicMaterial({ color: 0x99eaff, transparent: true, opacity: 0.7 });
    const trail = new THREE.Line(trailGeometry, trailMaterial);

    const group = new THREE.Group();
    group.add(head);
    group.add(trail);
    scene.add(group);

    starsRef.current.push({
      group,
      curve,
      progress: 0,
      speed: 0.001 + Math.random() * 0.001,
      life: 0,
      maxLife: 300,
      head,
      glowMaterial,
      trail,
      trailPoints,
    });
  }

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const stars = starsRef.current;

    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.life++;
      s.progress += s.speed;

      let opacity = 1;
      if (s.life < 30) opacity = s.life / 30;
      else if (s.life > s.maxLife - 30) opacity = (s.maxLife - s.life) / 30;

      if (s.progress > 1 || s.life >= s.maxLife) {
        scene.remove(s.group);
        stars.splice(i, 1);
        continue;
      }

      const currentPos = s.curve.getPoint(s.progress);
      s.group.position.copy(currentPos);
      (s.head.material as THREE.MeshBasicMaterial).opacity = opacity;
      s.glowMaterial.uniforms.time.value = time;

      s.trailPoints[0].copy(currentPos);
      for (let j = 1; j < TRAIL_LENGTH; j++) {
        const trailProgress = Math.max(0, s.progress - j * 0.01);
        s.trailPoints[j].copy(s.curve.getPoint(trailProgress));
      }
      s.trail.geometry.setFromPoints(s.trailPoints);
      (s.trail.material as THREE.LineBasicMaterial).opacity = opacity * 0.7;
    }

    if (stars.length < MAX_CONCURRENT && Math.random() < SPAWN_CHANCE_PER_FRAME) {
      spawn();
    }
  });

  return null;
}
```

- [ ] **Step 2: Confirm it type-checks cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/components/experiences/galaxy-moon/ShootingStars.tsx
git commit -m "feat(web): port ShootingStars component (atmosphere-creation bug excluded)"
```

---

### Task 10: `HintIcon` and `CameraFlythrough` components

**Files:**
- Create: `web/components/experiences/galaxy-moon/HintIcon.tsx`
- Create: `web/components/experiences/galaxy-moon/CameraFlythrough.tsx`

`HintIcon` ports the pre-intro tap cursor + pulsing ring + "Chạm Vào Tinh Cầu" hint text (script.js:995-1118, 1293-1328). `CameraFlythrough` ports the 3-phase eased camera path (script.js:1342-1398) that begins once the user clicks the planet.

- [ ] **Step 1: Write `web/components/experiences/galaxy-moon/HintIcon.tsx`**

```tsx
// web/components/experiences/galaxy-moon/HintIcon.tsx
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HintIconProps {
  visible: boolean;
  planetPosition: [number, number, number];
}

function createHintTextTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const fontSize = 50;
  const text = "Chạm Vào Tinh Cầu";
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#ffb3de";
  ctx.shadowBlur = 5;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 200, 220, 0.8)";
  ctx.strokeText(text, size / 2, size / 2);
  ctx.shadowColor = "#e0b3ff";
  ctx.strokeStyle = "rgba(220, 180, 255, 0.5)";
  ctx.strokeText(text, size / 2, size / 2);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.fillStyle = "white";
  ctx.fillText(text, size / 2, size / 2);
  return new THREE.CanvasTexture(canvas);
}

/** Pre-intro tap cursor + pulsing ring + hint text (script.js:995-1118, 1293-1328). */
export function HintIcon({ visible, planetPosition }: HintIconProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const hintTextRef = useRef<THREE.Sprite>(null);
  const initialPosition = useMemo(() => new THREE.Vector3(1.5, 1.5, 15), []);
  const hintTexture = useMemo(() => createHintTextTexture(), []);

  useFrame((state) => {
    if (!visible || !groupRef.current) return;
    const time = state.clock.getElapsedTime();
    const tapFrequency = 2.5;
    const tapAmplitude = 1.5;
    const tapOffset = Math.sin(time * tapFrequency) * tapAmplitude;

    const direction = new THREE.Vector3();
    groupRef.current.getWorldDirection(direction);
    groupRef.current.position.copy(initialPosition).addScaledVector(direction, -tapOffset);
    groupRef.current.lookAt(...planetPosition);

    if (ringRef.current) {
      const scale = 1 + Math.sin(time * tapFrequency) * 0.1;
      ringRef.current.scale.set(scale, scale, 1);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(time * tapFrequency) * 0.2;
    }
    if (hintTextRef.current) {
      const mat = hintTextRef.current.material as THREE.SpriteMaterial;
      mat.opacity = 0.7 + Math.sin(time * 3) * 0.3;
      hintTextRef.current.position.y = 15 + Math.sin(time * 2) * 0.5;
    }
  });

  return (
    <group visible={visible}>
      <group ref={groupRef} scale={0.8}>
        <group position={[0, 0.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <shapeGeometry args={[buildCursorShape()]} />
            <meshBasicMaterial color={0xffffff} side={THREE.DoubleSide} />
          </mesh>
        </group>
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 2.0, 32]} />
          <meshBasicMaterial color={0xffffff} side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
      </group>
      <sprite ref={hintTextRef} position={[0, 15, 0]} scale={[16, 16, 1]}>
        <spriteMaterial map={hintTexture} transparent side={THREE.DoubleSide} />
      </sprite>
    </group>
  );
}

function buildCursorShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const h = 1.5;
  const w = h * 0.5;
  shape.moveTo(0, 0);
  shape.lineTo(-w * 0.4, -h * 0.7);
  shape.lineTo(-w * 0.25, -h * 0.7);
  shape.lineTo(-w * 0.5, -h);
  shape.lineTo(w * 0.5, -h);
  shape.lineTo(w * 0.25, -h * 0.7);
  shape.lineTo(w * 0.4, -h * 0.7);
  shape.closePath();
  return shape;
}
```

- [ ] **Step 2: Write `web/components/experiences/galaxy-moon/CameraFlythrough.tsx`**

```tsx
// web/components/experiences/galaxy-moon/CameraFlythrough.tsx
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const DURATION_1 = 0.2;
const DURATION_2 = 0.55;
const DURATION_3 = 0.4;
const PROGRESS_STEP = 0.00101;
const END_POSITION = new THREE.Vector3(-40, 100, 100);

interface CameraFlythroughProps {
  active: boolean;
  onComplete?: () => void;
}

/** 3-phase eased camera path from the starting orbit position to the final overview position (script.js:1342-1398). */
export function CameraFlythrough({ active, onComplete }: CameraFlythroughProps) {
  const progressRef = useRef(0);
  const startPosRef = useRef<THREE.Vector3 | null>(null);
  const doneRef = useRef(false);

  useFrame(({ camera }) => {
    if (!active || doneRef.current) return;

    if (!startPosRef.current) {
      startPosRef.current = camera.position.clone();
    }
    const startPos = startPosRef.current;
    const midPos1 = new THREE.Vector3(startPos.x, 0, startPos.z);
    const midPos2 = new THREE.Vector3(startPos.x, 0, 160);

    progressRef.current += PROGRESS_STEP;
    const progress = progressRef.current;

    let next: THREE.Vector3;
    if (progress < DURATION_1) {
      const t = progress / DURATION_1;
      next = startPos.clone().lerp(midPos1, t);
    } else if (progress < DURATION_1 + DURATION_2) {
      const t = (progress - DURATION_1) / DURATION_2;
      next = midPos1.clone().lerp(midPos2, t);
    } else if (progress < DURATION_1 + DURATION_2 + DURATION_3) {
      const t = (progress - DURATION_1 - DURATION_2) / DURATION_3;
      const easedT = 0.5 - 0.5 * Math.cos(Math.PI * t);
      next = midPos2.clone().lerp(END_POSITION, easedT);
    } else {
      camera.position.copy(END_POSITION);
      camera.lookAt(0, 0, 0);
      doneRef.current = true;
      onComplete?.();
      return;
    }

    camera.position.copy(next);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
```

- [ ] **Step 3: Confirm both type-check cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add web/components/experiences/galaxy-moon/HintIcon.tsx web/components/experiences/galaxy-moon/CameraFlythrough.tsx
git commit -m "feat(web): port HintIcon and CameraFlythrough components"
```

---

### Task 11: `GalaxyMoonExperience` top-level composition (replaces the stub)

**Files:**
- Modify: `web/components/experiences/GalaxyMoonExperience.tsx` (replaces the Foundation plan's stub entirely)
- Create: `web/components/experiences/galaxy-moon/GalaxyMoonExperience.module.css`

Wires every component from Tasks 4-10 into one `<Canvas>`, plus the click-to-start interaction (script.js:1122-1478: raycast the planet on click, trigger fullscreen + `CameraFlythrough` + hide `HintIcon`/intro fade + attempt `musicManager.play()`), the fade-in-after-intro opacity transition (script.js:1132-1203, simplified to a single CSS-driven overlay fade rather than a per-object `scene.traverse` opacity walk — see note below), theme fog/background (script.js:115-120), and the shared `LandscapeWarning`/`AudioToggleButton`.

**Note on the fade-in behavior:** the original's `animate()` loop traverses every scene object every frame to set `material.opacity` based on `introStarted`/`fadeOpacity` (script.js:1132-1203) — a global "dim everything except the planet until you tap it" effect. Porting that exact per-object traversal to R3F would require every child component to expose an opacity ref, adding significant coupling for a purely cosmetic pre-intro dimming effect. Instead, this task achieves the same *visual* result with a single semi-transparent CSS overlay `<div>` positioned over the canvas, shown before the intro starts and faded out via CSS transition once `introStarted` becomes true — same observable effect (scene dims until tapped, then reveals over ~1s), simpler implementation. This is a deliberate, documented deviation — flag it in your self-review, don't silently treat it as equivalent without noting it.

- [ ] **Step 1: Write `web/components/experiences/galaxy-moon/GalaxyMoonExperience.module.css`**

```css
/* web/components/experiences/galaxy-moon/GalaxyMoonExperience.module.css */
.root {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at center, #0a0a1f 0%, #000000 100%);
}

.canvasWrapper {
  position: fixed;
  inset: 0;
}

.dimOverlay {
  position: fixed;
  inset: 0;
  z-index: 15;
  background: rgba(0, 0, 5, 0.95);
  pointer-events: none;
  opacity: 1;
  transition: opacity 1.5s ease-in-out;
}
.dimOverlay.hidden {
  opacity: 0;
}
```

- [ ] **Step 2: Replace `web/components/experiences/GalaxyMoonExperience.tsx`**

```tsx
// web/components/experiences/GalaxyMoonExperience.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import clsx from "clsx";
import { useGalaxyView } from "@/lib/hooks/useGalaxyView";
import { useMusicManager } from "@/lib/hooks/useMusicManager";
import { useHeartImages } from "@/lib/galaxy-moon/useHeartImages";
import { computePointsPerGroup } from "@/lib/galaxy-moon/heartDensity";
import { AudioToggleButton } from "@/components/AudioToggleButton";
import { LandscapeWarning } from "@/components/LandscapeWarning";
import { Background } from "./galaxy-moon/Background";
import { Starfield } from "./galaxy-moon/Starfield";
import { ShootingStars } from "./galaxy-moon/ShootingStars";
import { GalaxyParticles } from "./galaxy-moon/GalaxyParticles";
import { HeartPointCloud } from "./galaxy-moon/HeartPointCloud";
import { Planet } from "./galaxy-moon/Planet";
import { TextRings } from "./galaxy-moon/TextRings";
import { HintIcon } from "./galaxy-moon/HintIcon";
import { CameraFlythrough } from "./galaxy-moon/CameraFlythrough";
import styles from "./galaxy-moon/GalaxyMoonExperience.module.css";

const GALAXY_POINT_COUNT = 100000;

interface GalaxyMoonExperienceProps {
  galaxyId: string;
}

interface SceneProps {
  introStarted: boolean;
  onPlanetClick: () => void;
  heartImages: string[];
  captions: string[];
  insideColor: THREE.Color;
  outsideColor: THREE.Color;
}

function Scene({ introStarted, onPlanetClick, heartImages, captions, insideColor, outsideColor }: SceneProps) {
  const pointsPerGroup = useMemo(
    () => (heartImages.length > 0 ? computePointsPerGroup(heartImages.length, GALAXY_POINT_COUNT) : 0),
    [heartImages.length],
  );

  return (
    <>
      <ambientLight intensity={0.2} />
      <Background />
      <Starfield introStarted={introStarted} />
      <ShootingStars />
      <GalaxyParticles />
      {heartImages.map((url, i) => (
        <HeartPointCloud
          key={url + i}
          imageUrl={url}
          groupIndex={i}
          pointsPerGroup={pointsPerGroup}
          insideColor={insideColor}
          outsideColor={outsideColor}
        />
      ))}
      <Planet visible onClick={onPlanetClick} />
      <TextRings texts={captions} />
      <HintIcon visible={!introStarted} planetPosition={[0, 0, 0]} />
      <CameraFlythrough active={introStarted} />
      <OrbitControls
        enabled={introStarted}
        enableDamping
        autoRotate
        autoRotateSpeed={0.5}
        target={[0, 0, 0]}
        enablePan={false}
        minDistance={15}
        maxDistance={300}
        zoomSpeed={0.3}
        rotateSpeed={0.3}
      />
    </>
  );
}

export function GalaxyMoonExperience({ galaxyId }: GalaxyMoonExperienceProps) {
  const { images, captions, music, theme } = useGalaxyView(galaxyId);
  const musicManager = useMusicManager(music);
  const heartImages = useHeartImages(images);
  const [introStarted, setIntroStarted] = useState(false);

  const insideColor = useMemo(() => new THREE.Color(theme?.primary || 0xd63ed6), [theme?.primary]);
  const outsideColor = useMemo(() => new THREE.Color(theme?.secondary || 0x48b8b8), [theme?.secondary]);
  const backgroundColor = useMemo(() => (theme?.background ? new THREE.Color(theme.background) : new THREE.Color(0x000000)), [theme?.background]);

  const handlePlanetClick = useCallback(() => {
    if (introStarted) return;
    setIntroStarted(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
    musicManager.play();
  }, [introStarted, musicManager]);

  return (
    <div className={styles.root}>
      <LandscapeWarning />
      <div className={styles.canvasWrapper}>
        <Canvas
          camera={{ fov: 75, near: 0.1, far: 100000, position: [0, 20, 30] }}
          gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace }}
        >
          <color attach="background" args={[backgroundColor]} />
          <fogExp2 attach="fog" args={[backgroundColor.getHex(), 0.0015]} />
          <Scene
            introStarted={introStarted}
            onPlanetClick={handlePlanetClick}
            heartImages={heartImages}
            captions={captions}
            insideColor={insideColor}
            outsideColor={outsideColor}
          />
        </Canvas>
      </div>
      <div className={clsx(styles.dimOverlay, introStarted && styles.hidden)} />
      <AudioToggleButton isPlaying={musicManager.isPlaying} hasTrack={musicManager.hasTrack} onToggle={musicManager.toggle} />
    </div>
  );
}
```

Note: unlike `fall.js`/`story.js`, the original `galaxy-moon/js/script.js` never sets `document.title` anywhere — the page keeps whatever title `index.html` shipped with. This port matches that (no title-setting code here); do not add a `document.title` side effect for this component.

- [ ] **Step 3: Confirm it type-checks cleanly and lints cleanly**

```bash
cd web && npx tsc --noEmit && npx eslint components/experiences/GalaxyMoonExperience.tsx components/experiences/galaxy-moon
```

- [ ] **Step 4: Run the full test suite to confirm no regressions**

```bash
cd web && npm test
```

- [ ] **Step 5: Commit**

```bash
git add web/components/experiences/GalaxyMoonExperience.tsx web/components/experiences/galaxy-moon/GalaxyMoonExperience.module.css
git commit -m "feat(web): replace GalaxyMoonExperience stub with full react-three-fiber port"
```

---

### Task 12: End-to-end manual verification

No new files — confirms Tasks 1-11 work together against real data, following the same approach as the Foundation plan's Task 16.

- [ ] **Step 1: Start both servers** (Express at repo root, Next.js in `web/`) against real or seeded MongoDB data, including at least one galaxy with a `template: "galaxy"` (or no template, since that's the default), multiple gallery photos (to exercise more than one `HeartPointCloud`), a caption array (to exercise `TextRings`), and a theme with custom `primary`/`secondary`/`background` colors.

- [ ] **Step 2: Visually verify against the original** by opening the OLD experience at `http://localhost:3030/galaxy-moon/?galaxyId=<id>` (Express, unchanged) and the NEW one at `http://localhost:3000/view/?galaxyId=<id>` (Next.js) side by side. Confirm: spiral galaxy shape/color (magenta-to-cyan, NOT theme-colored — per Fidelity decision #1), heart point clouds appear and swap to opaque/white when the camera orbits close, planet storm-texture animates, text rings rotate and pulse, shooting stars spawn periodically, hint icon pulses before tap, clicking the planet triggers fullscreen + camera flythrough + music + hint icon disappearing, landscape warning appears in portrait mode on a touch device (or emulated via devtools), audio toggle button works.

- [ ] **Step 3: Verify no console errors**, particularly: no `ReferenceError` when clicking elsewhere after the intro has started (confirms Fidelity decision #6's no-op fix works), no runaway growth in scene object count over a multi-minute session (confirms Fidelity decision #5's single-atmosphere fix works — check `renderer.info.memory.geometries`/`.textures` in devtools console periodically, they should plateau, not climb indefinitely).

- [ ] **Step 4: Run the full test suite and production build**

```bash
cd web && npm test && npm run build
```

Expected: all Vitest tests pass, `next build` completes with no type errors.

No commit for this task — verification only. If any step reveals a bug, fix it in a new commit against the relevant task's files (do not amend past commits), same discipline as the Foundation plan.
