# SE Particle Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm 3 hiệu ứng Canvas 2D (Stardust, Firefly, Aurora) tuỳ chọn vào SE viewer, user chọn trong galaxy.html customization.

**Architecture:** `seEffect` field lưu trong Galaxy model, hiển thị trong `getGalaxyView`. Galaxy.html có dropdown chọn effect, auto-save cùng theme/music. Story viewer đọc `view.seEffect`, import `effects.js`, init Canvas 2D loop tương ứng. Canvas layer nằm giữa photo và gradient overlay.

**Tech Stack:** Node.js/Mongoose (backend), Vanilla JS ES modules, Canvas 2D API

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `models/galaxy.js` | Thêm `seEffect` field |
| Modify | `services/galaxy.service.js` | Include `seEffect` trong `getGalaxyView` |
| Modify | `public/portal/galaxy.html` | Thêm `#effectSection` dropdown |
| Modify | `public/portal/js/galaxy-custom.js` | Load + save `seEffect` |
| Modify | `public/story/index.html` | Thêm `<canvas id="se-effect-canvas">` |
| Create | `public/story/js/effects.js` | 3 effect functions + `initEffect` dispatcher |
| Modify | `public/story/js/story.js` | Import + init effect, stop on redirect |

---

## Task 1: Galaxy model — thêm seEffect field

**Files:**
- Modify: `models/galaxy.js`

- [ ] **Thêm `seEffect` vào galaxySchema — sau field `template`**

Mở `models/galaxy.js`. Tìm:
```js
  template: {
    type: String,
    enum: ["galaxy", "fall"],
    default: "galaxy",
  },
```

Thêm ngay sau:
```js
  seEffect: {
    type: String,
    enum: ['none', 'stardust', 'firefly', 'aurora'],
    default: 'none',
  },
```

- [ ] **Verify model load**

```bash
node -e "require('./models/galaxy'); console.log('OK')"
```
Expected: `OK`

- [ ] **Commit**

```bash
git add models/galaxy.js
git commit -m "feat: galaxy model — add seEffect field"
```

---

## Task 2: Galaxy service — include seEffect trong getGalaxyView

**Files:**
- Modify: `services/galaxy.service.js`

- [ ] **Thêm `seEffect` vào return object của `getGalaxyView`**

Tìm:
```js
    return {
      _id: galaxy._id,
      name: galaxy.name,
      caption: galaxy.caption,
      theme: galaxy.themeId || null,
      music: galaxy.backgroundMusicId || null,
      template: galaxy.template || 'galaxy',
      storyType: galaxy.storyType || null,
      occasion: galaxy.occasion || null,
      chapters: galaxy.chapters || [],
    };
```

Thêm `seEffect` vào cuối return object:
```js
    return {
      _id: galaxy._id,
      name: galaxy.name,
      caption: galaxy.caption,
      theme: galaxy.themeId || null,
      music: galaxy.backgroundMusicId || null,
      template: galaxy.template || 'galaxy',
      storyType: galaxy.storyType || null,
      occasion: galaxy.occasion || null,
      chapters: galaxy.chapters || [],
      seEffect: galaxy.seEffect || 'none',
    };
```

- [ ] **Verify service load**

```bash
node -e "require('./services/galaxy.service'); console.log('OK')"
```
Expected: `OK`

- [ ] **Commit**

```bash
git add services/galaxy.service.js
git commit -m "feat: galaxy service — include seEffect in getGalaxyView"
```

---

## Task 3: galaxy.html — thêm dropdown Hiệu ứng

**Files:**
- Modify: `public/portal/galaxy.html`

- [ ] **Thêm `#effectSection` sau `#templateSection`**

Tìm:
```html
      <div id="templateSection" style="margin-bottom: 16px; display: none;">
```

Thêm đoạn sau VÀO SAU closing tag `</div>` của `#templateSection`:
```html
      <div id="effectSection" style="margin-bottom: 16px;">
        <label style="display: block; font-size: 12px; color: var(--text-sub); margin-bottom: 6px;">Hiệu ứng Story</label>
        <select id="effectSelect" style="width: 100%; padding: 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: 'Jost', sans-serif; font-size: 13px;">
          <option value="none">Không có</option>
          <option value="stardust">✨ Bụi sao</option>
          <option value="firefly">🌟 Đom đóm</option>
          <option value="aurora">🌌 Aurora</option>
        </select>
      </div>
```

- [ ] **Verify `#effectSelect` tồn tại trong file**

```bash
grep -c "effectSelect" public/portal/galaxy.html
```
Expected: `2` (label + select id)

- [ ] **Commit**

```bash
git add public/portal/galaxy.html
git commit -m "feat: galaxy.html — add seEffect dropdown in customization"
```

---

## Task 4: galaxy-custom.js — load + save seEffect

**Files:**
- Modify: `public/portal/js/galaxy-custom.js`

- [ ] **Thêm `seEffect` vào `performSave` payload**

Tìm:
```js
  const payload = { themeId, backgroundMusicId: musicId, caption: currentCaptions };
```

Thêm dòng ngay sau:
```js
  payload.seEffect = document.getElementById('effectSelect').value || 'none';
```

- [ ] **Load `seEffect` trong `loadGalaxyCustomization`**

Tìm:
```js
    if (galaxy.template) document.getElementById('templateSelect').value = galaxy.template;
```

Thêm ngay sau:
```js
    const effectEl = document.getElementById('effectSelect');
    if (effectEl) effectEl.value = galaxy.seEffect || 'none';
```

