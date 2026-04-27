import * as THREE from 'three';

// ── Fetch galaxy data ──────────────────────────────────────────────────────
const params = new URLSearchParams(location.search);
const galaxyId = params.get('galaxyId');

async function fetchData() {
  if (!galaxyId) return { images: [], captions: [], music: null, theme: null };
  try {
    const [viewRes, imgRes] = await Promise.all([
      fetch(`/galaxies/${galaxyId}/view`),
      fetch(`/gallary/items?galaxyId=${encodeURIComponent(galaxyId)}`)
    ]);
    const view = viewRes.ok ? (await viewRes.json()).meta : {};
    const imgs = imgRes.ok ? (await imgRes.json()).meta : [];
    return {
      images: imgs.map(i => i.imageUrl),
      captions: view.caption || [],
      music: view.music?.url || null,
      theme: view.theme?.colors || null,
      name: view.name || ''
    };
  } catch { return { images: [], captions: [], music: null, theme: null }; }
}

// ── Scene setup ────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.getElementById('canvas-container').appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Starfield ──────────────────────────────────────────────────────────────
function buildStarfield() {
  const count = 8000;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 1200;
    pos[i*3+1] = (Math.random() - 0.5) * 1200;
    pos[i*3+2] = -Math.random() * 1200;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.7, depthWrite: false });
  return new THREE.Points(geo, mat);
}
const stars = buildStarfield();
scene.add(stars);

// ── Particle dust ──────────────────────────────────────────────────────────
function buildParticles() {
  const count = 3000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 40;
    pos[i*3+1] = (Math.random() - 0.5) * 30;
    pos[i*3+2] = -Math.random() * 600;
    // Soft purple/white tones
    const r = 0.7 + Math.random() * 0.3;
    const g = 0.5 + Math.random() * 0.3;
    const b = 0.9 + Math.random() * 0.1;
    col[i*3] = r; col[i*3+1] = g; col[i*3+2] = b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.12, vertexColors: true,
    transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending
  });
  return new THREE.Points(geo, mat);
}
const dust = buildParticles();
scene.add(dust);

