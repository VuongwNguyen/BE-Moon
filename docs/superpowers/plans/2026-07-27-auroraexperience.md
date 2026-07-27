# AuroraExperience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full react-three-fiber port of `public/aurora/js/aurora.js` — the smallest and simplest of the three Three.js experiences (365 lines): an endless fall through an aurora-lit sky dome over an icy ground, with drifting photo panels the user can tap to open in a lightbox.

**Architecture:** Same approach as the GalaxyMoonExperience and FallExperience plans: one `<Canvas>` composed of focused R3F components under `web/components/experiences/aurora/`, driven by `useGalaxyView` + shared `useMusicManager`/`LandscapeWarning`/`AudioToggleButton`. Unlike those two plans, there is no existing stub to replace — per the Foundation plan's design spec, Aurora was never wired into `/view/page.tsx`'s template-selection logic (it's reachable directly today, not through the template picker), so this plan adds a brand-new `AuroraExperience` component plus a standalone dev-only route (`web/app/aurora/page.tsx`) for manual testing, and does **not** touch `/view/page.tsx`.

**Tech Stack:** `three`, `@react-three/fiber`, `@react-three/drei` (already added to `web/package.json` by the GalaxyMoonExperience plan's Task 1). TypeScript, CSS Modules for the 2D intro/lightbox chrome. Vitest for the one piece of pure, testable logic (photo-slot selection).

**Source of truth this plan ports from (unchanged, still at the repo root during this phase):**
- `public/aurora/js/aurora.js` (365 lines — the file this plan replaces)
- `public/aurora/index.html` (DOM structure/CSS for `#intro`, `#btn-audio`, `#lightbox`, `#landscape-warning`, inline `window.musicManager`)

## Fidelity notes (read before starting any task)

Unlike the FallExperience plan, this source file has **no theme-color bug** — `aurora.js:351` correctly reads `data.theme.primary`/`data.theme.secondary` directly (matching the shape `fetchData()` already returns at line 15: `theme: view.theme?.colors || null`), unlike `fall.js`'s incorrect double `.colors` access. No fix needed here; port the theme-tinting logic as-is.

Two behavioral details that are easy to get wrong when porting — preserve both exactly:

1. **No idle/pre-intro camera animation.** Unlike `fall.js` (which gently bobs the camera before the intro is dismissed), `aurora.js`'s `animate()` only moves the camera inside `if (started) { ... }` (aurora.js:306-316) — before that, the camera simply stays at its initial static pose (`position (0, 3, 0)`, `rotation.x = 0.55`). Everything else (dome/ground uniform updates, panel spawning, panel bob animation, rendering) runs unconditionally every frame regardless of `started` (aurora.js:318-342) — so photo panels spawn and bob immediately on load, even before the user taps to begin. Do not add an idle-bob branch that doesn't exist in the source.
2. **Look-around is absolute-from-drag-start, not incremental.** `fall.js`'s `CameraFall` accumulates `lookX`/`lookY` by adding each frame's pointer *delta* from the previous frame. `aurora.js`'s `pointerMove` (aurora.js:278) instead *sets* `lookX`/`lookY` directly from the total distance since the mousedown/touchstart point (`lookX = (cx - dsx) * 0.0006`), and both values decay by a `*= 0.90` multiplier every animation frame (aurora.js:315) rather than being reset on pointer-up. This is a different feel from Fall's look-around — port the exact formula, don't reuse or generalize Fall's `CameraFall` component.

3. **Bug — real, severe, being fixed: the real camera never physically moves.** Verified directly against the source (`grep -n "camera.position" public/aurora/js/aurora.js` returns only line 27, the one-time initial `camera.position.set(0, 3.0, 0)`). `animate()` computes `cameraZ -= fallSpd+boost` (aurora.js:309) and uses that variable to position the dome (aurora.js:319), scroll the ground (aurora.js:323), and decide when to spawn/remove photo panels (aurora.js:327, 334, 339) — but **nothing ever assigns `camera.position.z = cameraZ`**, unlike `fall.js`'s equivalent loop, which explicitly does exactly that (`fall.js`'s `camera.position.z = cameraZ;`) with the same variable names and nearly identical formulas. Tracing the consequence: the real, fixed camera at `z=0` never advances, while photo panels keep spawning at ever-more-negative literal world Z coordinates and get removed once `p.position.z > cameraZ + 22` — a comparison against the *virtual* scroll variable, not the camera's real (unmoving) position. In practice this means panels near the original spawn point get culled once the virtual `cameraZ` has scrolled far enough past them, while newly spawned panels appear only at increasingly extreme negative Z — so after enough time, the scene the *real, stationary* camera can actually see would run out of panels entirely, and the "falling" sensation the dome/ground animation clearly implies never actually happens. This reads as an accidental omission (aurora.js's fall-camera variables are named identically to `fall.js`'s and follow the same structure, strongly suggesting the `camera.position.z = cameraZ` line was meant to be there and was dropped), not an intentional design choice. **Fix: `CameraAurora` sets the real camera's `position.z` to the tracked `cameraZRef.current` value every frame**, matching `fall.js`'s working pattern and making the dome/ground/photo-panel systems (which already correctly reference `cameraZRef`) actually line up with what the camera can see.

## File Structure

```
web/lib/aurora/
  photoSlots.ts              — selectPhotoSlots(cols, textureCount) pure function + test
web/app/aurora/
  page.tsx                   — standalone dev-only test route (NOT wired into /view)
web/components/experiences/
  AuroraExperience.tsx       — NEW component (no stub to replace). Canvas shell, intro overlay, click-to-start, shared hooks/components
  aurora/
    SkyDome.tsx               — theme-tinted aurora sky dome shader
    Ground.tsx                — icy ground shader plane + horizon glow sprite
    PhotoFrame.tsx            — single photo panel factory (frame + photo + aurora-gradient border + glow)
    PhotoField.tsx            — spawn/despawn, bob animation, tap-to-open-lightbox raycast interaction
    Lightbox.tsx              — 2D DOM overlay showing the tapped photo full-size
    CameraAurora.tsx          — camera fall-speed + absolute-drag look-around driver
```

---

### Task 1: Confirm dependencies and add pure photo-slot helper

**Files:**
- Create: `web/lib/aurora/photoSlots.ts`
- Test: `web/lib/aurora/photoSlots.test.ts`

`selectPhotoSlots` ports the column-slot selection from aurora.js:239-241: with 3 fixed column positions, only the center column is used for a single photo, the two outer columns for exactly two photos, and all three for three or more.

- [ ] **Step 1: Confirm R3F dependencies are present, install only if missing**

```bash
cd web && node -e "require('three'); require('@react-three/fiber'); require('@react-three/drei'); console.log('already installed')" || npm install three @react-three/fiber @react-three/drei
```

- [ ] **Step 2: Write the failing test**

```ts
// web/lib/aurora/photoSlots.test.ts
import { describe, it, expect } from "vitest";
import { selectPhotoSlots } from "./photoSlots";

const cols = ["left", "center", "right"] as const;

describe("selectPhotoSlots", () => {
  it("uses only the center column for exactly one texture", () => {
    expect(selectPhotoSlots(cols, 1)).toEqual(["center"]);
  });

  it("uses only the outer columns for exactly two textures", () => {
    expect(selectPhotoSlots(cols, 2)).toEqual(["left", "right"]);
  });

  it("uses all three columns for three or more textures", () => {
    expect(selectPhotoSlots(cols, 3)).toEqual(["left", "center", "right"]);
    expect(selectPhotoSlots(cols, 10)).toEqual(["left", "center", "right"]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd web && npx vitest run lib/aurora/photoSlots.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 4: Write `web/lib/aurora/photoSlots.ts`**

```ts
// web/lib/aurora/photoSlots.ts

/** Which of the 3 fixed column slots to use, based on how many photo textures are available (aurora.js:239-241). */
export function selectPhotoSlots<T>(cols: readonly [T, T, T], textureCount: number): T[] {
  if (textureCount === 1) return [cols[1]];
  if (textureCount === 2) return [cols[0], cols[2]];
  return [cols[0], cols[1], cols[2]];
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd web && npx vitest run lib/aurora/photoSlots.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add web/package.json web/package-lock.json web/lib/aurora/photoSlots.ts web/lib/aurora/photoSlots.test.ts
git commit -m "feat(web): confirm r3f deps and add aurora photo-slot selection helper"
```

---

### Task 2: `SkyDome` and `Ground` components

**Files:**
- Create: `web/components/experiences/aurora/SkyDome.tsx`
- Create: `web/components/experiences/aurora/Ground.tsx`

`SkyDome` ports the aurora sky shader (aurora.js:37-105), exposing its `uC1`/`uC2` color uniforms via `useImperativeHandle` so the top-level component can tint them from the galaxy's theme colors (aurora.js:350-353). `Ground` ports the icy ground shader plane plus the horizon glow sprite (aurora.js:107-147).

- [ ] **Step 1: Write `web/components/experiences/aurora/SkyDome.tsx`**

```tsx
// web/components/experiences/aurora/SkyDome.tsx
"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const DOME_VERTEX = `
  varying vec3 vN;
  void main(){
    vN = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DOME_FRAGMENT = `
  uniform float uTime;
  uniform vec3  uC1;
  uniform vec3  uC2;
  uniform vec3  uC3;
  varying vec3  vN;

  void main(){
    float elev = vN.y;

    vec3 sky = mix(vec3(0.004,0.018,0.055), vec3(0.001,0.006,0.022), clamp(elev,0.0,1.0));

    float bandCenter = 0.22 + sin(uTime*0.08)*0.04;
    float bandShape  = exp(-pow((elev - bandCenter)/0.38, 2.0));

    float sh1 = sin(vN.x*6.0 + uTime*0.45)*0.5+0.5;
    float sh2 = cos(vN.z*8.0 - uTime*0.30)*0.5+0.5;
    float sh3 = sin(vN.x*3.0 + vN.z*4.0 + uTime*0.20)*0.5+0.5;
    float shimmer = sh1*0.4 + sh2*0.35 + sh3*0.25;

    float ray = pow(max(0.0, sin(vN.x*18.0 + uTime*0.12)*0.5+0.5), 2.0);

    float intensity = bandShape * shimmer * (0.8 + ray*0.5) * 4.5;

    float ct = clamp(vN.x*0.5+0.5 + sin(uTime*0.18)*0.1, 0.0, 1.0);
    vec3 aCol = ct < 0.5 ? mix(uC1, uC2, ct*2.0) : mix(uC2, uC3, (ct-0.5)*2.0);

    float band2 = exp(-pow((elev-(bandCenter+0.20))/0.12, 2.0));
    vec3 aurora2 = vec3(0.5,0.0,1.0) * band2 * (sin(vN.z*6.0+uTime*0.25)*0.5+0.5) * 3.0;

    float sx = fract(vN.x*47.3 + vN.z*31.7 + 0.5);
    float sy = fract(vN.y*63.1 + vN.x*19.4 + 0.3);
    float star = step(0.97, sx) * step(0.97, sy) * max(0.0, elev*2.0);

    float fade = smoothstep(0.0, 0.08, elev);
    vec3 col = sky + aCol*intensity*fade + aurora2*fade + vec3(star*0.8);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export interface SkyDomeHandle {
  uniforms: { uC1: { value: THREE.Color }; uC2: { value: THREE.Color } };
}

interface SkyDomeProps {
  cameraPositionRef: React.RefObject<THREE.Vector3>;
  cameraZRef: React.RefObject<number>;
}

/** Aurora-lit sky dome shader, always re-centered on the camera (aurora.js:37-105, 318-320). Exposes uC1/uC2 via ref for theme tinting. */
export const SkyDome = forwardRef<SkyDomeHandle, SkyDomeProps>(function SkyDome({ cameraPositionRef, cameraZRef }, ref) {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uC1: { value: new THREE.Color(0x00ff55) },
      uC2: { value: new THREE.Color(0x00ddff) },
      uC3: { value: new THREE.Color(0x8800ff) },
    }),
    [],
  );

  useImperativeHandle(ref, () => ({ uniforms }), [uniforms]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.set(cameraPositionRef.current.x, cameraPositionRef.current.y, cameraZRef.current);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1200, 64, 32]} />
      <shaderMaterial uniforms={uniforms} vertexShader={DOME_VERTEX} fragmentShader={DOME_FRAGMENT} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
});
```

- [ ] **Step 2: Write `web/components/experiences/aurora/Ground.tsx`**

```tsx
// web/components/experiences/aurora/Ground.tsx
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const GROUND_VERTEX = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

const GROUND_FRAGMENT = `
  uniform float uTime; varying vec2 vUv;
  float hash(float n){ return fract(sin(n)*43758.5); }
  void main(){
    vec3 base = vec3(0.008,0.030,0.055);
    float r1 = sin(vUv.x*4.0+uTime*0.3)*0.5+0.5;
    float r2 = cos(vUv.x*7.0-uTime*0.2)*0.5+0.5;
    vec3 reflect = vec3(0.0, r1*0.12+r2*0.05, r2*0.18+r1*0.08);
    float near = vUv.y;
    float grain = hash(vUv.x*512.0+vUv.y*512.0)*0.04;
    gl_FragColor = vec4(base + reflect*(near*0.6+0.2) + grain*0.02, 1.0);
  }
`;

function createHorizonGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 64);
  gradient.addColorStop(0, "rgba(0,80,60,0)");
  gradient.addColorStop(0.5, "rgba(0,120,80,0.35)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 64);
  return new THREE.CanvasTexture(canvas);
}

interface GroundProps {
  cameraZRef: React.RefObject<number>;
}

/** Icy ground shader plane + horizon glow sprite, following camera Z (aurora.js:107-147, 322-324). */
export function Ground({ cameraZRef }: GroundProps) {
  const groundRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const glowTexture = useMemo(() => createHorizonGlowTexture(), []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
    if (groundRef.current) groundRef.current.position.z = cameraZRef.current;
  });

  return (
    <>
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
        <planeGeometry args={[1200, 600, 1, 1]} />
        <shaderMaterial uniforms={uniforms} vertexShader={GROUND_VERTEX} fragmentShader={GROUND_FRAGMENT} />
      </mesh>
      <sprite position={[0, -0.5, -200]} scale={[1200, 18, 1]}>
        <spriteMaterial map={glowTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </>
  );
}
```

- [ ] **Step 3: Confirm both type-check cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add web/components/experiences/aurora/SkyDome.tsx web/components/experiences/aurora/Ground.tsx
git commit -m "feat(web): port aurora SkyDome and Ground components"
```

---

### Task 3: `PhotoFrame` factory and `PhotoField` component

**Files:**
- Create: `web/components/experiences/aurora/PhotoFrame.tsx`
- Create: `web/components/experiences/aurora/PhotoField.tsx`

`PhotoFrame.tsx` ports the per-photo group factory (dark mat backing + photo plane + aurora-gradient border + wide glow, aurora.js:150-202). `PhotoField.tsx` ports the spawn/despawn loop, bob animation, and tap-to-open-lightbox raycast interaction (aurora.js:227-291, 326-340). Like `PolaroidField` in the FallExperience plan, this is built imperatively with a ref array mutated inside `useFrame` — no per-photo React state.

- [ ] **Step 1: Write `web/components/experiences/aurora/PhotoFrame.tsx`**

```tsx
// web/components/experiences/aurora/PhotoFrame.tsx
"use client";

import * as THREE from "three";

export interface PhotoFrameUserData {
  imgSrc: string;
  imgMesh: THREE.Mesh;
  phase: number;
  bobSpeed: number;
  bx: number;
  by: number;
}

/** Builds one photo panel: dark backing + photo + aurora-gradient border (edge glow only) + wide diffuse glow (aurora.js:150-202). */
export function createPhotoFrame(texture: THREE.Texture, imgSrc: string): THREE.Group {
  const aspect = texture.image.height / texture.image.width;
  const frameW = 13.0;
  const frameH = frameW * Math.min(Math.max(aspect, 0.55), 1.6);
  const group = new THREE.Group();

  const backing = new THREE.Mesh(new THREE.PlaneGeometry(frameW + 0.3, frameH + 0.3), new THREE.MeshBasicMaterial({ color: 0x030c16 }));
  backing.position.z = -0.02;
  group.add(backing);

  const photo = new THREE.Mesh(new THREE.PlaneGeometry(frameW, frameH), new THREE.MeshBasicMaterial({ map: texture }));
  group.add(photo);

  const borderCanvas = document.createElement("canvas");
  borderCanvas.width = borderCanvas.height = 256;
  const borderCtx = borderCanvas.getContext("2d")!;
  const borderGradient = borderCtx.createLinearGradient(0, 0, 256, 256);
  borderGradient.addColorStop(0, "rgba(0,255,140,1)");
  borderGradient.addColorStop(0.5, "rgba(0,200,255,1)");
  borderGradient.addColorStop(1, "rgba(160,0,255,1)");
  borderCtx.fillStyle = borderGradient;
  borderCtx.shadowColor = "#00ffcc";
  borderCtx.shadowBlur = 20;
  borderCtx.fillRect(0, 0, 256, 256);
  borderCtx.clearRect(18, 18, 220, 220);
  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(frameW + 0.22, frameH + 0.22),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(borderCanvas), transparent: true, depthWrite: false }),
  );
  border.position.z = -0.01;
  group.add(border);

  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 256;
  const glowCtx = glowCanvas.getContext("2d")!;
  const glowGradient = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
  glowGradient.addColorStop(0, "rgba(0,255,160,0.22)");
  glowGradient.addColorStop(0.5, "rgba(0,160,255,0.12)");
  glowGradient.addColorStop(1, "rgba(0,0,0,0)");
  glowCtx.fillStyle = glowGradient;
  glowCtx.fillRect(0, 0, 256, 256);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  glow.scale.set(frameW * 3.8, frameH * 3.8, 1);
  glow.position.z = -0.05;
  group.add(glow);

  const userData: PhotoFrameUserData = {
    imgSrc,
    imgMesh: photo,
    phase: Math.random() * Math.PI * 2,
    bobSpeed: 0.28 + Math.random() * 0.18,
    bx: 0,
    by: 0,
  };
  group.userData = userData;

  return group;
}
```

- [ ] **Step 2: Write `web/components/experiences/aurora/PhotoField.tsx`**

```tsx
// web/components/experiences/aurora/PhotoField.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { selectPhotoSlots } from "@/lib/aurora/photoSlots";
import { createPhotoFrame, type PhotoFrameUserData } from "./PhotoFrame";

