import * as THREE from 'three';

// ── Fetch galaxy data ─────────────────────────────────────────────────────────
const params  = new URLSearchParams(location.search);
const galaxyId = params.get('galaxyId');

async function fetchData() {
  if (!galaxyId) return { images: [], captions: [], music: null, theme: null, name: '' };
  try {
    const [viewRes, imgRes] = await Promise.all([
      fetch(`/galaxies/${galaxyId}/view`),
      fetch(`/gallary/items?galaxyId=${encodeURIComponent(galaxyId)}`)
    ]);
    const view = viewRes.ok ? (await viewRes.json()).meta : {};
    const imgs = imgRes.ok  ? (await imgRes.json()).meta : [];
    return {
      images:   imgs.map(i => i.imageUrl),
      captions: view.caption || [],
      music:    view.music?.url   || null,
      theme:    view.theme?.colors || null,
      name:     view.name || ''
    };
  } catch { return { images: [], captions: [], music: null, theme: null, name: '' }; }
}

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010a18);

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

// ── Starfield ─────────────────────────────────────────────────────────────────
function buildStarfield() {
  const count = 7000;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 1400;
    pos[i*3+1] = (Math.random() - 0.5) * 500 + 20;
    pos[i*3+2] = -Math.random() * 1400;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xc8e8ff, size: 0.45,
    transparent: true, opacity: 0.75, depthWrite: false
  });
  return new THREE.Points(geo, mat);
}
const stars = buildStarfield();
scene.add(stars);

// ── Snowfall particles ────────────────────────────────────────────────────────
function buildSnow() {
  const count = 2400;
  const pos  = new Float32Array(count * 3);
  const vel  = new Float32Array(count);
  const sway = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 250;
    pos[i*3+1] = Math.random() * 80 - 20;
    pos[i*3+2] = -Math.random() * 900;
    vel[i]  = 0.018 + Math.random() * 0.035;
    sway[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xaaccee, size: 0.12,
    transparent: true, opacity: 0.45, depthWrite: false
  });
  const pts = new THREE.Points(geo, mat);
  pts.userData = { vel, sway };
  return pts;
}
const snow = buildSnow();
scene.add(snow);

// ── Aurora ribbon shader ──────────────────────────────────────────────────────
const AURORA_VERT = /* glsl */`
  uniform float uTime;
  varying vec2  vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.y += sin(p.x * 0.040 + uTime * 0.38) * 4.5;
    p.y += sin(p.x * 0.075 - uTime * 0.22) * 2.8;
    p.y += cos(p.x * 0.020 + uTime * 0.16) * 3.2;
    p.y += sin(p.x * 0.110 + uTime * 0.50) * 1.2;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const AURORA_FRAG = /* glsl */`
  uniform float uTime;
  uniform vec3  uColor1;
  uniform vec3  uColor2;
  uniform vec3  uColor3;
  varying vec2  vUv;

  void main() {
    // Vertical: smooth sine arch
    float vFade = pow(sin(vUv.y * 3.14159), 0.6);

    // Horizontal shimmer — two overlapping waves
    float s1 = sin(vUv.x * 9.0  + uTime * 1.3) * 0.5 + 0.5;
    float s2 = sin(vUv.x * 4.0  - uTime * 0.8) * 0.5 + 0.5;
    float shimmer = s1 * s2;

    // Vertical streaks
    float streak = pow(sin(vUv.y * 3.14159), 0.4);

    // Color ramp along X with slow drift
    float t = clamp(vUv.x + sin(uTime * 0.25) * 0.18, 0.0, 1.0);
    vec3 col;
    if (t < 0.5) {
      col = mix(uColor1, uColor2, t * 2.0);
    } else {
      col = mix(uColor2, uColor3, (t - 0.5) * 2.0);
    }

    float alpha = vFade * shimmer * streak * 0.60;
    gl_FragColor = vec4(col, alpha);
  }