// ── Sparkles ───────────────────────────────────────────────────────────────
function buildSparkles() {
  const count = 3000;
  const pos   = new Float32Array(count * 3);
  const col   = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);

  const palette = [
    [1.0, 0.85, 0.25], // gold
    [1.0, 0.40, 0.75], // pink
    [0.30, 0.90, 1.0], // cyan
    [0.80, 0.45, 1.0], // purple
    [1.0, 1.0,  1.0],  // white
  ];

  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 90;
    pos[i*3+1] = (Math.random() - 0.5) * 55;
    pos[i*3+2] = (Math.random() - 0.5) * 700;
    const c = palette[Math.floor(Math.random() * palette.length)];
    col[i*3] = c[0]; col[i*3+1] = c[1]; col[i*3+2] = c[2];
    phase[i] = Math.random() * Math.PI * 2;
    speed[i] = 1.2 + Math.random() * 4.0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSpeed',   new THREE.BufferAttribute(speed, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
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
    `,
    fragmentShader: `
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
    `,
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, vertexColors: true,
  });

  return new THREE.Points(geo, mat);
}
const sparkles = buildSparkles();
scene.add(sparkles);

// ── Shooting stars ─────────────────────────────────────────────────────────
const shootingStars = [];

function randomCurve() {
  const s = new THREE.Vector3(-150 + Math.random()*80, -60 + Math.random()*120, cameraZ - 20 - Math.random()*60);
  const e = new THREE.Vector3(s.x + 300 + Math.random()*150, s.y + (-80+Math.random()*160), s.z + (-60+Math.random()*120));
  const c1 = new THREE.Vector3(s.x+120+Math.random()*80, s.y+(-40+Math.random()*80), s.z+(-40+Math.random()*80));
  const c2 = new THREE.Vector3(e.x-120+Math.random()*80, e.y+(-40+Math.random()*80), e.z+(-40+Math.random()*80));
  return new THREE.CubicBezierCurve3(s, c1, c2, e);
}

function spawnShootingStar() {
  const TRAIL = 80;
  const headGeo = new THREE.SphereGeometry(0.8, 8, 8);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
  const head = new THREE.Mesh(headGeo, headMat);

  const curve = randomCurve();
  const pts = Array.from({ length: TRAIL }, (_, i) => curve.getPoint(i / (TRAIL - 1)));
  const trailGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const trailMat = new THREE.LineBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
  const trail = new THREE.Line(trailGeo, trailMat);

  const g = new THREE.Group();
  g.add(head); g.add(trail);
  g.userData = { curve, progress: 0, speed: 0.0012 + Math.random()*0.001, life: 0, maxLife: 280, head, trail, pts, TRAIL };
  scene.add(g);
  shootingStars.push(g);
}

function updateShootingStars(t) {
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i];
    s.userData.life++;
    s.userData.progress += s.userData.speed;

    let opacity = 1;
    if (s.userData.life < 25) opacity = s.userData.life / 25;
    else if (s.userData.life > s.userData.maxLife - 25) opacity = (s.userData.maxLife - s.userData.life) / 25;

    if (s.userData.progress >= 1 || s.userData.life >= s.userData.maxLife) {
      scene.remove(s);
      shootingStars.splice(i, 1);
      continue;
    }

    const pos = s.userData.curve.getPoint(s.userData.progress);
    s.userData.head.position.copy(pos);
    s.userData.head.material.opacity = opacity;

    const pts = s.userData.pts;
    for (let j = 0; j < s.userData.TRAIL; j++) {
      const tp = Math.max(0, s.userData.progress - j * 0.008);
      pts[j].copy(s.userData.curve.getPoint(tp));
    }
    s.userData.trail.geometry.setFromPoints(pts);
    s.userData.trail.material.opacity = opacity * 0.55;
  }
  if (shootingStars.length < 3 && Math.random() < 0.018) spawnShootingStar();
}

// ── Aurora ─────────────────────────────────────────────────────────────────
function buildAurora() {
  // Wide ribbon plane in the background
  const geo = new THREE.PlaneGeometry(200, 40, 60, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        pos.y += sin(pos.x * 0.08 + uTime * 0.6) * 5.0
                + sin(pos.x * 0.15 + uTime * 0.4) * 3.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float alpha = sin(vUv.x * 3.14159) * (1.0 - vUv.y) * 0.35;
        alpha *= 0.6 + 0.4 * sin(vUv.x * 8.0 + uTime * 0.7);
        // Green-teal-purple gradient
        vec3 c1 = vec3(0.0, 0.9, 0.6);
        vec3 c2 = vec3(0.5, 0.1, 0.9);
        vec3 col = mix(c1, c2, vUv.x + 0.3 * sin(uTime * 0.3));
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 18, -80);
  mesh.rotation.x = 0.15;
  scene.add(mesh);
  return mesh;
}
const auroraMesh = buildAurora();

// ── Mystery planet ─────────────────────────────────────────────────────────
function buildMysteryPlanet() {
  const group = new THREE.Group();
  group.position.set(3, -4, 150);

  // Core sphere — deep purple atmosphere shader
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(14, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vNormal; varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
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
      `,
      transparent: false,
    })
  );
  group.add(sphere);

  // Atmosphere halo (backside glow)
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(17, 32, 32),
    new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0,0.0,1.0))), 3.5);
          gl_FragColor = vec4(0.45, 0.08, 0.9, rim * 0.55);
        }
      `,
      transparent: true, depthWrite: false,
      side: THREE.BackSide, blending: THREE.AdditiveBlending,
    })
  );
  group.add(halo);

  // Rings
  const ringGeo = new THREE.RingGeometry(19, 32, 80);
  // UV remap for ring gradient
  const ringPos = ringGeo.attributes.position;
  const ringUV  = ringGeo.attributes.uv;
  for (let i = 0; i < ringPos.count; i++) {
    const x = ringPos.getX(i), y = ringPos.getY(i);
    const r = Math.sqrt(x*x + y*y);
    ringUV.setXY(i, (r - 19) / 13, 0);
  }
  const ring = new THREE.Mesh(ringGeo, new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        float t = vUv.x;
        float gap = smoothstep(0.38, 0.42, t) * (1.0 - smoothstep(0.55, 0.58, t));
        vec3 col = mix(vec3(0.3,0.05,0.6), vec3(0.6,0.2,1.0), t);
        gl_FragColor = vec4(col, (0.25 + t * 0.2) * gap);
      }
    `,
    transparent: true, depthWrite: false,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }));
  ring.rotation.x = 1.1;
  group.add(ring);

  // Outer glow sprite
  const gc = document.createElement('canvas'); gc.width = gc.height = 256;
  const gctx = gc.getContext('2d');
  const gr = gctx.createRadialGradient(128,128,0,128,128,128);
  gr.addColorStop(0,   'rgba(110,30,255,0.5)');
  gr.addColorStop(0.4, 'rgba(60,10,160,0.15)');
  gr.addColorStop(1,   'rgba(0,0,0,0)');
  gctx.fillStyle = gr; gctx.fillRect(0,0,256,256);
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(gc), transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  glowSprite.scale.set(80, 80, 1);
  group.add(glowSprite);

  scene.add(group);
  return { group, sphere, ring };
}
const mysteryPlanet = buildMysteryPlanet();

