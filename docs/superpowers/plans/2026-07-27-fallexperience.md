# FallExperience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stub `web/components/experiences/FallExperience.tsx` (from the Foundation plan) with a full react-three-fiber port of `public/fall/js/fall.js` — an endless downward "falling through space" experience with drifting photo polaroids, a mystery planet, aurora ribbon, and click-and-drag polaroid zoom interaction.

**Architecture:** Mirrors the GalaxyMoonExperience plan's approach: one `<Canvas>` composed of focused R3F components under `web/components/experiences/fall/`, driven by `useGalaxyView` + shared `useMusicManager`/`LandscapeWarning`/`AudioToggleButton`. The infinite polaroid spawn/despawn system and its click-drag-to-zoom interaction (the most complex part of this experience) is implemented with `useFrame` + refs, exactly like the original's direct object mutation — re-rendering hundreds of drifting polaroids through React state on every frame would be far slower and would not reproduce the original's per-frame drift/proximity/fade math faithfully.

**Tech Stack:** `three`, `@react-three/fiber`, `@react-three/drei` (already added to `web/package.json` by the GalaxyMoonExperience plan's Task 1 — Task 1 below just confirms they're present rather than re-installing, so this plan works whether it's executed before or after that one). TypeScript, CSS Modules for the 2D freeze-state overlay. Vitest for the one piece of pure, testable logic (column offset layout math).

**Source of truth this plan ports from (unchanged, still at the repo root during this phase):**
- `public/fall/js/fall.js` (1106 lines — the file this plan replaces)
- `public/fall/index.html` (DOM structure, importmap, inline `window.musicManager`, `#intro`/`#canvas-container` markup)

## Fidelity decisions (read before starting any task)

1. **Bug — real, being fixed: theme colors never apply.** `fetchData()` (fall.js:19) sets `theme: view.theme?.colors || null` — so `data.theme` is ALREADY the unwrapped `{ background, primary, secondary }` object. But later, `init()` (fall.js:650-651) reads `data.theme?.colors?.primary` / `data.theme?.colors?.secondary` — a second, incorrect `.colors` accessor on an object that's already unwrapped. Since `data.theme.colors` doesn't exist, this is always `undefined`, so the aurora ribbon and sparkle-color palette **always** use the hardcoded defaults (`#00e699`/`#8019e5`), silently ignoring any galaxy's configured theme colors. Only `data.theme.background` (fall.js:638, correctly single-level) actually works today. **Fix: read `theme.primary`/`theme.secondary` directly (no extra `.colors`)** in the ported version, matching how `aurora.js` already does it correctly and how `GalaxyMoonExperience`'s port handles its own theme colors. This is a deliberate, documented deviation — the fix actually makes the existing theme-customization feature work as evidently intended, rather than silently leaving it broken.
2. **`totalDepth` is a dead variable** (fall.js:26, declared, never read or written again). **Do not port it.**
3. **`window._spawnRow`/`window._colOffsets`/`window._nextRowZ`/`window._captionSprites`** are the original's way of sharing mutable state between `init()`'s closure and the top-level `animate()` function (since they're defined in different scopes). `window._colOffsets` in particular is set but never actually read anywhere. **Do not port any of this as `window` globals** — in the R3F port, this state lives naturally in refs owned by the `PolaroidField` component, which owns both spawning and per-frame animation.
4. **The "freeze" overlay text** (`✦ Ngưng Đọng Thời Gian ✦`, fall.js:927-930) is built via raw `document.createElement`/`appendChild` outside the React tree in the original. **Port it as a normal React-rendered 2D overlay** (a `FreezeOverlay` component), not a manual DOM injection — same visual result, idiomatic for this codebase.
5. **Preserve the per-frame O(n) polaroid proximity/fade math exactly** (fall.js:993-1058: every polaroid, every frame, computes distance to camera for drift-avoidance, alpha fade, and burst-particle triggering). Do not replace with a spatial-partitioning optimization — that could change exactly when a polaroid's burst/avoidance triggers relative to camera position, a real behavior change even if faster.

## File Structure

```
web/lib/fall/
  columnLayout.ts            — computeColumnOffsets(imageCount) pure function + test
web/components/experiences/
  FallExperience.tsx         — REPLACES the stub. Canvas shell, intro overlay, click-to-start, shared hooks/components
  fall/
    StarfieldAndDust.tsx      — 8k background stars + 6k colored dust particles
    Sparkles.tsx              — 8k twinkling star-shaped shader particles
    ShootingStars.tsx         — fall-specific spawn/animate pool (different curve range/timing than GalaxyMoonExperience's)
    Aurora.tsx                — animated ribbon plane shader (theme-tinted, per Fidelity decision #1)
    MysteryPlanet.tsx         — distant shader planet + halo + ring + glow sprite
    GalaxyBand.tsx            — 3-layer particle band (core/arms/nebula) + central glow
    UpperNebula.tsx           — 12 fixed nebula sprites + one "north star" sprite
    Polaroid.tsx              — single photo+frame+glow group factory (used by PolaroidField)
    PolaroidField.tsx         — infinite spawn/despawn, drift/fade/proximity animation, click-drag-to-zoom interaction, burst particles
    FreezeOverlay.tsx         — "Ngưng Đọng Thời Gian" 2D text overlay, shown while a polaroid is being held
    CameraFall.tsx            — camera fall-speed/position/look-around driver
```

---

### Task 1: Confirm dependencies and add pure column-layout helper

**Files:**
- Modify: `web/package.json` (only if `three`/`@react-three/fiber`/`@react-three/drei` are missing)
- Create: `web/lib/fall/columnLayout.ts`
- Test: `web/lib/fall/columnLayout.test.ts`

`computeColumnOffsets` ports the column-count/spacing logic from fall.js:685-687 (3 columns for ≤12 photos, 4 columns for more, evenly spaced around center).

- [ ] **Step 1: Confirm R3F dependencies are present, install only if missing**

```bash
cd web && node -e "require('three'); require('@react-three/fiber'); require('@react-three/drei'); console.log('already installed')" || npm install three @react-three/fiber @react-three/drei
```

If the GalaxyMoonExperience plan's Task 1 already ran, this prints "already installed" and does nothing further.

- [ ] **Step 2: Write the failing test**

```ts
// web/lib/fall/columnLayout.test.ts
import { describe, it, expect } from "vitest";
import { computeColumnOffsets } from "./columnLayout";

describe("computeColumnOffsets", () => {
  it("uses 3 columns for 12 or fewer images", () => {
    expect(computeColumnOffsets(1)).toHaveLength(3);
    expect(computeColumnOffsets(12)).toHaveLength(3);
  });

  it("uses 4 columns for more than 12 images", () => {
    expect(computeColumnOffsets(13)).toHaveLength(4);
    expect(computeColumnOffsets(50)).toHaveLength(4);
  });

  it("spaces columns evenly around zero, 8.5 units apart", () => {
    expect(computeColumnOffsets(1)).toEqual([-8.5, 0, 8.5]);
  });

  it("spaces 4 columns evenly around zero", () => {
    const offsets = computeColumnOffsets(13);
    expect(offsets).toEqual([-12.75, -4.25, 4.25, 12.75]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd web && npx vitest run lib/fall/columnLayout.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 4: Write `web/lib/fall/columnLayout.ts`**

```ts
// web/lib/fall/columnLayout.ts

const COL_SPACING = 8.5;

/** Column x-offsets for the polaroid field: 3 columns for <=12 photos, 4 for more (fall.js:685-687). */
export function computeColumnOffsets(imageCount: number): number[] {
  const cols = imageCount <= 12 ? 3 : 4;
  return Array.from({ length: cols }, (_, c) => (c - (cols - 1) / 2) * COL_SPACING);
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd web && npx vitest run lib/fall/columnLayout.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add web/package.json web/package-lock.json web/lib/fall/columnLayout.ts web/lib/fall/columnLayout.test.ts
git commit -m "feat(web): confirm r3f deps and add fall polaroid column-layout helper"
```

---

### Task 2: `StarfieldAndDust` component

**Files:**
- Create: `web/components/experiences/fall/StarfieldAndDust.tsx`

Ports the two simplest background particle layers: an 8k-point white starfield (fall.js:42-57) and a 6k-point colored dust cloud (fall.js:59-85). Both scroll with the camera's Z position and dust additionally drifts in a slow sine/cosine path (fall.js:1076-1081) — this component exposes a ref-driven `useFrame` update for both, keyed off `cameraZ` passed in from the parent's `CameraFall` state.

- [ ] **Step 1: Write `web/components/experiences/fall/StarfieldAndDust.tsx`**

```tsx
// web/components/experiences/fall/StarfieldAndDust.tsx
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface StarfieldAndDustProps {
  cameraZRef: React.RefObject<number>;
}

/** 8k white starfield + 6k colored dust cloud, both scrolling with camera Z (fall.js:42-85, 1076-1081). */
export function StarfieldAndDust({ cameraZRef }: StarfieldAndDustProps) {
  const starsRef = useRef<THREE.Points>(null);
  const dustRef = useRef<THREE.Points>(null);

  const starPositions = useMemo(() => {
    const count = 8000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 1200;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1200;
      pos[i * 3 + 2] = -Math.random() * 1200;
    }
    return pos;
  }, []);

  const dust = useMemo(() => {
    const count = 6000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 70;
      pos[i * 3 + 2] = -Math.random() * 600;
      col[i * 3] = 0.7 + Math.random() * 0.3;
      col[i * 3 + 1] = 0.5 + Math.random() * 0.3;
      col[i * 3 + 2] = 0.9 + Math.random() * 0.1;
    }
    return { pos, col };
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const cameraZ = cameraZRef.current;
    if (starsRef.current) starsRef.current.position.z = cameraZ * 0.3;
    if (dustRef.current) {
      dustRef.current.position.z = cameraZ * 0.85;
      dustRef.current.position.x = Math.sin(t * 0.15) * 0.5;
      dustRef.current.position.y = Math.cos(t * 0.1) * 0.3;
    }
  });

  return (
    <>
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={0xffffff} size={0.6} transparent opacity={0.7} depthWrite={false} />
      </points>
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dust.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[dust.col, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          vertexColors
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
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
git add web/components/experiences/fall/StarfieldAndDust.tsx
git commit -m "feat(web): port fall StarfieldAndDust component"
```

---

### Task 3: `Sparkles` component

**Files:**
- Create: `web/components/experiences/fall/Sparkles.tsx`

Ports the 8k twinkling four-pointed-star shader particles (fall.js:87-150), including the palette-based vertex colors that get overwritten by theme colors once data loads (fall.js:653-668, wired up by the top-level component in Task 12, per Fidelity decision #1).

- [ ] **Step 1: Write `web/components/experiences/fall/Sparkles.tsx`**

```tsx
// web/components/experiences/fall/Sparkles.tsx
"use client";

import { forwardRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PALETTE: [number, number, number][] = [
  [1.0, 0.85, 0.25], // gold
  [1.0, 0.4, 0.75], // pink
  [0.3, 0.9, 1.0], // cyan
  [0.8, 0.45, 1.0], // purple
  [1.0, 1.0, 1.0], // white
];

const VERTEX_SHADER = `
  attribute float aPhase; attribute float aSpeed;
  uniform float uTime;
  varying vec3 vColor; varying float vAlpha;
  void main() {
    vColor = color;
    float tw = sin(uTime * aSpeed + aPhase) * 0.5 + 0.5;
    vAlpha = tw * tw;
    gl_PointSize = 1.5 + tw * 5.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor; varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    if (length(uv) > 0.5) discard;
    float core = exp(-length(uv) * 14.0);
    float rayH = exp(-abs(uv.y) * 28.0) * (1.0 - smoothstep(0.0, 0.5, abs(uv.x)));
    float rayV = exp(-abs(uv.x) * 28.0) * (1.0 - smoothstep(0.0, 0.5, abs(uv.y)));
    float star = core + (rayH + rayV) * 0.9;
    gl_FragColor = vec4(vColor, star * vAlpha);
  }
`;

interface SparklesProps {
  cameraZRef: React.RefObject<number>;
}

/** 8k twinkling star-shaped shader particles (fall.js:87-150). Exposes its color BufferAttribute via ref so the top-level component can re-tint it once theme colors load (fall.js:653-668). */
export const Sparkles = forwardRef<THREE.Points, SparklesProps>(function Sparkles({ cameraZRef }, ref) {
  const { positions, colors } = useMemo(() => {
    const count = 8000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 700;
      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
      phase[i] = Math.random() * Math.PI * 2;
      speed[i] = 1.2 + Math.random() * 4.0;
    }
    return { positions: pos, colors: col, phase, speed };
  }, []);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
    const points = (ref as React.RefObject<THREE.Points>)?.current;
    if (points) points.position.z = cameraZRef.current * 0.92;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aPhase" args={[phase, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[speed, 1]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
      />
    </points>
  );
});
```

- [ ] **Step 2: Confirm it type-checks cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/components/experiences/fall/Sparkles.tsx
git commit -m "feat(web): port fall Sparkles shader component"
```

---

### Task 4: `ShootingStars` component (fall-specific)

**Files:**
- Create: `web/components/experiences/fall/ShootingStars.tsx`

Ports fall.js's own shooting-star pool (fall.js:154-213) — a **different** implementation from `GalaxyMoonExperience`'s (different curve range anchored to `cameraZ`, different trail length/count/opacity timings/spawn chance). Do not reuse or generalize the two into a shared component; port each faithfully to its own file, matching the plan's per-experience fidelity approach.

- [ ] **Step 1: Write `web/components/experiences/fall/ShootingStars.tsx`**

```tsx
// web/components/experiences/fall/ShootingStars.tsx
"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const TRAIL = 80;
const MAX_CONCURRENT = 3;
const SPAWN_CHANCE_PER_FRAME = 0.018;

interface ShootingStarState {
  group: THREE.Group;
  curve: THREE.CubicBezierCurve3;
  progress: number;
  speed: number;
  life: number;
  maxLife: number;
  head: THREE.Mesh;
  trail: THREE.Line;
  pts: THREE.Vector3[];
}

interface ShootingStarsProps {
  cameraZRef: React.RefObject<number>;
}

function randomCurve(cameraZ: number): THREE.CubicBezierCurve3 {
  const s = new THREE.Vector3(-150 + Math.random() * 80, -60 + Math.random() * 120, cameraZ - 20 - Math.random() * 60);
  const e = new THREE.Vector3(s.x + 300 + Math.random() * 150, s.y + (-80 + Math.random() * 160), s.z + (-60 + Math.random() * 120));
  const c1 = new THREE.Vector3(s.x + 120 + Math.random() * 80, s.y + (-40 + Math.random() * 80), s.z + (-40 + Math.random() * 80));
  const c2 = new THREE.Vector3(e.x - 120 + Math.random() * 80, e.y + (-40 + Math.random() * 80), e.z + (-40 + Math.random() * 80));
  return new THREE.CubicBezierCurve3(s, c1, c2, e);
}

/** Fall-specific shooting star pool anchored to the falling camera's Z position (fall.js:154-213). Distinct implementation from GalaxyMoonExperience's ShootingStars — different curve range/trail length/timings. */
export function ShootingStars({ cameraZRef }: ShootingStarsProps) {
  const { scene } = useThree();
  const starsRef = useRef<ShootingStarState[]>([]);

  function spawn() {
    const headGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const head = new THREE.Mesh(headGeo, headMat);

    const curve = randomCurve(cameraZRef.current);
    const pts = Array.from({ length: TRAIL }, (_, i) => curve.getPoint(i / (TRAIL - 1)));
    const trailGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const trailMat = new THREE.LineBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    const trail = new THREE.Line(trailGeo, trailMat);

    const group = new THREE.Group();
    group.add(head);
    group.add(trail);
    scene.add(group);

    starsRef.current.push({
      group,
      curve,
      progress: 0,
      speed: 0.0012 + Math.random() * 0.001,
      life: 0,
      maxLife: 280,
      head,
      trail,
      pts,
    });
  }

  useFrame(() => {
    const stars = starsRef.current;
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.life++;
      s.progress += s.speed;

      let opacity = 1;
      if (s.life < 25) opacity = s.life / 25;
      else if (s.life > s.maxLife - 25) opacity = (s.maxLife - s.life) / 25;

      if (s.progress >= 1 || s.life >= s.maxLife) {
        scene.remove(s.group);
        stars.splice(i, 1);
        continue;
      }

      const pos = s.curve.getPoint(s.progress);
      s.head.position.copy(pos);
      (s.head.material as THREE.MeshBasicMaterial).opacity = opacity;

      for (let j = 0; j < TRAIL; j++) {
        const tp = Math.max(0, s.progress - j * 0.008);
        s.pts[j].copy(s.curve.getPoint(tp));
      }
      s.trail.geometry.setFromPoints(s.pts);
      (s.trail.material as THREE.LineBasicMaterial).opacity = opacity * 0.55;
    }

    if (stars.length < MAX_CONCURRENT && Math.random() < SPAWN_CHANCE_PER_FRAME) spawn();
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
git add web/components/experiences/fall/ShootingStars.tsx
git commit -m "feat(web): port fall-specific ShootingStars component"
```

---

### Task 5: `Aurora` component

**Files:**
- Create: `web/components/experiences/fall/Aurora.tsx`

Ports the animated ribbon-plane aurora (fall.js:216-258). Its two colors are theme-tinted via `useImperativeHandle`-free direct uniform mutation exposed through a ref, wired up by the top-level component (Task 12) per Fidelity decision #1 (this is where the "always broken" theme colors actually get fixed).

- [ ] **Step 1: Write `web/components/experiences/fall/Aurora.tsx`**

```tsx
// web/components/experiences/fall/Aurora.tsx
"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const VERTEX_SHADER = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.y += sin(pos.x * 0.08 + uTime * 0.6) * 5.0
            + sin(pos.x * 0.15 + uTime * 0.4) * 3.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  varying vec2 vUv;
  void main() {
    float alpha = sin(vUv.x * 3.14159) * (1.0 - vUv.y) * 0.35;
    alpha *= 0.6 + 0.4 * sin(vUv.x * 8.0 + uTime * 0.7);
    vec3 col = mix(uColor1, uColor2, vUv.x + 0.3 * sin(uTime * 0.3));
    gl_FragColor = vec4(col, alpha);
  }
`;

export interface AuroraHandle {
  uniforms: { uTime: { value: number }; uColor1: { value: THREE.Color }; uColor2: { value: THREE.Color } };
}

interface AuroraProps {
  cameraZRef: React.RefObject<number>;
}

/** Animated aurora ribbon (fall.js:216-258), following the camera's Z position 80 units behind. Exposes its color uniforms via `useImperativeHandle` for the top-level component to re-tint from theme colors (Fidelity decision #1). */
export const Aurora = forwardRef<AuroraHandle, AuroraProps>(function Aurora({ cameraZRef }, ref) {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color(0x00e699) },
      uColor2: { value: new THREE.Color(0x8019e5) },
    }),
    [],
  );

  useImperativeHandle(ref, () => ({ uniforms }), [uniforms]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
    if (meshRef.current) meshRef.current.position.z = cameraZRef.current - 80;
  });

  return (
    <mesh ref={meshRef} position={[0, 18, -80]} rotation={[0.15, 0, 0]}>
      <planeGeometry args={[200, 40, 60, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
});
```

- [ ] **Step 2: Confirm it type-checks cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add web/components/experiences/fall/Aurora.tsx
git commit -m "feat(web): port fall Aurora ribbon component"
```

---

### Task 6: `MysteryPlanet` component

**Files:**
- Create: `web/components/experiences/fall/MysteryPlanet.tsx`

Ports the distant shader planet with halo, ring, and glow sprite (fall.js:261-367), fixed at a static position (not following the camera — it's meant to be a distant landmark the camera falls past).

- [ ] **Step 1: Write `web/components/experiences/fall/MysteryPlanet.tsx`**

```tsx
// web/components/experiences/fall/MysteryPlanet.tsx
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SPHERE_VERTEX = `
  varying vec3 vNormal; varying vec2 vUv;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SPHERE_FRAGMENT = `
  uniform float uTime; varying vec3 vNormal; varying vec2 vUv;
  void main() {
    float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0,0.0,1.0))), 2.2);
    float band = sin(vUv.y * 18.0 + uTime * 0.12) * 0.5 + 0.5;
    float swirl = sin(vUv.x * 10.0 + vUv.y * 6.0 + uTime * 0.08) * 0.5 + 0.5;
    vec3 dark = vec3(0.03, 0.01, 0.12);
    vec3 mid  = vec3(0.08, 0.03, 0.28);
    vec3 edge = vec3(0.35, 0.08, 0.75);
    vec3 col = mix(dark, mid, band * swirl);
    col = mix(col, edge, rim * 0.7);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const HALO_VERTEX = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HALO_FRAGMENT = `
  varying vec3 vNormal;
  void main() {
    float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0,0.0,1.0))), 3.5);
    gl_FragColor = vec4(0.45, 0.08, 0.9, rim * 0.55);
  }
