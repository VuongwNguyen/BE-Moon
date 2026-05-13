// Live galaxy viewer for galaxy-setup — mirrors galaxy-moon aesthetic
// API: setPhotos(items), setTheme(colors), dispose()

class GalaxyLiveViewer {
  constructor(canvas) {
    this.canvas = canvas;
    this._photoSprites = [];
    this._galaxyMeshes = [];
    this._rotY = 0;
    this._drag = false;
    this._lastX = 0;
    this._params = {
      count: 80000, arms: 6, radius: 100, spin: 0.5,
      randomness: 0.2, randomnessPower: 20,
      insideColor:  new THREE.Color('#d63ed6'),
      outsideColor: new THREE.Color('#48b8b8'),
    };
    this._build();
    this._bindEvents();
    this._animate();
  }

  // ── Texture helpers ──────────────────────────────────────────

  _makeCircleTex() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
    g.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  _makeGlowSprite(color, size = 128, opacity = 0.55) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return new THREE.Sprite(mat);
  }

  _roundedRectTex(img, size = 256) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const ar = img.width / img.height;
    let dw, dh, ox, oy;
    if (ar > 1) { dw = size; dh = size / ar; ox = 0; oy = (size - dh) / 2; }
    else        { dh = size; dw = size * ar;  ox = (size - dw) / 2; oy = 0; }
    const cr = size * 0.1;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ox + cr, oy);
    ctx.lineTo(ox + dw - cr, oy);
    ctx.arcTo(ox + dw, oy,      ox + dw, oy + cr,          cr);
    ctx.lineTo(ox + dw, oy + dh - cr);
    ctx.arcTo(ox + dw, oy + dh, ox + dw - cr, oy + dh,     cr);
    ctx.lineTo(ox + cr, oy + dh);
    ctx.arcTo(ox, oy + dh,      ox, oy + dh - cr,           cr);
    ctx.lineTo(ox, oy + cr);
    ctx.arcTo(ox, oy,           ox + cr, oy,                 cr);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, ox, oy, dw, dh);
    ctx.restore();
    return new THREE.CanvasTexture(c);
  }

  // ── Build scene ──────────────────────────────────────────────

  _build() {
    const el = this.canvas.parentElement;
    const W  = el.offsetWidth  || 800;
    const H  = el.offsetHeight || 600;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(W, H);
    this.renderer.setClearColor(0x04040c, 1);

    this.scene  = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x04040c, 0.0015);
    this.camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
    this.camera.position.set(0, 40, 120);
    this.camera.lookAt(0, 0, 0);

    this._circleTex = this._makeCircleTex();

    // Central glow
    const cg = this._makeGlowSprite('rgba(255,255,255,0.8)', 156, 0.25);
    cg.scale.set(8, 8, 1);
    this.scene.add(cg);

    // Nebula — use purple/teal palette instead of random hues
    const nebulaColors = [
      'rgba(139,92,246,0.5)', 'rgba(109,40,217,0.4)', 'rgba(196,181,253,0.3)',
      'rgba(72,184,184,0.35)', 'rgba(30,60,160,0.3)', 'rgba(214,62,214,0.3)',
      'rgba(100,60,220,0.4)', 'rgba(60,100,200,0.3)', 'rgba(180,80,220,0.35)',
    ];
    for (let i = 0; i < 12; i++) {
      const nb = this._makeGlowSprite(nebulaColors[i % nebulaColors.length], 256, 0.6);
      nb.scale.set(70, 70, 1);
      nb.position.set((Math.random()-.5)*160, (Math.random()-.5)*60, (Math.random()-.5)*160);
      this.scene.add(nb);
    }

    this._buildGalaxy(1);

    this._ro = new ResizeObserver(() => {
      const p = this.canvas.parentElement;
      this.camera.aspect = p.offsetWidth / p.offsetHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(p.offsetWidth, p.offsetHeight);
    });
    this._ro.observe(el);
  }

  _buildGalaxy(numGroups) {
    this._galaxyMeshes.forEach(m => {
      this.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
    this._galaxyMeshes = [];

    const p = this._params;
    const perGroup = Math.floor(p.count / Math.max(numGroups, 1));

    for (let g = 0; g < numGroups; g++) {
      const pos = [], col = [];
      for (let i = 0; i < perGroup; i++) {
        const r = Math.pow(Math.random(), p.randomnessPower) * p.radius;
        if (r < 15) continue;
        const branch = (((g * perGroup + i) % p.arms) / p.arms) * Math.PI * 2;
        const angle  = branch + r * p.spin;
        const rx = (Math.random()-.5) * p.randomness * r;
        const ry = (Math.random()-.5) * p.randomness * r * 0.3;
        const rz = (Math.random()-.5) * p.randomness * r;
        pos.push(Math.cos(angle)*r + rx, ry, Math.sin(angle)*r + rz);
        const c = p.insideColor.clone().lerp(p.outsideColor, r / p.radius);
        c.multiplyScalar(0.7 + 0.3 * Math.random());
        col.push(c.r, c.g, c.b);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(col), 3));
      const mat = new THREE.PointsMaterial({
        size: 0.35, sizeAttenuation: true,
        map: this._circleTex, alphaMap: this._circleTex,
        vertexColors: true,
        transparent: true, opacity: 0.9,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(geo, mat);
      this.scene.add(pts);
      this._galaxyMeshes.push(pts);
    }
  }

  // ── Animate & events ─────────────────────────────────────────

  _animate() {
    const tick = () => {
      this._rafId = requestAnimationFrame(tick);
      if (!this._drag) this._rotY += 0.00025;
      this.scene.rotation.y = this._rotY;
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  _bindEvents() {
    const c = this.canvas;
    c.addEventListener('mousedown', e => { this._drag = true; this._lastX = e.clientX; c.style.cursor = 'grabbing'; });
    window.addEventListener('mouseup',   () => { this._drag = false; c.style.cursor = 'grab'; });
    window.addEventListener('mousemove', e => {
      if (!this._drag) return;
      this._rotY += (e.clientX - this._lastX) * 0.004;
      this._lastX = e.clientX;
    });
    c.addEventListener('wheel', e => {
      this.camera.position.z = Math.max(30, Math.min(200, this.camera.position.z + e.deltaY * 0.05));
    }, { passive: true });
    c.style.cursor = 'grab';
  }

  // ── Public API ───────────────────────────────────────────────

  setTheme(colors = {}) {
    const bg  = colors.background || '#04040c';
    const pri = colors.primary    || '#d63ed6';
    const sec = colors.secondary  || '#48b8b8';
    const bgC = new THREE.Color(bg);
    this.renderer.setClearColor(bgC, 1);
    this.scene.fog = new THREE.FogExp2(bgC.getHex(), 0.0015);
    this._params.insideColor  = new THREE.Color(pri);
    this._params.outsideColor = new THREE.Color(sec);
    this._buildGalaxy(Math.max(this._photoSprites.length, 1));
  }

  setPhotos(items = []) {
    this._photoSprites.forEach(o => {
      this.scene.remove(o);
      o.material?.map?.dispose();
      o.material?.dispose();
    });
    this._photoSprites = [];

    const count = Math.min(items.length, 24);
    this._buildGalaxy(Math.max(count, 1));
    if (!count) return;

    const p = this._params;
    const loader = new THREE.TextureLoader();

    items.slice(0, count).forEach((item, i) => {
      // Spread evenly across spiral arms
      const branch = ((i % p.arms) / p.arms) * Math.PI * 2;
      const r      = 30 + (i / count) * 55;
      const angle  = branch + r * p.spin;
      const x = Math.cos(angle) * r + (Math.random()-.5) * 6;
      const y = (Math.random()-.5) * 8;
      const z = Math.sin(angle) * r + (Math.random()-.5) * 6;
      const s = 7 + Math.random() * 3;

      // Try canvas rounded-rect (requires CORS) then fallback
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const tex = this._roundedRectTex(img, 256);
          const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.92, depthWrite: false });
          const sp  = new THREE.Sprite(mat);
          sp.scale.set(s, s, 1);
          sp.position.set(x, y, z);
          this.scene.add(sp);
          this._photoSprites.push(sp);
        } catch {
          this._addFallbackSprite(loader, item.imageUrl, x, y, z, s);
        }
      };
      img.onerror = () => this._addFallbackSprite(loader, item.imageUrl, x, y, z, s);
      img.src = item.imageUrl;
    });
  }

  _addFallbackSprite(loader, url, x, y, z, s) {
    loader.load(url, tex => {
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.88, depthWrite: false });
      const sp  = new THREE.Sprite(mat);
      sp.scale.set(s, s, 1);
      sp.position.set(x, y, z);
      this.scene.add(sp);
      this._photoSprites.push(sp);
    }, undefined, () => {});
  }

  dispose() {
    cancelAnimationFrame(this._rafId);
    this._ro?.disconnect();
    this._photoSprites.forEach(o => { o.material?.map?.dispose(); o.material?.dispose(); });
    this._galaxyMeshes.forEach(m => { m.geometry.dispose(); m.material.dispose(); });
    this._circleTex?.dispose();
    this.renderer.dispose();
  }
}

window.GalaxyLiveViewer = GalaxyLiveViewer;