const ROW_SPACING = 32;
const SPAWN_AHEAD = 240;
const REMOVE_BEHIND = 22;
const CAPTION_EVERY_NTH_PHOTO = 4;

interface Slot {
  x: number;
  y: number;
}

interface PhotoFieldProps {
  started: boolean;
  images: string[];
  captions: string[];
  cameraZRef: React.RefObject<number>;
  onPhotoTap: (imgSrc: string) => void;
}

function buildCaptionSprite(text: string): THREE.Sprite {
  const width = 760;
  const height = 110;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "300 italic 23px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > 720) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lineHeight = 32;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  ctx.shadowColor = "#00ffcc";
  ctx.shadowBlur = 28;
  ctx.fillStyle = "rgba(180,255,240,0.92)";
  lines.forEach((l, i) => ctx.fillText(l, width / 2, startY + i * lineHeight));
  ctx.shadowBlur = 7;
  ctx.fillStyle = "rgba(230,255,252,1)";
  lines.forEach((l, i) => ctx.fillText(l, width / 2, startY + i * lineHeight));

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }));
  sprite.scale.set(15.5, 3.1, 1);
  sprite.userData.phase = Math.random() * Math.PI * 2;
  return sprite;
}

/** Infinite photo-panel spawn/despawn with bob animation and tap-to-open-lightbox raycast (aurora.js:227-291, 326-340). */
export function PhotoField({ started, images, captions, cameraZRef, onPhotoTap }: PhotoFieldProps) {
  const { scene, camera, gl, raycaster, pointer } = useThree();
  const panelsRef = useRef<THREE.Group[]>([]);
  const captionSpritesRef = useRef<THREE.Sprite[]>([]);
  const texturesRef = useRef<THREE.Texture[]>([]);
  const photoIndexRef = useRef(0);
  const captionIndexRef = useRef(0);
  const nextZRef = useRef(-22);
  const startedRef = useRef(started);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    startedRef.current = started;
  }, [started]);

  const cols = useMemo<[Slot, Slot, Slot]>(
    () => [
      { x: -17, y: 5 + Math.random() * 4 },
      { x: 0, y: 4 + Math.random() * 5 },
      { x: 17, y: 5 + Math.random() * 4 },
    ],
    [],
  );

  function spawnRow(z: number) {
    const textures = texturesRef.current;
    if (!textures.length) {
      nextZRef.current = z - 26;
      return;
    }

    const slots = selectPhotoSlots(cols, textures.length);
    slots.forEach(({ x, y }) => {
      const tex = textures[photoIndexRef.current % textures.length];
      const src = (tex.image as HTMLImageElement | undefined)?.src ?? "";
      photoIndexRef.current++;
      const panel = createPhotoFrame(tex, src);
      const px = x + (Math.random() - 0.5) * 3;
      const py = y;
      panel.position.set(px, py, z);
      (panel.userData as PhotoFrameUserData).bx = px;
      (panel.userData as PhotoFrameUserData).by = py;
      panel.rotation.y = (Math.random() - 0.5) * 0.18;
      scene.add(panel);
      panelsRef.current.push(panel);
    });

    const midFloaterCount = 2 + Math.floor(Math.random() * 2);
    for (let m = 0; m < midFloaterCount; m++) {
      const tex = textures[photoIndexRef.current % textures.length];
      const src = (tex.image as HTMLImageElement | undefined)?.src ?? "";
      photoIndexRef.current++;
      const panel = createPhotoFrame(tex, src);
      const scale = 0.35 + Math.random() * 0.3;
      panel.scale.setScalar(scale);
      const x = (Math.random() - 0.5) * 45;
      const y = 3 + Math.random() * 10;
      panel.position.set(x, y, z + (Math.random() - 0.5) * 12);
      (panel.userData as PhotoFrameUserData).bx = x;
      (panel.userData as PhotoFrameUserData).by = y;
      scene.add(panel);
      panelsRef.current.push(panel);
    }

    if (captions.length && photoIndexRef.current % CAPTION_EVERY_NTH_PHOTO === 0) {
      const sprite = buildCaptionSprite(captions[captionIndexRef.current % captions.length]);
      captionIndexRef.current++;
      sprite.position.set((Math.random() - 0.5) * 18, 2 + Math.random() * 4, z - 10);
      scene.add(sprite);
      captionSpritesRef.current.push(sprite);
    }

    nextZRef.current = z - ROW_SPACING;
  }

  useEffect(() => {
    let cancelled = false;
    if (!images.length) return;
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
    ).then((loaded) => {
      if (cancelled) return;
      texturesRef.current = loaded.filter((t): t is THREE.Texture => t !== null);
      for (let z = -22; z > -240; z -= ROW_SPACING) spawnRow(z);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  useEffect(() => {
    const canvas = gl.domElement;

    function pointerDown(cx: number, cy: number) {
      draggingRef.current = false;
      dragStartRef.current = { x: cx, y: cy };
    }
    function pointerMove(cx: number, cy: number, buttonActive: boolean) {
      if (!buttonActive) return;
      const dx = cx - dragStartRef.current.x;
      const dy = cy - dragStartRef.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) draggingRef.current = true;
    }
    function pointerUp(cx: number, cy: number) {
      if (draggingRef.current || !startedRef.current) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((cx - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((cy - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const meshes = panelsRef.current.map((p) => (p.userData as PhotoFrameUserData).imgMesh).filter(Boolean);
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length) {
        onPhotoTap((hits[0].object.userData as { imgSrc?: string }).imgSrc ?? "");
      }
    }

    const onMouseDown = (e: MouseEvent) => pointerDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => pointerMove(e.clientX, e.clientY, e.buttons > 0);
    const onMouseUp = (e: MouseEvent) => pointerUp(e.clientX, e.clientY);
    const onTouchStart = (e: TouchEvent) => pointerDown(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => pointerMove(e.touches[0].clientX, e.touches[0].clientY, true);
    const onTouchEnd = (e: TouchEvent) => pointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, camera, raycaster, pointer, onPhotoTap]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const cameraZ = cameraZRef.current;

    if (texturesRef.current.length) {
      while (nextZRef.current > cameraZ - SPAWN_AHEAD) spawnRow(nextZRef.current);
    }

    const panels = panelsRef.current;
    for (let i = panels.length - 1; i >= 0; i--) {
      const p = panels[i];
      const userData = p.userData as PhotoFrameUserData;
      p.position.y = userData.by + Math.sin(t * userData.bobSpeed + userData.phase) * 0.5;
      p.position.x = userData.bx + Math.sin(t * 0.2 + userData.phase * 1.2) * 0.22;
      if (p.position.z > cameraZ + REMOVE_BEHIND) {
        scene.remove(p);
        panels.splice(i, 1);
      }
    }

    const captionSprites = captionSpritesRef.current;
    for (let i = captionSprites.length - 1; i >= 0; i--) {
      const c = captionSprites[i];
      (c.material as THREE.SpriteMaterial).opacity = 0.45 + Math.sin(t * 1.5 + c.userData.phase) * 0.42;
      if (c.position.z > cameraZ + REMOVE_BEHIND) {
        scene.remove(c);
        captionSprites.splice(i, 1);
      }
    }
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
git add web/components/experiences/aurora/PhotoFrame.tsx web/components/experiences/aurora/PhotoField.tsx
git commit -m "feat(web): port aurora PhotoFrame factory and PhotoField spawn/interaction system"
```

---

### Task 4: `Lightbox` component

**Files:**
- Create: `web/components/experiences/aurora/Lightbox.module.css`
- Create: `web/components/experiences/aurora/Lightbox.tsx`

Ports the full-screen photo lightbox (aurora.js:222-225, `public/aurora/index.html`'s `#lightbox`/`#lightbox-img`/`#lightbox-close` markup and CSS) — a plain 2D DOM overlay, not a 3D scene object. Close on backdrop click, close-button click, or Escape key.

- [ ] **Step 1: Write `web/components/experiences/aurora/Lightbox.module.css`**

```css
/* web/components/experiences/aurora/Lightbox.module.css */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 5, 20, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}
.lightbox.visible {
  opacity: 1;
  pointer-events: all;
}
.image {
  max-width: 90vw;
  max-height: 88vh;
  border-radius: 6px;
  box-shadow:
    0 0 40px rgba(0, 255, 180, 0.3),
    0 0 80px rgba(0, 140, 255, 0.2);
}
.close {
  position: absolute;
  top: 20px;
  right: 24px;
  color: rgba(0, 255, 200, 0.7);
  font-size: 32px;
  cursor: pointer;
  line-height: 1;
  background: none;
  border: none;
}
.close:hover {
  color: #fff;
}
```

- [ ] **Step 2: Write `web/components/experiences/aurora/Lightbox.tsx`**

```tsx
// web/components/experiences/aurora/Lightbox.tsx
"use client";

import { useEffect } from "react";
import clsx from "clsx";
import styles from "./Lightbox.module.css";

interface LightboxProps {
  imageSrc: string | null;
  onClose: () => void;
}

/** Full-screen photo lightbox: backdrop click / close button / Escape all dismiss it (aurora.js:222-225). */
export function Lightbox({ imageSrc, onClose }: LightboxProps) {
  useEffect(() => {
    if (!imageSrc) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [imageSrc, onClose]);

  return (
    <div
      className={clsx(styles.lightbox, imageSrc && styles.visible)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button type="button" className={styles.close} onClick={onClose} aria-label="Đóng">
        ✕
      </button>
      {imageSrc && <img className={styles.image} src={imageSrc} alt="" />}
    </div>
  );
}
```

- [ ] **Step 3: Confirm it type-checks cleanly**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add web/components/experiences/aurora/Lightbox.tsx web/components/experiences/aurora/Lightbox.module.css
git commit -m "feat(web): port aurora Lightbox component"
```

---

### Task 5: `CameraAurora` component

**Files:**
- Create: `web/components/experiences/aurora/CameraAurora.tsx`

Ports the camera fall-speed easing, scroll-to-boost, and **absolute-from-drag-start** look-around (aurora.js:228-232, 276-292, 306-316) — per the Fidelity notes above, this is a distinct formula from `FallExperience`'s `CameraFall`, not a shared/generalized component.

- [ ] **Step 1: Write `web/components/experiences/aurora/CameraAurora.tsx`**

```tsx
// web/components/experiences/aurora/CameraAurora.tsx
"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

const TARGET_SPEED = 0.048;
const EASE = 0.0005;
const BOOST_DECAY = 0.965;
const BOOST_STEP = 0.22;
const BOOST_MAX = 0.9;
const LOOK_SENS_X = 0.0006;
const LOOK_SENS_Y = 0.00038;
const LOOK_DECAY = 0.9;
const DRAG_THRESHOLD = 5;

interface CameraAuroraProps {
  started: boolean;
  cameraZRef: React.RefObject<number>;
}

/** Camera fall-speed easing + scroll boost + absolute-from-drag-start look-around (aurora.js:228-232, 276-292, 306-316). Distinct formula from FallExperience's CameraFall — see plan Fidelity notes. */
export function CameraAurora({ started, cameraZRef }: CameraAuroraProps) {
  const { camera, gl } = useThree();
  const fallSpeedRef = useRef(0);
  const boostRef = useRef(0);
  const lookXRef = useRef(0);
  const lookYRef = useRef(0);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const startedRef = useRef(started);

  useEffect(() => {
    startedRef.current = started;
  }, [started]);

  useEffect(() => {
    const canvas = gl.domElement;

    function pointerDown(cx: number, cy: number) {
      draggingRef.current = false;
      dragStartRef.current = { x: cx, y: cy };
    }
    function pointerMove(cx: number, cy: number, buttonActive: boolean) {
      if (!buttonActive) return;
      const dx = cx - dragStartRef.current.x;
      const dy = cy - dragStartRef.current.y;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) draggingRef.current = true;
      lookXRef.current = dx * LOOK_SENS_X;
      lookYRef.current = dy * LOOK_SENS_Y;
    }

    const onMouseDown = (e: MouseEvent) => pointerDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => pointerMove(e.clientX, e.clientY, e.buttons > 0);
    const onTouchStart = (e: TouchEvent) => pointerDown(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => pointerMove(e.touches[0].clientX, e.touches[0].clientY, true);
    const onWheel = (e: WheelEvent) => {
      if (startedRef.current && e.deltaY > 0) boostRef.current = Math.min(boostRef.current + BOOST_STEP, BOOST_MAX);
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame(() => {
    if (started) {
      fallSpeedRef.current += (TARGET_SPEED - fallSpeedRef.current) * EASE;
      boostRef.current *= BOOST_DECAY;
      cameraZRef.current -= fallSpeedRef.current + boostRef.current;

      // Fidelity decision #3: the original never assigns this (an accidental omission —
      // it moves the dome/ground/spawn bookkeeping via cameraZ but never the real camera),
      // so the "falling" motion never actually happened. Fixed here to match fall.js's
      // working pattern and make the dome/ground/PhotoField (already keyed off cameraZRef)
      // line up with what the camera can actually see.
      camera.position.z = cameraZRef.current;

      camera.rotation.y += (-lookXRef.current - camera.rotation.y) * 0.07;
      const targetX = Math.max(-0.1, Math.min(1.0, 0.55 - lookYRef.current * 0.5));
      camera.rotation.x += (targetX - camera.rotation.x) * 0.07;
      lookXRef.current *= LOOK_DECAY;
      lookYRef.current *= LOOK_DECAY;
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
git add web/components/experiences/aurora/CameraAurora.tsx
git commit -m "feat(web): port aurora CameraAurora component"
```

---

### Task 6: `AuroraExperience` top-level composition and dev-only route

**Files:**
- Create: `web/components/experiences/AuroraExperience.tsx` (new — no stub existed for this experience)
- Create: `web/components/experiences/aurora/AuroraExperience.module.css`
- Create: `web/app/aurora/page.tsx`

Wires every component from Tasks 2-5 into one `<Canvas>`, the intro overlay + click-to-start (aurora.js:294-299), theme wiring (aurora.js:350-353, no bug to fix here per the Fidelity notes), and the shared `LandscapeWarning`/`AudioToggleButton`. The dev-only route reads `galaxyId` from `searchParams` the same way `/view` does, but is **not** wired into `/view/page.tsx`'s experience-selection logic — per the design spec, Aurora stays reachable only via its own direct path during this migration phase, matching current production behavior.

- [ ] **Step 1: Write `web/components/experiences/aurora/AuroraExperience.module.css`**

```css
/* web/components/experiences/aurora/AuroraExperience.module.css */
.root {
  position: fixed;
  inset: 0;
  background: #010a18;
}

.canvasWrapper {
  position: fixed;
  inset: 0;
}

.intro {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #010a18 0%, #000510 100%);
  cursor: pointer;
  transition: opacity 1s ease;
}
.intro.hidden {
  opacity: 0;
  pointer-events: none;
}
.introTitle {
  font-size: clamp(26px, 5.5vw, 52px);
  color: #e0fff5;
  letter-spacing: 0.12em;
  font-weight: 300;
  margin-bottom: 10px;
  text-align: center;
  text-shadow:
    0 0 30px rgba(0, 255, 180, 0.6),
    0 0 60px rgba(0, 180, 255, 0.3);
}
.introSub {
  font-size: 13px;
  color: rgba(0, 255, 200, 0.45);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin-bottom: 52px;
}
.pulseRing {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 1px solid rgba(0, 255, 180, 0.5);
  animation: pulse 2.2s ease-out infinite;
}
@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}
.tapHint {
  margin-top: 22px;
  font-size: 13px;
  color: rgba(0, 220, 180, 0.35);
  letter-spacing: 0.12em;
}
```

- [ ] **Step 2: Write `web/components/experiences/AuroraExperience.tsx`**

```tsx
// web/components/experiences/AuroraExperience.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import clsx from "clsx";
import { useGalaxyView } from "@/lib/hooks/useGalaxyView";
import { useMusicManager } from "@/lib/hooks/useMusicManager";
import { AudioToggleButton } from "@/components/AudioToggleButton";
import { LandscapeWarning } from "@/components/LandscapeWarning";
import { SkyDome, type SkyDomeHandle } from "./aurora/SkyDome";
import { Ground } from "./aurora/Ground";
import { PhotoField } from "./aurora/PhotoField";
import { Lightbox } from "./aurora/Lightbox";
import { CameraAurora } from "./aurora/CameraAurora";
import styles from "./aurora/AuroraExperience.module.css";

interface AuroraExperienceProps {
  galaxyId: string;
}

interface SceneProps {
  started: boolean;
  images: string[];
  captions: string[];
  cameraPositionRef: React.RefObject<THREE.Vector3>;
  cameraZRef: React.RefObject<number>;
  skyDomeRef: React.RefObject<SkyDomeHandle | null>;
  onPhotoTap: (imgSrc: string) => void;
}

function Scene({ started, images, captions, cameraPositionRef, cameraZRef, skyDomeRef, onPhotoTap }: SceneProps) {
  return (
    <>
      <SkyDome ref={skyDomeRef} cameraPositionRef={cameraPositionRef} cameraZRef={cameraZRef} />
      <Ground cameraZRef={cameraZRef} />
      <PhotoField started={started} images={images} captions={captions} cameraZRef={cameraZRef} onPhotoTap={onPhotoTap} />
      <CameraAurora started={started} cameraZRef={cameraZRef} />
    </>
  );
}

export function AuroraExperience({ galaxyId }: AuroraExperienceProps) {
  const { view, images, captions, music, theme } = useGalaxyView(galaxyId);
  const musicManager = useMusicManager(music);
  const [started, setStarted] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const cameraZRef = useRef(0);
  const cameraPositionRef = useRef(new THREE.Vector3(0, 3, 0));
  const skyDomeRef = useRef<SkyDomeHandle | null>(null);

  useEffect(() => {
    if (!theme || !skyDomeRef.current) return;
    skyDomeRef.current.uniforms.uC1.value.set(theme.primary || "#00ff55");
    skyDomeRef.current.uniforms.uC2.value.set(theme.secondary || "#00ddff");
  }, [theme]);

  const handleStart = useCallback(() => {
    setStarted(true);
    musicManager.play();
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, [musicManager]);

  return (
    <div className={styles.root}>
      <LandscapeWarning />
      <div className={clsx(styles.intro, started && styles.hidden)} onClick={handleStart}>
        <div className={styles.introTitle}>{view?.name || "Aurora Memories"}</div>
        <div className={styles.introSub}>Ký ức dưới ánh cực quang</div>
        <div className={styles.pulseRing} />
        <div className={styles.tapHint}>Chạm để bắt đầu</div>
      </div>
      <div className={styles.canvasWrapper}>
        <Canvas
          camera={{ fov: 75, near: 0.1, far: 3000, position: [0, 3, 0], rotation: [0.55, 0, 0] }}
          gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace }}
        >
          <Scene
            started={started}
            images={images}
            captions={captions}
            cameraPositionRef={cameraPositionRef}
            cameraZRef={cameraZRef}
            skyDomeRef={skyDomeRef}
            onPhotoTap={setLightboxSrc}
          />
        </Canvas>
      </div>
      <Lightbox imageSrc={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <AudioToggleButton isPlaying={musicManager.isPlaying} hasTrack={musicManager.hasTrack} onToggle={musicManager.toggle} />
    </div>
  );
}
```

- [ ] **Step 3: Write `web/app/aurora/page.tsx`**

```tsx
// web/app/aurora/page.tsx
import { AuroraExperience } from "@/components/experiences/AuroraExperience";

interface AuroraPageProps {
  searchParams: Promise<{ galaxyId?: string }>;
}

/** Dev-only test route for AuroraExperience — NOT wired into /view's experience-selection logic (Aurora is reachable directly today, not through the template picker; see plan Fidelity notes). */
export default async function AuroraPage({ searchParams }: AuroraPageProps) {
  const { galaxyId } = await searchParams;
  if (!galaxyId) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#000", color: "#fff", fontFamily: "sans-serif" }}>
        Add ?galaxyId=... to test the Aurora experience.
      </div>
    );
  }
  return <AuroraExperience galaxyId={galaxyId} />;
}
```

- [ ] **Step 4: Confirm it type-checks cleanly and lints cleanly**

```bash
cd web && npx tsc --noEmit && npx eslint components/experiences/AuroraExperience.tsx components/experiences/aurora app/aurora
```

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
cd web && npm test
```

- [ ] **Step 6: Commit**

```bash
git add web/components/experiences/AuroraExperience.tsx web/components/experiences/aurora/AuroraExperience.module.css web/app/aurora/page.tsx
git commit -m "feat(web): add AuroraExperience component and dev-only test route"
```

---

### Task 7: End-to-end manual verification

No new files — confirms Tasks 1-6 work together against real data, following the same approach as the earlier plans' final verification tasks.

- [ ] **Step 1: Start both servers** against real or seeded data, including a galaxy with multiple gallery photos, a caption array, and a custom theme with distinct `primary`/`secondary` colors.

- [ ] **Step 2: Visually verify against the original** by opening the OLD experience at `http://localhost:3030/aurora/?galaxyId=<id>` (Express, unchanged) and the NEW one at `http://localhost:3000/aurora/?galaxyId=<id>` (Next.js dev-only route from Task 6) side by side. Confirm: aurora sky dome shimmer/color matches the theme (or defaults if none set), icy ground with subtle aurora reflection, photo panels spawn immediately (even before tapping "Chạm để bắt đầu" — confirm this pre-intro spawning/bobbing per the plan's Fidelity note #1), camera stays static until tapped, tapping starts the fall + fullscreen + music, scrolling down boosts fall speed, dragging looks around (confirm the absolute-from-drag-start feel is distinct from FallExperience's incremental-delta feel), tapping a photo (without having dragged) opens the lightbox, closing via backdrop/✕/Escape all work. **Specifically confirm the camera visibly advances forward through the photo field over time** (per Fidelity note #3's fix) — this is a deliberate behavior change from the live OLD experience at `localhost:3030/aurora/`, where the camera never actually moves and the scene runs out of visible panels after roughly a minute; the NEW version should keep spawning and passing photos indefinitely as long as the session runs.

- [ ] **Step 3: Verify no console errors** and no runaway growth in scene object count over a multi-minute session (panels/captions should be continuously spawned AND removed as the camera passes them).

- [ ] **Step 4: Run the full test suite and production build**

```bash
cd web && npm test && npm run build
```

Expected: all Vitest tests pass, `next build` completes with no type errors.

No commit for this task — verification only. If any step reveals a bug, fix it in a new commit against the relevant task's files (do not amend past commits), same discipline as the earlier plans.