`;

const RING_VERTEX = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const RING_FRAGMENT = `
  varying vec2 vUv;
  void main() {
    float t = vUv.x;
    float gap = smoothstep(0.38, 0.42, t) * (1.0 - smoothstep(0.55, 0.58, t));
    vec3 col = mix(vec3(0.3,0.05,0.6), vec3(0.6,0.2,1.0), t);
    gl_FragColor = vec4(col, (0.25 + t * 0.2) * gap);
  }
`;

function createGlowSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(110,30,255,0.5)");
  gradient.addColorStop(0.4, "rgba(60,10,160,0.15)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function buildRingGeometry(): THREE.RingGeometry {
  const geo = new THREE.RingGeometry(19, 32, 80);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.sqrt(x * x + y * y);
    uv.setXY(i, (r - 19) / 13, 0);
  }
  return geo;
}

/** Distant shader planet + halo + ring + glow sprite, static at (3, -4, 150) — a landmark the camera falls past (fall.js:261-367). */
export function MysteryPlanet() {
  const sphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const sphereUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const glowTexture = useMemo(() => createGlowSpriteTexture(), []);
  const ringGeometry = useMemo(() => buildRingGeometry(), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    sphereUniforms.uTime.value = t;
    if (sphereRef.current) sphereRef.current.rotation.y = t * 0.04;
    if (ringRef.current) ringRef.current.rotation.z = t * 0.012;
  });

  return (
    <group position={[3, -4, 150]}>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[14, 64, 64]} />
        <shaderMaterial uniforms={sphereUniforms} vertexShader={SPHERE_VERTEX} fragmentShader={SPHERE_FRAGMENT} />
      </mesh>
      <mesh>
        <sphereGeometry args={[17, 32, 32]} />
        <shaderMaterial
          vertexShader={HALO_VERTEX}
          fragmentShader={HALO_FRAGMENT}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={ringRef} geometry={ringGeometry} rotation={[1.1, 0, 0]}>
        <shaderMaterial
          vertexShader={RING_VERTEX}
          fragmentShader={RING_FRAGMENT}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <sprite scale={[80, 80, 1]}>
        <spriteMaterial map={glowTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
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
git add web/components/experiences/fall/MysteryPlanet.tsx
git commit -m "feat(web): port fall MysteryPlanet component"
```