// ── Polaroid factory ───────────────────────────────────────────────────────
const loader = new THREE.TextureLoader();
const polaroids = [];

function makePolaroidFromTex(tex, col, colOffsets, zPos) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.8), new THREE.MeshBasicMaterial({ color: 0xf5f0e8, side: THREE.DoubleSide, depthWrite: false }));
  frame.renderOrder = 0;
  group.add(frame);
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  photo.position.set(0, 0.3, 0);
  photo.renderOrder = 1;
  group.add(photo);
  const gc = document.createElement('canvas'); gc.width = gc.height = 128;
  const gctx = gc.getContext('2d');
  const gr = gctx.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(200,160,255,0.35)'); gr.addColorStop(1,'rgba(0,0,0,0)');
  gctx.fillStyle = gr; gctx.fillRect(0,0,128,128);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(7,7,1); glow.position.z = -0.1;
  group.add(glow);
  group.position.set(colOffsets[col] + (Math.random()-0.5)*1.2, (Math.random()-0.5)*1.5, zPos);
  group.rotation.set((Math.random()-0.5)*0.25, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.35);
  group.userData = { driftX:(Math.random()-0.5)*0.002, driftY:(Math.random()-0.5)*0.002, rotSpeed:(Math.random()-0.5)*0.0006, phase:Math.random()*Math.PI*2 };
  scene.add(group);
  return group;
}


// ── Camera fall state ──────────────────────────────────────────────────────
let started = false;
let fallSpeed = 0;
const TARGET_SPEED = 0.06;
const ACCEL = 0.0004;
let cameraZ = 0;
let totalDepth = 0;

// Subtle camera sway
let swayX = 0, swayY = 0;
let targetSwayX = 0, targetSwayY = 0;

// Touch/mouse look-around
let lookX = 0, lookY = 0;
renderer.domElement.addEventListener('mousemove', e => {
  if (!started) return;
  lookX = (e.clientX / innerWidth  - 0.5) * 0.3;
  lookY = (e.clientY / innerHeight - 0.5) * 0.15;
});
renderer.domElement.addEventListener('touchmove', e => {
  if (!started) return;
  const t = e.touches[0];
  lookX = (t.clientX / innerWidth  - 0.5) * 0.3;
  lookY = (t.clientY / innerHeight - 0.5) * 0.15;
}, { passive: true });

// ── Intro click ────────────────────────────────────────────────────────────
const intro = document.getElementById('intro');
intro.addEventListener('click', () => {
  started = true;
  intro.classList.add('hidden');
  window.musicManager?.play();
});

