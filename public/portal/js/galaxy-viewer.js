// Live galaxy viewer for setup page — no iframe, direct Three.js scene
// Supports instant updates: setPhotos(), setTheme(), dispose()

class GalaxyLiveViewer {
  constructor(canvas) {
    this.canvas  = canvas;
    this.photos  = [];   // THREE.Sprite list
    this.rings   = [];   // glow rings
    this._rotY   = 0;
    this._drag   = false;
    this._lastX  = 0;
    this._build();
    this._bindEvents();
    this._animate();
  }

  _build() {
    const el = this.canvas.parentElement;
    const W  = el.offsetWidth  || 800;
    const H  = el.offsetHeight || 600;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(W, H);
    this.renderer.setClearColor(0x04040c, 1);

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
    this.camera.position.set(0, 18, 55);
    this.camera.lookAt(0, 0, 0);

    this.scene.fog = new THREE.FogExp2(0x04040c, 0.006);

    this._buildStars();

    this._ro = new ResizeObserver(() => {
      const p = this.canvas.parentElement;
      const nw = p.offsetWidth, nh = p.offsetHeight;
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(nw, nh);
    });
    this._ro.observe(el);
  }

  _buildStars(primaryHex = '#8b5cf6') {
    if (this._stars) { this.scene.remove(this._stars); this._stars.geometry.dispose(); this._stars.material.dispose(); }
    const N = 4000;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 25 + Math.random() * 250;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = r * Math.sin(p) * Math.cos(t);
      pos[i*3+1] = r * Math.sin(p) * Math.sin(t) * 0.35;
      pos[i*3+2] = r * Math.cos(p);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.5, sizeAttenuation: true,
      color: new THREE.Color(primaryHex),
      transparent: true, opacity: 0.65,
    });
    this._stars = new THREE.Points(geo, mat);
    this.scene.add(this._stars);
  }

  _animate() {
    const tick = () => {
      this._rafId = requestAnimationFrame(tick);
      this.scene.rotation.y += 0.00025;
      if (!this._drag) this._rotY += 0.0001;
      this.scene.rotation.y = this._rotY;
      // Make rings always face camera
      this.rings.forEach(r => r.lookAt(this.camera.position));
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  _bindEvents() {
    const c = this.canvas;
    c.addEventListener('mousedown', e => { this._drag = true; this._lastX = e.clientX; c.style.cursor = 'grabbing'; });
    window.addEventListener('mouseup', () => { this._drag = false; c.style.cursor = 'grab'; });
    window.addEventListener('mousemove', e => {
      if (!this._drag) return;
      this._rotY += (e.clientX - this._lastX) * 0.004;
      this._lastX = e.clientX;
    });
    c.addEventListener('wheel', e => {
      this.camera.position.z = Math.max(20, Math.min(120, this.camera.position.z + e.deltaY * 0.05));
    }, { passive: true });
    c.style.cursor = 'grab';
  }

  // ── Public API ──────────────────────────────────────────

  setTheme(colors = {}) {
    const bg  = colors.background || '#04040c';
    const pri = colors.primary    || '#8b5cf6';
    const sec = colors.secondary  || '#c4b5fd';

    const bgColor = new THREE.Color(bg);
    this.renderer.setClearColor(bgColor, 1);
    this.scene.fog = new THREE.FogExp2(bgColor.getHex(), 0.006);

    if (this._stars) this._stars.material.color = new THREE.Color(pri);
    this.rings.forEach(r => r.material.color = new THREE.Color(sec));
  }

  setPhotos(items = []) {
    // Remove existing photo objects
    [...this.photos, ...this.rings].forEach(o => {
      this.scene.remove(o);
      o.material?.map?.dispose();
      o.material?.dispose();
      o.geometry?.dispose();
    });
    this.photos = [];
    this.rings  = [];

    const loader = new THREE.TextureLoader();
    const count  = Math.min(items.length, 24);

    items.slice(0, count).forEach((item, i) => {
      const angle = (i / count) * Math.PI * 2;
      const spread = 0.6;
      const r = 10 + Math.random() * 14;
      const x = Math.cos(angle + Math.random() * spread) * r;
      const z = Math.sin(angle + Math.random() * spread) * r;
      const y = (Math.random() - 0.5) * 12;

      loader.load(item.imageUrl, (tex) => {
        // Photo sprite
        const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.92 });
        const sprite = new THREE.Sprite(mat);
        const s = 3.5 + Math.random() * 1.5;
        sprite.scale.set(s, s, 1);
        sprite.position.set(x, y, z);
        this.scene.add(sprite);
        this.photos.push(sprite);

        // Glow ring
        const ringGeo = new THREE.RingGeometry(s * 0.56, s * 0.68, 48);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color('#c4b5fd'),
          transparent: true, opacity: 0.25,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(x, y, z);
        this.scene.add(ring);
        this.rings.push(ring);
      }, undefined, () => {}); // ignore load errors
    });
  }

  dispose() {
    cancelAnimationFrame(this._rafId);
    this._ro?.disconnect();
    [...this.photos, ...this.rings].forEach(o => {
      o.material?.map?.dispose();
      o.material?.dispose();
      o.geometry?.dispose();
    });
    this._stars?.geometry?.dispose();
    this._stars?.material?.dispose();
    this.renderer.dispose();
  }
}

window.GalaxyLiveViewer = GalaxyLiveViewer;