---

### Task 7: `GalaxyBand` component

**Files:**
- Create: `web/components/experiences/fall/GalaxyBand.tsx`

Ports the 3-layer particle band (core/spiral-arms/nebula) plus its central glow sprite (fall.js:370-476), following the camera in Z with a slow constant Y rotation.

- [ ] **Step 1: Write `web/components/experiences/fall/GalaxyBand.tsx`**

```tsx
// web/components/experiences/fall/GalaxyBand.tsx
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function makeBlobTexture(size: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.6)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function buildCoreLayer(blobSm: THREE.CanvasTexture) {
  const count = 7000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = Math.pow(Math.random(), 1.8) * 28;
    const a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
    pos[i * 3 + 2] = Math.sin(a) * r;
    const b = 0.8 + Math.random() * 0.2;
    col[i * 3] = b;
    col[i * 3 + 1] = b + 0.05;
    col[i * 3 + 2] = b + 0.1;
  }
  return { pos, col, blobSm };
}

function buildArmsLayer() {
  const count = 18000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 12 + Math.pow(Math.random(), 0.5) * 150;
    const arm = Math.floor(Math.random() * 3);
    const a = Math.random() * Math.PI * 2 + arm * ((Math.PI * 2) / 3) + r * 0.016;
    const sc = (Math.random() - 0.5) * r * 0.2;
    pos[i * 3] = Math.cos(a) * r + sc;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 2 * (1 - r / 165);
    pos[i * 3 + 2] = Math.sin(a) * r + sc;
    const t = Math.min(1, r / 150);
    const b = 0.5 + Math.random() * 0.5;
    col[i * 3] = b * (0.3 + t * 0.7);
    col[i * 3 + 1] = b * (0.2 + t * 0.15);
    col[i * 3 + 2] = b * (1.0 - t * 0.5);
  }
  return { pos, col };
}

function buildNebulaLayer() {
  const count = 1200;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 20 + Math.random() * 170;
    const a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r + (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
    pos[i * 3 + 2] = Math.sin(a) * r + (Math.random() - 0.5) * 40;
    const hue = Math.random();
    col[i * 3] = 0.65 + hue * 0.35;
    col[i * 3 + 1] = 0.05 + hue * 0.15;
    col[i * 3 + 2] = 0.85 - hue * 0.3;
  }
  return { pos, col };
}

interface GalaxyBandProps {
  cameraZRef: React.RefObject<number>;
}

/** 3-layer particle band (core/arms/nebula) + central glow sprite, following camera Z with slow rotation (fall.js:370-476). */
export function GalaxyBand({ cameraZRef }: GalaxyBandProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { blobSm, blobLg, core, arms, nebula } = useMemo(() => {
    const blobSm = makeBlobTexture(32);
    const blobLg = makeBlobTexture(128);
    return { blobSm, blobLg, core: buildCoreLayer(blobSm), arms: buildArmsLayer(), nebula: buildNebulaLayer() };
  }, []);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    group.position.z = cameraZRef.current;
    group.rotation.y += 0.0008;
  });

  return (
    <group ref={groupRef} position={[0, -28, 0]} rotation={[0.18, 0, 0]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[core.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[core.col, 3]} />
        </bufferGeometry>
        <pointsMaterial map={blobSm} size={1.5} vertexColors transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} alphaTest={0.01} />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[arms.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[arms.col, 3]} />
        </bufferGeometry>
        <pointsMaterial map={blobSm} size={1.2} vertexColors transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} alphaTest={0.01} />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nebula.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[nebula.col, 3]} />
        </bufferGeometry>
        <pointsMaterial map={blobLg} size={9} vertexColors transparent opacity={0.07} depthWrite={false} blending={THREE.AdditiveBlending} alphaTest={0.001} />
      </points>
      <sprite scale={[22, 22, 1]}>
        <spriteMaterial map={blobLg} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} color={new THREE.Color(0.85, 0.95, 1.0)} />
      </sprite>
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
git add web/components/experiences/fall/GalaxyBand.tsx
git commit -m "feat(web): port fall GalaxyBand component"
```