`;

function makeAuroraLayer(y, height, zOff, c1, c2, c3, timeOffset) {
  const geo = new THREE.PlaneGeometry(700, height, 80, 10);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:   { value: timeOffset },
      uColor1: { value: new THREE.Color(c1) },
      uColor2: { value: new THREE.Color(c2) },
      uColor3: { value: new THREE.Color(c3) },
    },
    vertexShader:   AURORA_VERT,
    fragmentShader: AURORA_FRAG,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, y, zOff);
  return mesh;
}

let auroraC1 = '#00ff88';
let auroraC2 = '#00ccff';
let auroraC3 = '#8844ff';

const auroraLayers = [
  makeAuroraLayer(22,  32, -70, '#00ff88', '#00ccff', '#8844ff', 0.0),
  makeAuroraLayer(32,  22, -55, '#00ffaa', '#0088ff', '#aa00ff', 1.5),
  makeAuroraLayer(12,  18, -85, '#55ff99', '#00eeff', '#5511dd', 3.2),
  makeAuroraLayer(40,  12, -50, '#00cc88', '#44aaff', '#cc44ff', 0.8),
];
auroraLayers.forEach(a => scene.add(a));

// ── Glow sprite helper ────────────────────────────────────────────────────────
function makeGlowSprite(w, h, color) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0.0, color.replace(')', ', 0.45)').replace('rgb', 'rgba').replace('#', 'rgba(').replace(/^rgba\(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2}),/, (_,r,g,b) => `rgba(${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)},`));
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(w * 2.8, h * 2.8, 1);
  return sprite;
}

// ── Border glow texture ───────────────────────────────────────────────────────
function makeBorderTex(c1, c2, c3) {
  const w = 256, h = 256;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0,   c1);
  grad.addColorStop(0.5, c2);
  grad.addColorStop(1,   c3);
  ctx.shadowColor = c2;
  ctx.shadowBlur  = 24;
  ctx.fillStyle   = grad;
  ctx.fillRect(0, 0, w, h);
  return new THREE.CanvasTexture(c);
}

// ── Photo panel factory ───────────────────────────────────────────────────────
const PANEL_W = 5.8;

function makePhotoPanel(tex, imgSrc) {
  const aspect = tex.image.height / tex.image.width;
  const ph = PANEL_W * Math.min(Math.max(aspect, 0.56), 1.5);

  const group = new THREE.Group();

  // Aurora-colored border (slightly larger than photo)
  const borderTex = makeBorderTex(auroraC1, auroraC2, auroraC3);
  const borderGeo = new THREE.PlaneGeometry(PANEL_W + 0.18, ph + 0.18);
  const borderMat = new THREE.MeshBasicMaterial({ map: borderTex, transparent: true, opacity: 0.8, depthWrite: false });
  const border = new THREE.Mesh(borderGeo, borderMat);
  border.position.z = -0.02;
  group.add(border);

  // Photo plane
  const imgGeo = new THREE.PlaneGeometry(PANEL_W, ph);
  const imgMat = new THREE.MeshBasicMaterial({ map: tex });
  const imgMesh = new THREE.Mesh(imgGeo, imgMat);
  imgMesh.userData.imgSrc = imgSrc;
  group.add(imgMesh);

  // Ambient glow behind panel
  const glow = makeGlowSpriteSafe(PANEL_W, ph, auroraC2);
  glow.position.z = -0.06;
  group.add(glow);

  group.userData = {
    phase:     Math.random() * Math.PI * 2,
    rotSpeed:  (Math.random() - 0.5) * 0.0015,
    imgSrc,
    imgMesh,
    baseX: 0,
    baseY: 0,
  };

  return group;
}

// Safe glow sprite (handles both hex and rgb color strings)
function makeGlowSpriteSafe(w, h, hexColor) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  // Convert hex to rgba
  let r = 0, g = 200, b = 180;
  if (/^#([0-9a-f]{6})$/i.test(hexColor)) {
    r = parseInt(hexColor.slice(1,3), 16);
    g = parseInt(hexColor.slice(3,5), 16);
    b = parseInt(hexColor.slice(5,7), 16);
  }
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0.0, `rgba(${r},${g},${b},0.35)`);
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(w * 2.8, h * 2.8, 1);
  return sprite;
}

// ── Caption sprite factory ────────────────────────────────────────────────────
function makeCaption(text) {
  const cw = 720, ch = 150;
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);
  ctx.font = '300 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Word wrap
  const words = text.split(' ');
  let line = '', lines = [];
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > 660) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);

  const lineH = 36;
  const startY = ch / 2 - ((lines.length - 1) * lineH) / 2;
  // Outer glow
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur  = 24;
  ctx.fillStyle   = 'rgba(180,255,240,0.85)';
  lines.forEach((l, i) => ctx.fillText(l, cw / 2, startY + i * lineH));
  // Crisper inner pass
  ctx.shadowBlur = 8;
  ctx.fillStyle  = 'rgba(220,255,250,0.95)';
  lines.forEach((l, i) => ctx.fillText(l, cw / 2, startY + i * lineH));

  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(14.4, 3.0, 1);
  sprite.userData.phase = Math.random() * Math.PI * 2;
  return sprite;
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
const lightbox    = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');

document.getElementById('lightbox-close').addEventListener('click', () => lightbox.classList.remove('visible'));
lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.remove('visible'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') lightbox.classList.remove('visible'); });

// ── State ─────────────────────────────────────────────────────────────────────
let cameraZ      = 0;
let fallSpeed    = 0;
const TARGET_SPD = 0.055;
let boostSpeed   = 0;
let started      = false;
let lookX = 0, lookY = 0;

let panels         = [];
let captions       = [];
let captionSprites = [];
let textures       = [];
let panelIdx       = 0;
let captionIdx     = 0;
let nextRowZ       = -22;

const clock     = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

// ── Spawn a row of panels ─────────────────────────────────────────────────────
function spawnRow(z) {
  if (!textures.length) { nextRowZ = z - 24; return; }

  const slots     = [[-7.5, 0], [0, 0], [7.5, 0]];
  const rowCount  = textures.length === 1 ? 1 : textures.length === 2 ? 2 : 3;
  const chosen    = rowCount === 1 ? [slots[1]]
                  : rowCount === 2 ? [slots[0], slots[2]]
                  : slots;

  chosen.forEach(([x]) => {
    const tex    = textures[panelIdx % textures.length];
    const imgSrc = tex.image?.src || '';
    panelIdx++;

    const panel = makePhotoPanel(tex, imgSrc);
    const px    = x + (Math.random() - 0.5) * 2.5;
    const py    = (Math.random() - 0.5) * 7;
    panel.position.set(px, py, z);
    panel.userData.baseX = px;
    panel.userData.baseY = py;
    panel.rotation.y = (Math.random() - 0.5) * 0.25;
    panel.rotation.x = (Math.random() - 0.5) * 0.12;
    scene.add(panel);
    panels.push(panel);
  });

  // Scatter mini panels for depth
  const miniCount = 2 + Math.floor(Math.random() * 3);
  for (let m = 0; m < miniCount; m++) {
    if (!textures.length) break;
    const tex    = textures[panelIdx % textures.length];
    const imgSrc = tex.image?.src || '';
    panelIdx++;
    const mini = makePhotoPanel(tex, imgSrc);
    const scale = 0.22 + Math.random() * 0.28;
    mini.scale.setScalar(scale);
    const px = (Math.random() - 0.5) * 28;
    const py = (Math.random() - 0.5) * 14 + 4;
    mini.position.set(px, py, z + (Math.random() - 0.5) * 10);
    mini.userData.baseX = px;
    mini.userData.baseY = py;
    scene.add(mini);
    panels.push(mini);
  }

  // Caption every ~3 rows
  if (captions.length && panelIdx % 3 < rowCount) {
    const cap = makeCaption(captions[captionIdx % captions.length]);
    captionIdx++;
    cap.position.set(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 5,
      z - 10
    );
    scene.add(cap);
    captionSprites.push(cap);
  }

  nextRowZ = z - 24;
}

// ── Raycasting / click ────────────────────────────────────────────────────────
let isDragging = false, dragX = 0, dragY = 0;

function onPointerDown(cx, cy) {
  isDragging = false; dragX = cx; dragY = cy;
}
function onPointerMove(cx, cy, buttons) {
  if (!buttons) return;
  const dx = cx - dragX, dy = cy - dragY;
  if (Math.abs(dx) + Math.abs(dy) > 5) isDragging = true;
  lookX = dx * 0.0007;
  lookY = dy * 0.00045;
}
function onPointerUp(cx, cy) {
  if (isDragging || !started) return;
  mouse.x =  (cx / innerWidth)  * 2 - 1;
  mouse.y = -(cy / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const imgMeshes = panels.map(p => p.userData.imgMesh).filter(Boolean);
  const hits = raycaster.intersectObjects(imgMeshes);
  if (hits.length) {
    const src = hits[0].object.userData.imgSrc;
    if (src) { lightboxImg.src = src; lightbox.classList.add('visible'); }
  }
}

renderer.domElement.addEventListener('mousedown',  e => onPointerDown(e.clientX, e.clientY));
renderer.domElement.addEventListener('mousemove',  e => onPointerMove(e.clientX, e.clientY, e.buttons));
renderer.domElement.addEventListener('mouseup',    e => onPointerUp(e.clientX, e.clientY));
renderer.domElement.addEventListener('touchstart', e => onPointerDown(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
renderer.domElement.addEventListener('touchmove',  e => onPointerMove(e.touches[0].clientX, e.touches[0].clientY, 1), { passive: true });
renderer.domElement.addEventListener('touchend',   e => onPointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY));
window.addEventListener('wheel', e => { if (started && e.deltaY > 0) boostSpeed = Math.min(boostSpeed + 0.28, 1.0); });

// ── Intro ─────────────────────────────────────────────────────────────────────
document.getElementById('intro').addEventListener('click', () => {
  started = true;
  document.getElementById('intro').classList.add('hidden');
  window.musicManager.play?.().catch?.(() => {});
  document.documentElement.requestFullscreen?.().catch?.(() => {});
});

// ── Animation loop ────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  if (started) {
    fallSpeed  += (TARGET_SPD - fallSpeed) * 0.0006;
    boostSpeed *= 0.955;
    cameraZ    -= fallSpeed + boostSpeed;

    camera.rotation.y += (-lookX - camera.rotation.y) * 0.065;
    camera.rotation.x += (-lookY - camera.rotation.x) * 0.065;
    lookX *= 0.90;
    lookY *= 0.90;
  }

  // Aurora: keep layers pinned ahead in Z, animate shader time
  auroraLayers.forEach((layer, i) => {
    layer.position.z = cameraZ - 55 - i * 18;
    layer.material.uniforms.uTime.value = t + layer.userData?.timeOffset ?? 0;
  });

  // Stars parallax
  stars.position.z = cameraZ * 0.22;

  // Snow: drift down + gentle sway, reset when below view
  const sp   = snow.geometry.attributes.position;
  const vels = snow.userData.vel;
  const sway = snow.userData.sway;
  for (let i = 0; i < sp.count; i++) {
    sp.setY(i, sp.getY(i) - vels[i]);
    sp.setX(i, sp.getX(i) + Math.sin(t * 0.4 + sway[i]) * 0.008);
    if (sp.getY(i) < -25) {
      sp.setY(i, 35 + Math.random() * 15);
      sp.setX(i, (Math.random() - 0.5) * 250);
    }
  }
  sp.needsUpdate = true;
  snow.position.z = cameraZ;

  // Spawn rows ahead of camera
  while (nextRowZ > cameraZ - 200) spawnRow(nextRowZ);

  // Update panels
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    p.position.y  = p.userData.baseY + Math.sin(t * 0.45 + p.userData.phase) * 0.45;
    p.position.x  = p.userData.baseX + Math.sin(t * 0.28 + p.userData.phase * 1.4) * 0.3;
    p.rotation.z += p.userData.rotSpeed;
    if (p.position.z > cameraZ + 18) {
      scene.remove(p);
      panels.splice(i, 1);
    }
  }

  // Update captions
  for (let i = captionSprites.length - 1; i >= 0; i--) {
    const c = captionSprites[i];
    c.material.opacity = 0.55 + Math.sin(t * 1.6 + c.userData.phase) * 0.35;
    if (c.position.z > cameraZ + 18) {
      scene.remove(c);
      captionSprites.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const data = await fetchData();
  captions = data.captions;

  // Apply galaxy name to intro
  if (data.name) {
    const el = document.getElementById('intro-title');
    if (el) el.textContent = data.name;
  }

  // Override aurora colors from theme
  if (data.theme) {
    auroraC1 = data.theme.primary   || auroraC1;
    auroraC2 = data.theme.secondary || auroraC2;
    auroraLayers.forEach(layer => {
      layer.material.uniforms.uColor1.value.set(auroraC1);
      layer.material.uniforms.uColor2.value.set(auroraC2);
    });
  }

  window.musicManager.init(data.music);

  // Load all image textures
  if (data.images.length) {
    const loader = new THREE.TextureLoader();
    textures = await Promise.all(
      data.images.map(url => new Promise(resolve => {
        loader.load(
          url,
          tex => { tex.colorSpace = THREE.SRGBColorSpace; resolve(tex); },
          undefined,
          () => resolve(null)
        );
      }))
    ).then(ts => ts.filter(Boolean));
  }

  // Seed initial rows
  for (let z = -22; z > -200; z -= 24) spawnRow(z);

  animate();
}

init();
