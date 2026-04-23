import * as THREE from 'three';

export function playTransition(url) {
  const overlay = document.getElementById('transition-overlay');
  const canvas = document.getElementById('transition-canvas');
  overlay.style.display = 'block';

  const w = window.innerWidth;
  const h = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(w, h);
  renderer.setClearColor(0x0a0a1f, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
  camera.position.z = 4;

  const COUNT = 800;
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const initAngle = new Float32Array(COUNT);
  const initRadius = new Float32Array(COUNT);
  const initZ = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.5 + Math.random() * 5;
    initAngle[i] = angle;
    initRadius[i] = radius;
    initZ[i] = (Math.random() - 0.5) * 2;
    pos[i * 3]     = Math.cos(angle) * radius;
    pos[i * 3 + 1] = Math.sin(angle) * radius;
    pos[i * 3 + 2] = initZ[i];

    const t = Math.random();
    col[i * 3]     = 0.6 + t * 0.4;
    col[i * 3 + 1] = 0.1 + t * 0.5;
    col[i * 3 + 2] = 0.9 - t * 0.2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.06, vertexColors: true, transparent: true, opacity: 1,
  });
  scene.add(new THREE.Points(geo, mat));

  // Center glow sphere
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xa259f7, transparent: true, opacity: 0 });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), glowMat);
  scene.add(glow);

  const DURATION = 1600;
  let start = null;

  function frame(ts) {
    if (!start) start = ts;
    const t = Math.min((ts - start) / DURATION, 1);
    const ease = t * t;

    for (let i = 0; i < COUNT; i++) {
      const a = initAngle[i] + ease * 5;
      const r = initRadius[i] * (1 - ease * 0.98);
      pos[i * 3]     = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r;
      pos[i * 3 + 2] = initZ[i] * (1 - ease);
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;

    const gs = ease * 10;
    glow.scale.set(gs, gs, gs);
    glowMat.opacity = ease > 0.4 ? Math.min((ease - 0.4) * 1.5, 1) : 0;

    // fade overlay bg to black
    const fade = t > 0.55 ? (t - 0.55) / 0.45 : 0;
    overlay.style.backgroundColor = `rgba(10,10,31,${fade})`;

    renderer.render(scene, camera);

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      window.location.href = url;
    }
  }

  requestAnimationFrame(frame);
}