---

### Task 8: `UpperNebula` component

**Files:**
- Create: `web/components/experiences/fall/UpperNebula.tsx`

Ports the 12 fixed-position nebula sprites plus one "north star" sprite (fall.js:479-536), following the camera's Z position with a fixed +10 offset.

- [ ] **Step 1: Write `web/components/experiences/fall/UpperNebula.tsx`**

```tsx
// web/components/experiences/fall/UpperNebula.tsx
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function makeBlobTexture(size: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.4)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

interface NebulaConfig {
  x: number;
  y: number;
  z: number;
  s: number;
  col: [number, number, number];
  op: number;
  size: "med" | "lg";
}

const CONFIGS: NebulaConfig[] = [
  { x: -50, y: 18, z: -15, s: 75, col: [0.25, 0.08, 0.85], op: 0.28, size: "med" },
  { x: 45, y: 20, z: -20, s: 85, col: [0.08, 0.25, 0.95], op: 0.25, size: "med" },
  { x: -20, y: 15, z: -12, s: 65, col: [0.55, 0.08, 0.9], op: 0.22, size: "med" },
  { x: -70, y: 35, z: -40, s: 100, col: [0.15, 0.15, 0.85], op: 0.24, size: "med" },
  { x: 60, y: 38, z: -45, s: 110, col: [0.35, 0.05, 0.75], op: 0.21, size: "med" },
  { x: -5, y: 30, z: -38, s: 90, col: [0.7, 0.1, 0.8], op: 0.2, size: "med" },
  { x: 80, y: 32, z: -50, s: 95, col: [0.2, 0.1, 0.9], op: 0.19, size: "med" },
  { x: 0, y: 55, z: -70, s: 130, col: [0.2, 0.05, 0.8], op: 0.17, size: "lg" },
  { x: -80, y: 60, z: -75, s: 115, col: [0.5, 0.05, 0.85], op: 0.14, size: "lg" },
  { x: 65, y: 50, z: -65, s: 125, col: [0.1, 0.2, 0.9], op: 0.16, size: "lg" },
  { x: -35, y: 70, z: -85, s: 105, col: [0.6, 0.08, 0.75], op: 0.12, size: "lg" },
  { x: 45, y: 65, z: -80, s: 140, col: [0.3, 0.05, 0.9], op: 0.13, size: "lg" },
];

interface UpperNebulaProps {
  cameraZRef: React.RefObject<number>;
}

/** 12 fixed nebula sprites + a "north star" sprite, following camera Z + 10 (fall.js:479-536). */
export function UpperNebula({ cameraZRef }: UpperNebulaProps) {
  const groupRef = useRef<THREE.Group>(null);
  const texMed = useMemo(() => makeBlobTexture(128), []);
  const texLg = useMemo(() => makeBlobTexture(256), []);
  const texStar = useMemo(() => makeBlobTexture(64), []);

  useFrame(() => {
    if (groupRef.current) groupRef.current.position.z = cameraZRef.current + 10;
  });

  return (
    <group ref={groupRef}>
      {CONFIGS.map((cfg, i) => (
        <sprite key={i} position={[cfg.x, cfg.y, cfg.z]} scale={[cfg.s, cfg.s, 1]}>
          <spriteMaterial
            map={cfg.size === "med" ? texMed : texLg}
            transparent
            opacity={cfg.op}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            color={new THREE.Color(...cfg.col)}
          />
        </sprite>
      ))}
      <sprite position={[5, 90, -60]} scale={[10, 10, 1]}>
        <spriteMaterial map={texStar} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} color={new THREE.Color(0.85, 0.9, 1.0)} />
      </sprite>
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
git add web/components/experiences/fall/UpperNebula.tsx
git commit -m "feat(web): port fall UpperNebula component"
```

