function resizeCanvas(canvas) {
  const parent = canvas.parentElement;
  if (!parent) return;
  canvas.width  = parent.clientWidth  || window.innerWidth;
  canvas.height = parent.clientHeight || window.innerHeight;
}

function runStardust(canvas) {
  resizeCanvas(canvas);
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const N = 130;
  const particles = Array.from({ length: N }, () => ({
    x:       Math.random() * W,
    y:       Math.random() * H,
    r:       Math.random() * 1.2 + 0.3,
    vx:      (Math.random() - 0.5) * 0.18,
    vy:      -(Math.random() * 0.38 + 0.08),
    alpha:   Math.random() * 0.55 + 0.2,
    flicker: Math.random() * Math.PI * 2,
  }));
  let rafId;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.flicker += 0.04;
      if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
      const a = p.alpha * (0.55 + 0.45 * Math.sin(p.flicker));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,240,220,${a})`;
      ctx.fill();
    });
    rafId = requestAnimationFrame(draw);
  }
  draw();
  return () => cancelAnimationFrame(rafId);
}

function runFirefly(canvas) {
  resizeCanvas(canvas);
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const N = 22;
  const flies = Array.from({ length: N }, () => ({
    x:     Math.random() * W,
    y:     Math.random() * H,
    r:     Math.random() * 3.5 + 2.5,
    vx:    (Math.random() - 0.5) * 0.28,
    vy:    (Math.random() - 0.5) * 0.28,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.012 + 0.006,
    warm:  Math.random() < 0.5,
  }));
  let rafId;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const t = Date.now();
    flies.forEach(f => {
      f.x += f.vx + Math.sin(t * 0.0007 + f.phase) * 0.38;
      f.y += f.vy + Math.cos(t * 0.0008 + f.phase) * 0.32;
      if (f.x < -30) f.x = W + 30;
      if (f.x > W + 30) f.x = -30;
      if (f.y < -30) f.y = H + 30;
      if (f.y > H + 30) f.y = -30;
      const pulse = 0.45 + 0.55 * Math.sin(t * f.speed * 1000 + f.phase);
      const col = f.warm ? '255,210,110' : '190,150,255';
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 3.8);
      grad.addColorStop(0,   `rgba(${col},${(pulse * 0.85).toFixed(2)})`);
      grad.addColorStop(0.4, `rgba(${col},${(pulse * 0.28).toFixed(2)})`);
      grad.addColorStop(1,   `rgba(${col},0)`);
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 3.8, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
    rafId = requestAnimationFrame(draw);
  }
  draw();
  return () => cancelAnimationFrame(rafId);
}

function runAurora(canvas) {
  resizeCanvas(canvas);
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const bands = [
    { alpha: 0.22, hue: 260, hue2: 280, offset: 0   },
    { alpha: 0.30, hue: 300, hue2: 320, offset: 1.2  },
    { alpha: 0.18, hue: 210, hue2: 240, offset: 2.5  },
  ];
  let rafId;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const t = Date.now() / 3000;
    bands.forEach(b => {
      const y1 = H * (0.22 + 0.14 * Math.sin(t + b.offset));
      const y2 = H * (0.50 + 0.10 * Math.sin(t * 1.3 + b.offset + 1));
      const grad = ctx.createLinearGradient(0, y1, 0, y2);
      grad.addColorStop(0,   `hsla(${b.hue},75%,65%,0)`);
      grad.addColorStop(0.3, `hsla(${b.hue},75%,65%,${b.alpha})`);
      grad.addColorStop(0.7, `hsla(${b.hue2},70%,62%,${(b.alpha * 0.55).toFixed(2)})`);
      grad.addColorStop(1,   `hsla(${b.hue},75%,65%,0)`);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, y1);
      for (let x = 0; x <= W; x += 6) {
        const wave = Math.sin(x / W * Math.PI * 2.8 + t * 2.2 + b.offset) * H * 0.06
                   + Math.sin(x / W * Math.PI * 4.5 + t * 1.5 + b.offset) * H * 0.03;
        ctx.lineTo(x, y1 + wave);
      }
      ctx.lineTo(W, y2);
      ctx.lineTo(0, y2);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    });
    rafId = requestAnimationFrame(draw);
  }
  draw();
  return () => cancelAnimationFrame(rafId);
}

export function initEffect(name, canvas) {
  if (!canvas || !name || name === 'none') return () => {};
  if (name === 'stardust') return runStardust(canvas);
  if (name === 'firefly')  return runFirefly(canvas);
  if (name === 'aurora')   return runAurora(canvas);
  return () => {};
}