- [ ] **Thêm event listener cho `effectSelect`**

Tìm:
```js
document.getElementById('themeSelect').addEventListener('change', scheduleSave);
document.getElementById('musicSelect').addEventListener('change', scheduleSave);
document.getElementById('templateSelect').addEventListener('change', scheduleSave);
```

Thêm ngay sau:
```js
document.getElementById('effectSelect').addEventListener('change', scheduleSave);
```

- [ ] **Verify syntax**

```bash
node --check public/portal/js/galaxy-custom.js && echo "OK"
```
Expected: `OK`

- [ ] **Commit**

```bash
git add public/portal/js/galaxy-custom.js
git commit -m "feat: galaxy-custom — load and save seEffect"
```

---

## Task 5: story/index.html — thêm canvas layer

**Files:**
- Modify: `public/story/index.html`

- [ ] **Thêm `<canvas id="se-effect-canvas">` trong `#se-photo` — giữa `#se-photo-img` và `#se-photo-gradient`**

Tìm:
```html
    <img id="se-photo-img" src="" alt="" />
    <div id="se-photo-gradient"></div>
```

Thêm canvas giữa:
```html
    <img id="se-photo-img" src="" alt="" />
    <canvas id="se-effect-canvas" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"></canvas>
    <div id="se-photo-gradient"></div>
```

DOM order đảm bảo: bg → photo → **canvas effect** → gradient → hook overlay. Canvas không cần z-index riêng vì DOM order xử lý stacking.

- [ ] **Verify canvas element tồn tại**

```bash
grep -c "se-effect-canvas" public/story/index.html
```
Expected: `1`

- [ ] **Commit**

```bash
git add public/story/index.html
git commit -m "feat: SE viewer — add se-effect-canvas layer"
```

---

## Task 6: effects.js — 3 hiệu ứng Canvas 2D

**Files:**
- Create: `public/story/js/effects.js`

- [ ] **Tạo file `public/story/js/effects.js`**

```js
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
```

- [ ] **Verify syntax**

```bash
node --input-type=module < public/story/js/effects.js 2>&1 | head -5 || echo "OK"
```
Expected: không có lỗi syntax (hoặc `OK`)

- [ ] **Commit**

```bash
git add public/story/js/effects.js
git commit -m "feat: effects.js — stardust, firefly, aurora Canvas 2D"
```

---

## Task 7: story/js/story.js — init + stop effect

**Files:**
- Modify: `public/story/js/story.js`

- [ ] **Thêm import `initEffect` ở đầu file**

Thêm dòng đầu tiên của file (trước `const galaxyId = ...`):

```js
import { initEffect } from './effects.js';
```

- [ ] **Init effect sau khi validate occasionConf**

Tìm đoạn:
```js
  const configChapters = occasionConf.chapters;
  const grouped        = groupByStage(items);
  const chaptersWithPhotos = configChapters.filter(ch => (grouped[ch.id] || []).length > 0);
```

Thêm ngay sau:
```js
  const stopEffect = initEffect(
    view.seEffect || 'none',
    document.getElementById('se-effect-canvas')
  );
```

- [ ] **Gọi `stopEffect()` trước redirect finale**

Tìm:
```js
  elProgressFill.style.width = '100%';
  fadeIn(elFinale);
  await wait(2800);
  window.location.replace(`/view/?galaxyId=${galaxyId}&skip_se=true`);
```

Thêm `stopEffect()` trước redirect:
```js
  elProgressFill.style.width = '100%';
  fadeIn(elFinale);
  await wait(2800);
  stopEffect();
  window.location.replace(`/view/?galaxyId=${galaxyId}&skip_se=true`);
```

- [ ] **Verify syntax**

```bash
node --check public/story/js/story.js && echo "OK"
```
Expected: `OK`

- [ ] **Commit và push**

```bash
git add public/story/js/story.js
git commit -m "feat: SE viewer — init/stop particle effect from view.seEffect"
git push
```

---

## Task 8: Manual test

- [ ] **Restart server**

- [ ] **Test chọn effect**

1. Vào `galaxy.html?galaxyId=<id_có_story>`
2. Thấy dropdown "Hiệu ứng Story" trong Customization card
3. Chọn "✨ Bụi sao" → auto-save (indicator "Saved")
4. Chọn "🌟 Đom đóm" → auto-save
5. Chọn "🌌 Aurora" → auto-save
6. Chọn "Không có" → auto-save

- [ ] **Test viewer — Stardust**

1. Set effect = "✨ Bụi sao" → mở viewer `/view/?galaxyId=...`
2. Thấy intro → tap → ảnh hiện với bụi sao li ti trôi lên phía trên
3. Hook text và gradient vẫn rõ, không bị canvas che

- [ ] **Test viewer — Firefly**

1. Set effect = "🌟 Đom đóm" → mở viewer
2. Đom đóm tím/vàng lơ lửng, glow mềm

- [ ] **Test viewer — Aurora**

1. Set effect = "🌌 Aurora" → mở viewer
2. Sóng tím/hồng uốn lượn nhẹ qua màn hình

- [ ] **Test "Không có"**

Galaxy không có effect → viewer chạy bình thường, không có canvas animation

- [ ] **Test galaxy cũ (không có seEffect field)**

Galaxy cũ trong DB chưa có `seEffect` → `view.seEffect` trả về `'none'` → viewer bình thường