---

### Task 9: `Polaroid` factory and `PolaroidField` component

**Files:**
- Create: `web/components/experiences/fall/Polaroid.tsx`
- Create: `web/components/experiences/fall/PolaroidField.tsx`

The most complex task in this plan. `Polaroid.tsx` ports the per-photo group factory (frame + photo plane + glow sprite, fall.js:543-582). `PolaroidField.tsx` ports the entire infinite spawn/despawn system, the per-frame drift/proximity/fade/scale animation loop (fall.js:766-819 spawn logic, fall.js:993-1058 per-frame animation), the click-drag-to-zoom raycasting interaction (fall.js:884-924), and the burst-particle effect on close approach (fall.js:850-877). All of this is built imperatively with raw `THREE.Group` instances managed in a ref array and mutated directly inside `useFrame`, exactly mirroring the original's approach — this is not a place to introduce React state per polaroid.

- [ ] **Step 1: Write `web/components/experiences/fall/Polaroid.tsx`**

```tsx
// web/components/experiences/fall/Polaroid.tsx
"use client";

import * as THREE from "three";

export interface PolaroidUserData {
  driftX: number;
  driftY: number;
  rotSpeed: number;
  phase: number;
  targetScale?: number;
  targetPosition?: THREE.Vector3;
  burst?: boolean;
}

/** Builds one polaroid group: cream frame + photo plane + soft glow sprite (fall.js:543-582). */
export function createPolaroid(texture: THREE.Texture, colOffset: number, zPos: number): THREE.Group {
  const group = new THREE.Group();

  const imgAspect = (texture.image?.height || 1) / (texture.image?.width || 1);
  const photoW = 1.4;
  const photoH = photoW * imgAspect;
  const frameW = photoW + 0.28;
  const frameH = photoH + 0.14 + 0.5;

  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(frameW, frameH),
    new THREE.MeshBasicMaterial({ color: 0xf5f0e8, side: THREE.DoubleSide, depthWrite: false }),
  );
  frame.renderOrder = 0;
  group.add(frame);

  const photo = new THREE.Mesh(new THREE.PlaneGeometry(photoW, photoH), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  photo.position.set(0, 0.18, 0.001);
  photo.renderOrder = 1;
  group.add(photo);

  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 128;
  const glowCtx = glowCanvas.getContext("2d")!;
  const glowGradient = glowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  glowGradient.addColorStop(0, "rgba(200,160,255,0.35)");
  glowGradient.addColorStop(1, "rgba(0,0,0,0)");
  glowCtx.fillStyle = glowGradient;
  glowCtx.fillRect(0, 0, 128, 128);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  glow.scale.set(frameW * 2.2, frameH * 2.0, 1);
  glow.position.z = -0.1;
  group.add(glow);

  group.position.set(colOffset + (Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 10.0, zPos);
  group.rotation.set((Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.35);

  const userData: PolaroidUserData = {
    driftX: (Math.random() - 0.5) * 0.002,
    driftY: (Math.random() - 0.5) * 0.002,
    rotSpeed: (Math.random() - 0.5) * 0.0006,
    phase: Math.random() * Math.PI * 2,
  };
  group.userData = userData;

  return group;
}
```

- [ ] **Step 2: Write `web/components/experiences/fall/PolaroidField.tsx`**