// ── Main init ──────────────────────────────────────────────────────────────
async function init() {
  const data = await fetchData();

  // Set title
  if (data.name) document.getElementById('intro-title').textContent = data.name;

  // Background color from theme
  const bgColor = data.theme?.background ? new THREE.Color(data.theme.background) : new THREE.Color(0x000005);
  scene.background = bgColor;
  scene.fog = new THREE.FogExp2(bgColor.getHex(), 0.012);

  // Music
  window.musicManager?.init(data.music);

  // Build polaroids — infinite pool, pre-spawn ahead of camera
  const images = data.images.length ? data.images : [];
  if (!images.length) { animate(); return; }

  const COLS = images.length <= 12 ? 3 : 4;
  const COL_SPACING = 5.5;
  const colOffsets = Array.from({ length: COLS }, (_, c) => (c - (COLS - 1) / 2) * COL_SPACING);

  // Pre-load all textures once
  const textures = await Promise.all(images.map(url => new Promise(res => {
    loader.load(url, tex => { tex.colorSpace = THREE.SRGBColorSpace; res(tex); }, undefined, () => res(null));
  })));

  // Pool: COLS * VISIBLE_ROWS polaroids
  const VISIBLE_ROWS = 6;
  const ROW_DEPTH = 7;
  let nextRowZ = -5;

  // Caption queue
  const captions = data.captions;
  let captionIdx = 0;
  const captionSprites = [];

  function spawnCaption(zPos) {
    if (!captions.length) return;
    const text = captions[captionIdx % captions.length];
    captionIdx++;
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.font = '300 32px Georgia, serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(180,120,255,0.9)'; ctx.shadowBlur = 20;
    ctx.fillText(text, 256, 40);
    const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(14, 2.2, 1);
    sprite.position.set((Math.random()-0.5)*6, (Math.random()-0.5)*3, zPos);
    scene.add(sprite);
    captionSprites.push(sprite);
  }

  let rowCount = 0;

  function spawnRow(zPos) {
    rowCount++;
    if (captions.length && rowCount % 5 === 0) {
      spawnCaption(zPos - ROW_DEPTH * 0.5);
      window._nextRowZ = zPos - ROW_DEPTH * 2.5;
      return;
    }
    for (let c = 0; c < COLS; c++) {
      const texIdx = Math.floor(Math.random() * textures.length);
      const tex = textures[texIdx];
      if (!tex) continue;
      // Each photo fully independent Z — spread across 3x row depth
      const zOffset = (Math.random() - 0.5) * ROW_DEPTH * 3;
      const p = makePolaroidFromTex(tex, c, colOffsets, zPos + zOffset);
      polaroids.push(p);
    }
    // Spawn 1-2 mini floating photos in the gaps
    const miniCount = 1 + Math.floor(Math.random() * 2);
    for (let m = 0; m < miniCount; m++) {
      const tex = textures[Math.floor(Math.random() * textures.length)];
      if (!tex) continue;
      const mini = makePolaroidFromTex(tex, Math.floor(Math.random() * COLS), colOffsets, zPos + (Math.random() - 0.5) * ROW_DEPTH * 2);
      // Scale down to mini size
      mini.scale.set(0.45, 0.45, 0.45);
      // Push further to the sides
      mini.position.x += (Math.random() > 0.5 ? 1 : -1) * (6 + Math.random() * 4);
      mini.position.y += (Math.random() - 0.5) * 6;
      polaroids.push(mini);
    }
    window._nextRowZ = zPos - ROW_DEPTH;
  }

  // Pre-spawn initial rows
  for (let r = 0; r < VISIBLE_ROWS; r++) {
    spawnRow(nextRowZ);
  }

  // Store spawn function for animate loop
  window._spawnRow = spawnRow;
  window._colOffsets = colOffsets;
  window._nextRowZ = nextRowZ;
  window._captionSprites = captionSprites;

  // Animate
  animate();
}

let frozen = false;
let boostSpeed = 0;
const BOOST = 1.0;
const BOOST_DECAY = 0.02;

let facingBack = false;
let baseYaw = 0;
let flipCooldown = 0;
const FLIP_CHANCE = 0.0007;
let introTimer = 0;
let introFlipDone = false;

// Scroll → boost
renderer.domElement.addEventListener('wheel', e => {
  if (!started) return;
  if (e.deltaY > 0) boostSpeed = BOOST; // scroll down = speed up
}, { passive: true });

// Hold (mousedown/touchstart) → freeze
renderer.domElement.addEventListener('mousedown', () => { if (started) frozen = true; });
renderer.domElement.addEventListener('mouseup',   () => { frozen = false; });
renderer.domElement.addEventListener('touchstart', () => { if (started) frozen = true; }, { passive: true });
renderer.domElement.addEventListener('touchend',   () => { frozen = false; });

