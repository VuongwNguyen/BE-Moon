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

// ── Polaroid factory ───────────────────────────────────────────────────────
const loader = new THREE.TextureLoader();
const polaroids = [];

function makePolaroid(imageUrl, col, row, colOffsets, rowSpacing) {
  const group = new THREE.Group();

  // White frame
  const frameGeo = new THREE.PlaneGeometry(3.2, 3.8);
  const frameMat = new THREE.MeshBasicMaterial({ color: 0xf5f0e8, side: THREE.DoubleSide });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  group.add(frame);

  // Photo area
  const photoGeo = new THREE.PlaneGeometry(2.8, 2.8);
  const photoMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
  const photo = new THREE.Mesh(photoGeo, photoMat);
  photo.position.set(0, 0.3, 0.001);
  group.add(photo);

  loader.load(imageUrl, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    photo.material = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  });

  // Glow sprite
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  const gc = glowCanvas.getContext('2d');
  const grad = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(200,160,255,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  gc.fillStyle = grad; gc.fillRect(0, 0, 128, 128);
  const glowMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(7, 7, 1);
  glow.position.z = -0.1;
  group.add(glow);

  // Grid placement: columns side by side, rows going deeper
  const xBase = colOffsets[col];
  const xJitter = (Math.random() - 0.5) * 1.2;
  const yJitter = (Math.random() - 0.5) * 1.5;
  const depth = -row * rowSpacing - Math.random() * 2 - 5;

  group.position.set(xBase + xJitter, yJitter, depth);

  // Slight tilt
  group.rotation.set(
    (Math.random() - 0.5) * 0.25,
    (Math.random() - 0.5) * 0.2,
    (Math.random() - 0.5) * 0.35
  );

  group.userData = {
    driftX: (Math.random() - 0.5) * 0.002,
    driftY: (Math.random() - 0.5) * 0.002,
    rotSpeed: (Math.random() - 0.5) * 0.0006,
    phase: Math.random() * Math.PI * 2,
  };

  scene.add(group);
  polaroids.push(group);
}

// ── Caption sprites ────────────────────────────────────────────────────────
function makeCaption(text, zPos) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 80;
  const ctx = canvas.getContext('2d');
  ctx.font = '300 32px Georgia, serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(180,120,255,0.8)';
  ctx.shadowBlur = 18;
  ctx.fillText(text, 256, 40);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(14, 2.2, 1);
  sprite.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4, zPos);
  sprite.userData = { driftX: (Math.random() - 0.5) * 0.002 };
  scene.add(sprite);
  return sprite;
}

// ── Camera fall state ──────────────────────────────────────────────────────
let started = false;
let fallSpeed = 0;
const TARGET_SPEED = 0.12;
const ACCEL = 0.0008;
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

  // Build polaroids — 3-4 columns grid layout
  const images = data.images.length ? data.images : [];
  const COLS = images.length <= 12 ? 3 : 4;
  const COL_SPACING = 5.5;   // horizontal gap between columns
  const ROW_SPACING = 7;     // depth gap between rows
  const totalRows = Math.ceil(images.length / COLS);
  totalDepth = totalRows * ROW_SPACING + 80;

  // Center columns horizontally
  const colOffsets = [];
  for (let c = 0; c < COLS; c++) {
    colOffsets.push((c - (COLS - 1) / 2) * COL_SPACING);
  }

  images.forEach((url, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    makePolaroid(url, col, row, colOffsets, ROW_SPACING);
  });

  // Captions — spread between polaroids
  const captions = data.captions;
  captions.forEach((text, i) => {
    const z = -((i + 0.5) / Math.max(captions.length, 1)) * totalDepth;
    makeCaption(text, z);
  });

  // Animate
  animate();
}

// ── Render loop ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  if (started) {
    // Accelerate to target speed
    if (fallSpeed < TARGET_SPEED) fallSpeed += ACCEL;

    // Subtle random sway
    if (Math.random() < 0.01) {
      targetSwayX = (Math.random() - 0.5) * 0.04;
      targetSwayY = (Math.random() - 0.5) * 0.02;
    }
    swayX += (targetSwayX - swayX) * 0.02;
    swayY += (targetSwayY - swayY) * 0.02;

    cameraZ -= fallSpeed;

    // Loop: when camera passes all polaroids, reset
    if (cameraZ < -totalDepth) cameraZ = 0;

    camera.position.z = cameraZ;
    camera.position.x += (swayX - camera.position.x) * 0.05;
    camera.position.y += (swayY - camera.position.y) * 0.05;

    // Look-around
    camera.rotation.y += (-lookX - camera.rotation.y) * 0.08;
    camera.rotation.x += (-lookY - camera.rotation.x) * 0.08;
  } else {
    // Idle: gentle float
    camera.position.y = Math.sin(t * 0.3) * 0.3;
    camera.rotation.x = Math.sin(t * 0.2) * 0.02;
  }

  // Drift polaroids
  polaroids.forEach(p => {
    p.position.x += p.userData.driftX;
    p.position.y += p.userData.driftY;
    p.rotation.z += p.userData.rotSpeed;

    // Gentle bob
    p.position.y += Math.sin(t * 0.5 + p.userData.phase) * 0.0008;

    // Reverse drift at bounds
    if (Math.abs(p.position.x) > 18) p.userData.driftX *= -1;
    if (Math.abs(p.position.y) > 12) p.userData.driftY *= -1;

    // Fade in as camera approaches, fade out as it passes
    const relZ = p.position.z - camera.position.z;
    const alpha = Math.max(0, Math.min(1, (relZ + 30) / 20)) * Math.max(0, Math.min(1, (-relZ + 5) / 20));
    p.children.forEach(child => {
      if (child.material?.opacity !== undefined) child.material.opacity = alpha;
    });
  });

  // Stars + dust scroll with camera
  stars.position.z = cameraZ * 0.3;
  dust.position.z  = cameraZ * 0.85;
  dust.position.x = Math.sin(t * 0.15) * 0.5;
  dust.position.y = Math.cos(t * 0.1)  * 0.3;

  // Aurora follows camera
  auroraMesh.material.uniforms.uTime.value = t;
  auroraMesh.position.z = cameraZ - 80;

  // Shooting stars
  updateShootingStars(t);

  renderer.render(scene, camera);
}

init();