```tsx
// web/components/experiences/fall/PolaroidField.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { computeColumnOffsets } from "@/lib/fall/columnLayout";
import { createPolaroid, type PolaroidUserData } from "./Polaroid";

const VISIBLE_ROWS = 6;
const ROW_DEPTH = 12;
const SPAWN_AHEAD = 50;

interface BurstState {
  points: THREE.Points;
  life: number;
  maxLife: number;
  velocities: { x: number; y: number; z: number }[];
}

interface PolaroidFieldProps {
  started: boolean;
  images: string[];
  captions: string[];
  cameraZRef: React.RefObject<number>;
  onFrozenChange: (frozen: boolean) => void;
}

function createBurstTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 16);
  return new THREE.CanvasTexture(canvas);
}

function buildCaptionSprite(text: string, zPos: number): THREE.Sprite {
  const FONT = "300 48px Georgia, serif";
  const MAX_W = 640;
  const PAD_X = 60;
  const LINE_H = 72;
  const PAD_Y = 40;

  const measureCtx = document.createElement("canvas").getContext("2d")!;
  measureCtx.font = FONT;
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (measureCtx.measureText(test).width > MAX_W && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const width = MAX_W + PAD_X * 2;
  const height = lines.length * LINE_H + PAD_Y * 2;
  const cx = width / 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    const y = PAD_Y + i * LINE_H + LINE_H / 2;
    ctx.shadowColor = "rgba(200,140,255,1.0)";
    ctx.shadowBlur = 40;
    ctx.fillStyle = "rgba(200,140,255,0.25)";
    ctx.fillText(line, cx, y);
    ctx.shadowColor = "rgba(255,200,255,0.9)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(line, cx, y);
  });

  const scaleX = 18;
  const scaleY = scaleX * (height / width);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }));
  sprite.scale.set(scaleX, scaleY, 1);
  sprite.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2, zPos);
  sprite.userData.pulsePhase = Math.random() * Math.PI * 2;
  return sprite;
}

/** Infinite polaroid spawn/despawn field with drift/fade/proximity animation, click-drag zoom, and burst particles (fall.js:543-1058 for the field-specific parts). `started` mirrors the same intro-dismissed flag `CameraFall` receives — the original only allows polaroid click interaction after the intro has been dismissed (fall.js:884: `if (!started) return;`, referring to the same global `started` flag as the camera). */
export function PolaroidField({ started, images, captions, cameraZRef, onFrozenChange }: PolaroidFieldProps) {
  const { scene, camera, gl, raycaster, pointer } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const polaroidsRef = useRef<THREE.Group[]>([]);
  const captionSpritesRef = useRef<THREE.Sprite[]>([]);
  const burstsRef = useRef<BurstState[]>([]);
  const nextRowZRef = useRef(-5);
  const rowCountRef = useRef(0);
  const clickedPolaroidRef = useRef<THREE.Group | null>(null);
  const draggingRef = useRef(false);
  const startedRef = useRef(started);
  const burstTexture = useMemo(() => createBurstTexture(), []);

  useEffect(() => {
    startedRef.current = started;
  }, [started]);

  const colOffsets = useMemo(() => computeColumnOffsets(images.length), [images.length]);

  const texturesRef = useRef<(THREE.Texture | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    Promise.all(
      images.map(
        (url) =>
          new Promise<THREE.Texture | null>((resolve) => {
            loader.load(
              url,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                resolve(tex);
              },
              undefined,
              () => resolve(null),
            );
          }),
      ),
    ).then((textures) => {
      if (cancelled) return;
      texturesRef.current = textures;
      spawnInitialRows();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  function spawnCaption(zPos: number) {
    if (!captions.length) return;
    const sprite = buildCaptionSprite(captions[rowCountRef.current % captions.length], zPos);
    scene.add(sprite);
    captionSpritesRef.current.push(sprite);
  }

  function spawnRow(zPos: number) {
    rowCountRef.current++;
    const textures = texturesRef.current;
    if (!textures.length) {
      nextRowZRef.current = zPos - ROW_DEPTH;
      return;
    }

    if (captions.length && rowCountRef.current % 5 === 0) {
      spawnCaption(zPos - ROW_DEPTH * 0.5);
    }

    for (let c = 0; c < colOffsets.length; c++) {
      const tex = textures[Math.floor(Math.random() * textures.length)];
      if (!tex) continue;
      const zOffset = (Math.random() - 0.5) * ROW_DEPTH * 0.8;
      const p = createPolaroid(tex, colOffsets[c], zPos + zOffset);
      scene.add(p);
      polaroidsRef.current.push(p);
    }

    const miniCount = 3 + Math.floor(Math.random() * 3);
    for (let m = 0; m < miniCount; m++) {
      const tex = textures[Math.floor(Math.random() * textures.length)];
      if (!tex) continue;
      const col = colOffsets[Math.floor(Math.random() * colOffsets.length)];
      const mini = createPolaroid(tex, col, zPos + (Math.random() - 0.5) * ROW_DEPTH * 0.6);
      if (m < 2) {
        const s = 0.18 + Math.random() * 0.14;
        mini.scale.set(s, s, s);
        mini.position.x += (Math.random() - 0.5) * 28;
        mini.position.y += 9 + Math.random() * 10;
      } else {
        const s = 0.35 + Math.random() * 0.3;
        mini.scale.set(s, s, s);
        mini.position.x += (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 10);
        mini.position.y += (Math.random() - 0.5) * 14;
      }
      scene.add(mini);
      polaroidsRef.current.push(mini);
    }

    const ambCount = 2 + Math.floor(Math.random() * 2);
    for (let a = 0; a < ambCount; a++) {
      const tex = textures[Math.floor(Math.random() * textures.length)];
      if (!tex) continue;
      const col = colOffsets[Math.floor(Math.random() * colOffsets.length)];
      const zOffset = -(8 + Math.random() * ROW_DEPTH * 2.5);
      const amb = createPolaroid(tex, col, zPos + zOffset);
      const s = 0.1 + Math.random() * 0.18;
      amb.scale.set(s, s, s);
      amb.position.x = (Math.random() - 0.5) * 40;
      amb.position.y = 12 + Math.random() * 22;
      scene.add(amb);
      polaroidsRef.current.push(amb);
    }

    nextRowZRef.current = zPos - ROW_DEPTH;
  }

  function spawnInitialRows() {
    for (let r = 0; r < VISIBLE_ROWS; r++) spawnRow(nextRowZRef.current);
  }

  function spawnBurst(position: THREE.Vector3) {
    const count = 24;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 2;
      colors[i * 3] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.4;
      colors[i * 3 + 2] = 1.0;
      velocities.push({ x: (Math.random() - 0.5) * 0.06, y: 0.04 + Math.random() * 0.04, z: (Math.random() - 0.5) * 0.04 });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: burstTexture,
      alphaTest: 0.01,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    burstsRef.current.push({ points, life: 0, maxLife: 60, velocities });
  }

  function handlePointerDown(clientX: number, clientY: number) {
    if (!startedRef.current) return;
    onFrozenChange(true);
    draggingRef.current = true;
    const rect = gl.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const meshes = polaroidsRef.current.flatMap((p) => p.children.filter((c) => (c as THREE.Mesh).isMesh));
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length) {
      const parent = polaroidsRef.current.find((p) => p.children.includes(hits[0].object));
      if (parent) {
        clickedPolaroidRef.current = parent;
        const userData = parent.userData as PolaroidUserData;
        userData.targetScale = 3.0;
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
        userData.targetPosition = camera.position.clone().addScaledVector(forward, 4);
      }
    }
  }

  function handlePointerUp() {
    onFrozenChange(false);
    draggingRef.current = false;
    const clicked = clickedPolaroidRef.current;
    if (clicked) {
      const userData = clicked.userData as PolaroidUserData;
      userData.targetScale = 1.0;
      delete userData.targetPosition;
      const side = Math.random() > 0.5 ? 1 : -1;
      userData.driftX = side * (0.06 + Math.random() * 0.04);
      userData.driftY = (Math.random() - 0.5) * 0.05;
      clickedPolaroidRef.current = null;
    }
  }

  useEffect(() => {
    const canvas = gl.domElement;
    const onMouseDown = (e: MouseEvent) => handlePointerDown(e.clientX, e.clientY);
    const onMouseUp = () => handlePointerUp();
    const onTouchStart = (e: TouchEvent) => handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd = () => handlePointerUp();
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const cameraZ = cameraZRef.current;

    if (texturesRef.current.length) {
      while (nextRowZRef.current > cameraZ - SPAWN_AHEAD) spawnRow(nextRowZRef.current);
    }

    const polaroids = polaroidsRef.current;
    for (let i = polaroids.length - 1; i >= 0; i--) {
      if (polaroids[i].position.z > cameraZ + 80) {
        scene.remove(polaroids[i]);
        polaroids.splice(i, 1);
      }
    }

    const captionSprites = captionSpritesRef.current;
    for (let i = captionSprites.length - 1; i >= 0; i--) {
      const s = captionSprites[i];
      if (s.position.z > cameraZ + 80) {
        scene.remove(s);
        captionSprites.splice(i, 1);
      } else {
        const distS = Math.abs(s.position.z - camera.position.z);
        const baseA = Math.max(0, Math.min(1, (70 - distS) / 20));
        (s.material as THREE.SpriteMaterial).opacity = baseA * (0.75 + 0.25 * Math.sin(t * 1.8 + s.userData.pulsePhase));
      }
    }

    const clickedPolaroid = clickedPolaroidRef.current;
    polaroids.forEach((p) => {
      const userData = p.userData as PolaroidUserData;
      const isSelected = clickedPolaroid === p;

      if (isSelected && userData.targetPosition) {
        p.position.lerp(userData.targetPosition, 0.06);
        p.rotation.x += (0 - p.rotation.x) * 0.08;
        p.rotation.y += (0 - p.rotation.y) * 0.08;
        p.rotation.z += (0 - p.rotation.z) * 0.08;
      } else {
        const zDist = Math.abs(p.position.z - camera.position.z);
        const dx = p.position.x - camera.position.x;
        const dy = p.position.y - camera.position.y;
        const lateralDist = Math.sqrt(dx * dx + dy * dy);
        if (zDist < 10 && lateralDist < 4) {
          const strength = ((4 - lateralDist) / 4) * 0.12;
          const nx = lateralDist > 0.05 ? dx / lateralDist : Math.random() > 0.5 ? 1 : -1;
          const ny = lateralDist > 0.05 ? dy / lateralDist : Math.random() - 0.5;
          userData.driftX += nx * strength;
          userData.driftY += ny * strength * 0.5;
          const mag = Math.sqrt(userData.driftX ** 2 + userData.driftY ** 2);
          if (mag > 0.12) {
            userData.driftX = (userData.driftX / mag) * 0.12;
            userData.driftY = (userData.driftY / mag) * 0.12;
          }
        } else {
          userData.driftX *= 0.97;
          userData.driftY *= 0.97;
        }

        p.position.x += userData.driftX;
        p.position.y += userData.driftY;
        p.rotation.z += userData.rotSpeed;
        p.position.y += Math.sin(t * 0.5 + userData.phase) * 0.0008;
        if (Math.abs(p.position.x) > 18) userData.driftX *= -1;
        if (Math.abs(p.position.y) > 12) userData.driftY *= -1;
      }

      const dist = Math.abs(p.position.z - camera.position.z);
      const alpha = Math.max(0, Math.min(1, (70 - dist) / 20));
      const targetScale = userData.targetScale ?? 1.0;
      p.scale.setScalar(p.scale.x + (targetScale - p.scale.x) * 0.06);

      p.children.forEach((child) => {
        const material = (child as THREE.Mesh | THREE.Sprite).material as THREE.Material & { opacity?: number };
        if (!material) return;
        if ((child as THREE.Sprite).isSprite) {
          material.opacity = isSelected ? 0 : alpha * 0.85;
        } else if (material.opacity !== undefined) {
          material.opacity = isSelected ? 1 : alpha;
        }
      });

      if (dist < 4 && !userData.burst) {
        userData.burst = true;
        spawnBurst(p.position.clone());
      }
      if (dist > 20) userData.burst = false;
    });

    const bursts = burstsRef.current;
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life++;
      (b.points.material as THREE.PointsMaterial).opacity = 1 - b.life / b.maxLife;
      const posAttr = b.points.geometry.getAttribute("position");
      for (let j = 0; j < posAttr.count; j++) {
        posAttr.setX(j, posAttr.getX(j) + b.velocities[j].x);
        posAttr.setY(j, posAttr.getY(j) + b.velocities[j].y);
        posAttr.setZ(j, posAttr.getZ(j) + b.velocities[j].z);
      }
      posAttr.needsUpdate = true;
      if (b.life >= b.maxLife) {
        scene.remove(b.points);
        bursts.splice(i, 1);
      }
    }
  });

  return <group ref={groupRef} />;
}
```