// ── "Ngưng Đọng Thời Gian" overlay ────────────────────────────────────────
const freezeEl = document.createElement('div');
freezeEl.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:rgba(255,255,255,0.55);font-size:13px;letter-spacing:0.25em;text-transform:uppercase;pointer-events:none;opacity:0;transition:opacity 0.4s;font-family:Georgia,serif;text-shadow:0 0 20px rgba(180,120,255,0.8)';
freezeEl.textContent = '✦ Ngưng Đọng Thời Gian ✦';
document.body.appendChild(freezeEl);
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  if (started) {
    // Freeze overlay
    freezeEl.style.opacity = frozen ? '1' : '0';

    if (!frozen) {
      // Accelerate to target speed + boost decay
      if (fallSpeed < TARGET_SPEED) fallSpeed += ACCEL;
      if (boostSpeed > 0) boostSpeed = Math.max(0, boostSpeed - BOOST_DECAY);

      cameraZ -= (fallSpeed + boostSpeed);
    }

    // Subtle random sway (always)
    if (Math.random() < 0.01) {
      targetSwayX = (Math.random() - 0.5) * 0.04;
      targetSwayY = (Math.random() - 0.5) * 0.02;
    }
    // Occasional sharp drift — "bẻ lái"
    if (Math.random() < 0.002) {
      targetSwayX = (Math.random() - 0.5) * 10;
      targetSwayY = (Math.random() - 0.5) * 4;
    }
    swayX += (targetSwayX - swayX) * 0.012;
    swayY += (targetSwayY - swayY) * 0.012;

    // Auto camera rotation drift (slow sine)
    const autoDriftY = Math.sin(t * 0.07) * 0.18 + Math.sin(t * 0.13) * 0.08;
    const autoDriftX = Math.sin(t * 0.05) * 0.06;

    // Loop: when camera passes all polaroids, reset

    camera.position.z = cameraZ;
    camera.position.x += (swayX - camera.position.x) * 0.05;
    camera.position.y += (swayY - camera.position.y) * 0.05;

    // Intro flip: nhìn hành tinh 1 lần khi vừa vào
    if (!introFlipDone) {
      introTimer++;
      if (introTimer === 30)  { facingBack = true;  baseYaw = Math.PI; flipCooldown = 99999; }
      if (introTimer === 300) { facingBack = false; baseYaw = 0; }
      if (introTimer === 480) { introFlipDone = true; flipCooldown = 120; }
    }

    // Random 180° flip (chỉ sau khi intro xong)
    if (introFlipDone && !frozen && flipCooldown <= 0 && Math.random() < FLIP_CHANCE) {
      facingBack = !facingBack;
      baseYaw = facingBack ? Math.PI : 0;
      flipCooldown = 500;
    }
    if (flipCooldown > 0) flipCooldown--;

    // Look-around + base yaw (slow lerp mid-flip, fast lerp steady)
    const yawTarget = baseYaw - lookX;
    const yawDist = Math.abs(camera.rotation.y - yawTarget);
    camera.rotation.y += (yawTarget - camera.rotation.y) * (yawDist > 0.3 ? 0.018 : 0.08);
    camera.rotation.x += (-lookY - camera.rotation.x) * 0.08;
  } else {
    // Idle: gentle float
    camera.position.y = Math.sin(t * 0.3) * 0.3;
    camera.rotation.x = Math.sin(t * 0.2) * 0.02;
  }

  // Infinite spawn: spawn new rows ahead, remove old ones behind
  if (window._spawnRow) {
    const SPAWN_AHEAD = 50;
    while (window._nextRowZ > cameraZ - SPAWN_AHEAD) {
      window._spawnRow(window._nextRowZ);
    }
    // Remove polaroids too far behind camera
    for (let i = polaroids.length - 1; i >= 0; i--) {
      if (polaroids[i].position.z > cameraZ + 80) {
        scene.remove(polaroids[i]);
        polaroids.splice(i, 1);
      }
    }
    // Remove caption sprites too far behind
    if (window._captionSprites) {
      for (let i = window._captionSprites.length - 1; i >= 0; i--) {
        if (window._captionSprites[i].position.z > cameraZ + 80) {
          scene.remove(window._captionSprites[i]);
          window._captionSprites.splice(i, 1);
        }
      }
    }
  }
  polaroids.forEach(p => {
    p.position.x += p.userData.driftX;
    p.position.y += p.userData.driftY;
    p.rotation.z += p.userData.rotSpeed;

    // Gentle bob
    p.position.y += Math.sin(t * 0.5 + p.userData.phase) * 0.0008;

    // Reverse drift at bounds
    if (Math.abs(p.position.x) > 18) p.userData.driftX *= -1;
    if (Math.abs(p.position.y) > 12) p.userData.driftY *= -1;

    // Fade by distance — works both when camera faces forward and backward
    const dist = Math.abs(p.position.z - camera.position.z);
    const alpha = Math.max(0, Math.min(1, (70 - dist) / 20));
    p.children.forEach(child => {
      if (child.material?.opacity !== undefined) child.material.opacity = alpha;
    });
  });

  // Stars + dust + sparkles scroll with camera
  stars.position.z = cameraZ * 0.3;
  dust.position.z  = cameraZ * 0.85;
  sparkles.position.z = cameraZ * 0.92;
  sparkles.material.uniforms.uTime.value = t;
  dust.position.x = Math.sin(t * 0.15) * 0.5;
  dust.position.y = Math.cos(t * 0.1)  * 0.3;

  // Aurora follows camera
  auroraMesh.material.uniforms.uTime.value = t;
  auroraMesh.position.z = cameraZ - 80;

  // Shooting stars
  updateShootingStars(t);

  // Mystery planet — slow spin, breathe glow
  mysteryPlanet.sphere.rotation.y = t * 0.04;
  mysteryPlanet.sphere.material.uniforms.uTime.value = t;
  mysteryPlanet.ring.rotation.z = t * 0.012;

  renderer.render(scene, camera);
}

init();