- [ ] **Step 3: Confirm both type-check cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add web/components/experiences/fall/Polaroid.tsx web/components/experiences/fall/PolaroidField.tsx
git commit -m "feat(web): port fall Polaroid factory and PolaroidField spawn/interaction system"
```

---

### Task 10: `CameraFall` and `FreezeOverlay` components

**Files:**
- Create: `web/components/experiences/fall/CameraFall.tsx`
- Create: `web/components/experiences/fall/FreezeOverlay.module.css`
- Create: `web/components/experiences/fall/FreezeOverlay.tsx`

`CameraFall` ports the camera fall-speed acceleration, scroll-to-boost, and drag-to-look-around logic (fall.js:585-613, 878-882, 936-963). `FreezeOverlay` ports the "Ngưng Đọng Thời Gian" text shown while a polaroid is held (fall.js:927-930, 938), per Fidelity decision #4 (React-rendered instead of manual DOM injection).

- [ ] **Step 1: Write `web/components/experiences/fall/CameraFall.tsx`**

```tsx
// web/components/experiences/fall/CameraFall.tsx
"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

const TARGET_SPEED = 0.06;
const ACCEL = 0.0004;
const BOOST = 1.0;
const BOOST_DECAY = 0.02;
const LOOK_SENS_X = 0.004;
const LOOK_SENS_Y = 0.003;

interface CameraFallProps {
  started: boolean;
  frozen: boolean;
  cameraZRef: React.RefObject<number>;
}

/** Camera fall-speed acceleration, scroll-to-boost, and drag-to-look-around (fall.js:585-613, 878-882, 936-963). */
export function CameraFall({ started, frozen, cameraZRef }: CameraFallProps) {
  const { camera, gl } = useThree();
  const fallSpeedRef = useRef(0);
  const boostSpeedRef = useRef(0);
  const lookXRef = useRef(0);
  const lookYRef = useRef(0);
  const lastPXRef = useRef(0);
  const lastPYRef = useRef(0);
  const draggingRef = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;

    const onMouseMove = (e: MouseEvent) => {
      if (!started || !draggingRef.current) return;
      lookXRef.current += (e.clientX - lastPXRef.current) * LOOK_SENS_X;
      lookYRef.current += (e.clientY - lastPYRef.current) * LOOK_SENS_Y;
      lastPXRef.current = e.clientX;
      lastPYRef.current = e.clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!started) return;
      const t = e.touches[0];
      lookXRef.current += (t.clientX - lastPXRef.current) * LOOK_SENS_X;
      lookYRef.current += (t.clientY - lastPYRef.current) * LOOK_SENS_Y;
      lastPXRef.current = t.clientX;
      lastPYRef.current = t.clientY;
    };
    const onMouseDown = (e: MouseEvent) => {
      draggingRef.current = true;
      lastPXRef.current = e.clientX;
      lastPYRef.current = e.clientY;
    };
    const onMouseUp = () => {
      draggingRef.current = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (!started) return;
      if (e.deltaY > 0) boostSpeedRef.current = BOOST;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [gl, started]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (started) {
      if (!frozen) {
        if (fallSpeedRef.current < TARGET_SPEED) fallSpeedRef.current += ACCEL;
        if (boostSpeedRef.current > 0) boostSpeedRef.current = Math.max(0, boostSpeedRef.current - BOOST_DECAY);
        cameraZRef.current -= fallSpeedRef.current + boostSpeedRef.current;
      }

      camera.position.z = cameraZRef.current;

      if (!frozen) {
        camera.position.x += (0 - camera.position.x) * 0.02;
        camera.position.y += (0 - camera.position.y) * 0.02;
      }

      camera.rotation.y += (-lookXRef.current - camera.rotation.y) * 0.18;
      camera.rotation.x += (-lookYRef.current - camera.rotation.x) * 0.18;
    } else {
      camera.position.y = Math.sin(t * 0.3) * 0.3;
      camera.rotation.x = Math.sin(t * 0.2) * 0.02;
    }
  });

  return null;
}
```

- [ ] **Step 2: Write `web/components/experiences/fall/FreezeOverlay.module.css`**

```css
/* web/components/experiences/fall/FreezeOverlay.module.css */
.freezeOverlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s;
  font-family: Georgia, serif;
  text-shadow: 0 0 20px rgba(180, 120, 255, 0.8);
}
.freezeOverlay.visible {
  opacity: 1;
}
```

- [ ] **Step 3: Write `web/components/experiences/fall/FreezeOverlay.tsx`**

```tsx
// web/components/experiences/fall/FreezeOverlay.tsx
"use client";

import clsx from "clsx";
import styles from "./FreezeOverlay.module.css";

interface FreezeOverlayProps {
  frozen: boolean;
}

/** "Ngưng Đọng Thời Gian" text shown while a polaroid is held (fall.js:927-930, 938). React-rendered instead of the original's manual DOM injection — see plan Fidelity decision #4. */
export function FreezeOverlay({ frozen }: FreezeOverlayProps) {
  return <div className={clsx(styles.freezeOverlay, frozen && styles.visible)}>✦ Ngưng Đọng Thời Gian ✦</div>;
}
```

- [ ] **Step 4: Confirm everything type-checks cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add web/components/experiences/fall/CameraFall.tsx web/components/experiences/fall/FreezeOverlay.tsx web/components/experiences/fall/FreezeOverlay.module.css
git commit -m "feat(web): port fall CameraFall and FreezeOverlay components"
```

---

### Task 11: `FallExperience` top-level composition (replaces the stub)

**Files:**
- Modify: `web/components/experiences/FallExperience.tsx` (replaces the Foundation plan's stub entirely)
- Create: `web/components/experiences/fall/FallExperience.module.css`

Wires every component from Tasks 2-10 into one `<Canvas>`, the intro overlay + click-to-start (fall.js:615-628), theme wiring including the Fidelity decision #1 fix (fall.js:637-668), and the shared `LandscapeWarning`/`AudioToggleButton`.

- [ ] **Step 1: Write `web/components/experiences/fall/FallExperience.module.css`**

```css
/* web/components/experiences/fall/FallExperience.module.css */
.root {
  position: fixed;
  inset: 0;
  background: #000005;
}

.canvasWrapper {
  position: fixed;
  inset: 0;
}

.intro {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: radial-gradient(ellipse at center, #0a0a1f 0%, #000000 100%);
  color: #fff;
  font-family: Georgia, serif;
  transition: opacity 0.6s ease;
}
.intro.hidden {
  opacity: 0;
  pointer-events: none;
  display: none;
}
.introTitle {
  font-size: clamp(24px, 5vw, 44px);
  font-weight: 300;
  letter-spacing: 0.08em;
  margin-bottom: 24px;
}
.introHint {
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  font-family: sans-serif;
}
```

- [ ] **Step 2: Replace `web/components/experiences/FallExperience.tsx`**

```tsx
// web/components/experiences/FallExperience.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import clsx from "clsx";
import { useGalaxyView } from "@/lib/hooks/useGalaxyView";
import { useMusicManager } from "@/lib/hooks/useMusicManager";
import { AudioToggleButton } from "@/components/AudioToggleButton";
import { LandscapeWarning } from "@/components/LandscapeWarning";
import { StarfieldAndDust } from "./fall/StarfieldAndDust";
import { Sparkles } from "./fall/Sparkles";
import { ShootingStars } from "./fall/ShootingStars";
import { Aurora, type AuroraHandle } from "./fall/Aurora";
import { MysteryPlanet } from "./fall/MysteryPlanet";
import { GalaxyBand } from "./fall/GalaxyBand";
import { UpperNebula } from "./fall/UpperNebula";
import { PolaroidField } from "./fall/PolaroidField";
import { CameraFall } from "./fall/CameraFall";
import { FreezeOverlay } from "./fall/FreezeOverlay";
import styles from "./fall/FallExperience.module.css";

interface FallExperienceProps {
  galaxyId: string;
}

interface SceneProps {
  started: boolean;
  frozen: boolean;
  images: string[];
  captions: string[];
  cameraZRef: React.RefObject<number>;
  auroraRef: React.RefObject<AuroraHandle | null>;
  sparklesRef: React.RefObject<THREE.Points | null>;
  onFrozenChange: (frozen: boolean) => void;
}

function Scene({ started, frozen, images, captions, cameraZRef, auroraRef, sparklesRef, onFrozenChange }: SceneProps) {
  return (
    <>
      <StarfieldAndDust cameraZRef={cameraZRef} />
      <Sparkles ref={sparklesRef} cameraZRef={cameraZRef} />
      <ShootingStars cameraZRef={cameraZRef} />
      <Aurora ref={auroraRef} cameraZRef={cameraZRef} />
      <MysteryPlanet />
      <GalaxyBand cameraZRef={cameraZRef} />
      <UpperNebula cameraZRef={cameraZRef} />
      <PolaroidField started={started} images={images} captions={captions} cameraZRef={cameraZRef} onFrozenChange={onFrozenChange} />
      <CameraFall started={started} frozen={frozen} cameraZRef={cameraZRef} />
    </>
  );
}

export function FallExperience({ galaxyId }: FallExperienceProps) {
  const { view, images, captions, music, theme, name } = useGalaxyView(galaxyId);
  const musicManager = useMusicManager(music);
  const [started, setStarted] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const cameraZRef = useRef(0);
  const auroraRef = useRef<AuroraHandle | null>(null);
  const sparklesRef = useRef<THREE.Points>(null);

  const backgroundColor = useMemo(() => (theme?.background ? new THREE.Color(theme.background) : new THREE.Color(0x000005)), [theme?.background]);

  // Fidelity decision #1: read theme.primary/secondary directly (the original's `.colors.primary` double-access
  // is a bug that always fell back to defaults; this fixes it so configured theme colors actually apply).
  useEffect(() => {
    if (!theme) return;
    const primary = new THREE.Color(theme.primary || "#00e699");
    const secondary = new THREE.Color(theme.secondary || "#8019e5");

    if (auroraRef.current) {
      auroraRef.current.uniforms.uColor1.value.copy(primary);
      auroraRef.current.uniforms.uColor2.value.copy(secondary);
    }

    const palette: [number, number, number][] = [
      [primary.r, primary.g, primary.b],
      [secondary.r, secondary.g, secondary.b],
      [1, 1, 1],
      [Math.min(1, primary.r * 1.4), Math.min(1, primary.g * 1.4), Math.min(1, primary.b * 1.4)],
      [Math.min(1, secondary.r * 1.4), Math.min(1, secondary.g * 1.4), Math.min(1, secondary.b * 1.4)],
    ];
    const sparkleColorAttr = sparklesRef.current?.geometry.getAttribute("color");
    if (sparkleColorAttr) {
      for (let i = 0; i < sparkleColorAttr.count; i++) {
        const c = palette[i % palette.length];
        sparkleColorAttr.setXYZ(i, c[0], c[1], c[2]);
      }
      sparkleColorAttr.needsUpdate = true;
    }
  }, [theme]);

  useEffect(() => {
    if (name) document.title = `${name} — Lumora`;
  }, [name]);

  const handleStart = useCallback(() => {
    setStarted(true);
    musicManager.play();
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, [musicManager]);

  return (
    <div className={styles.root}>
      <LandscapeWarning />
      <div className={clsx(styles.intro, started && styles.hidden)} onClick={handleStart}>
        <div className={styles.introTitle}>{view?.name || "Lumora"}</div>
        <div className={styles.introHint}>Chạm để bắt đầu</div>
      </div>
      <div className={styles.canvasWrapper}>
        <Canvas camera={{ fov: 70, near: 0.1, far: 2000, position: [0, 0, 0] }} gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace }}>
          <color attach="background" args={[backgroundColor]} />
          <fogExp2 attach="fog" args={[backgroundColor.getHex(), 0.006]} />
          <Scene
            started={started}
            frozen={frozen}
            images={images}
            captions={captions}
            cameraZRef={cameraZRef}
            auroraRef={auroraRef}
            sparklesRef={sparklesRef}
            onFrozenChange={setFrozen}
          />
        </Canvas>
      </div>
      <FreezeOverlay frozen={frozen} />
      <AudioToggleButton isPlaying={musicManager.isPlaying} hasTrack={musicManager.hasTrack} onToggle={musicManager.toggle} />
    </div>
  );
}
```

- [ ] **Step 3: Confirm it type-checks cleanly and lints cleanly**

```bash
cd web && npx tsc --noEmit && npx eslint components/experiences/FallExperience.tsx components/experiences/fall
```

- [ ] **Step 4: Run the full test suite to confirm no regressions**

```bash
cd web && npm test
```

- [ ] **Step 5: Commit**

```bash
git add web/components/experiences/FallExperience.tsx web/components/experiences/fall/FallExperience.module.css
git commit -m "feat(web): replace FallExperience stub with full react-three-fiber port"
```

---

### Task 12: End-to-end manual verification

No new files — confirms Tasks 1-11 work together against real data, following the same approach as the Foundation and GalaxyMoonExperience plans' final verification tasks.

- [ ] **Step 1: Start both servers** against real or seeded data, including a galaxy with `template: "fall"`, multiple gallery photos, a caption array, and a custom theme with distinct `primary`/`secondary`/`background` colors (to verify the Fidelity decision #1 fix).

- [ ] **Step 2: Visually verify against the original** by opening the OLD experience at `http://localhost:3030/fall/?galaxyId=<id>` (Express, unchanged) and the NEW one at `http://localhost:3000/view/?galaxyId=<id>` (Next.js, for a galaxy whose `template` is `"fall"`) side by side. Confirm: starfield/dust/sparkles background, aurora ribbon color now visibly matches the galaxy's theme (this SHOULD differ visually from the old broken version — confirm it's the theme's actual configured colors, not the hardcoded green/purple defaults, when a custom theme is set), mystery planet visible in the distance as the camera falls past it, galaxy band + upper nebula scroll correctly, polaroids spawn continuously and drift/fade with distance, clicking-and-holding a polaroid zooms it toward camera and shows the "Ngưng Đọng Thời Gian" freeze text, releasing sends it drifting away, scrolling down boosts fall speed, dragging looks around.

- [ ] **Step 3: Verify no console errors** and no runaway growth in scene object count over a multi-minute session (polaroids/captions/bursts should be continuously spawned AND removed, not just accumulate — check `renderer.info.memory` in devtools periodically).

- [ ] **Step 4: Run the full test suite and production build**

```bash
cd web && npm test && npm run build
```

Expected: all Vitest tests pass, `next build` completes with no type errors.

No commit for this task — verification only. If any step reveals a bug, fix it in a new commit against the relevant task's files (do not amend past commits), same discipline as the earlier plans.
