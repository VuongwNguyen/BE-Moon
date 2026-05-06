# SE Particle Effects Design

**Date:** 2026-05-06
**Status:** Approved

## Goal

Thêm 3 hiệu ứng Canvas 2D tuỳ chọn vào SE viewer: Stardust, Firefly, Aurora. User chọn trong galaxy.html (customization card). Viewer tự init đúng effect khi load.

---

## 1. Backend — Galaxy Model + Service

### models/galaxy.js
Thêm field:
```js
seEffect: {
  type: String,
  enum: ['none', 'stardust', 'firefly', 'aurora'],
  default: 'none',
},
```

### services/galaxy.service.js — getGalaxyView
Thêm vào return object:
```js
seEffect: galaxy.seEffect || 'none',
```

### services/galaxy.service.js — updateGalaxy
`seEffect` được phép update cho tất cả user (không bị delete như `template`). Không cần thay đổi gì vì `data` được merge trực tiếp vào galaxy — chỉ cần đảm bảo không bị filter ra.

---

## 2. Portal — galaxy.html

### CSS
Không cần CSS mới — dùng style inline giống `templateSelect` / `themeSelect` hiện tại.

### HTML
Thêm vào customization card, sau `#templateSection`:

```html
<div id="effectSection" style="margin-bottom: 16px;">
  <label style="display:block;font-size:12px;color:var(--text-sub);margin-bottom:6px;">Hiệu ứng Story</label>
  <select id="effectSelect" style="width:100%;padding:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:'Jost',sans-serif;font-size:13px;">
    <option value="none">Không có</option>
    <option value="stardust">✨ Bụi sao</option>
    <option value="firefly">🌟 Đom đóm</option>
    <option value="aurora">🌌 Aurora</option>
  </select>
</div>
```

Đặt ngay sau `#templateSection` div.

---

## 3. Portal — galaxy-custom.js

### loadGalaxyCustomization
Sau khi set `themeSelect.value`, thêm:
```js
document.getElementById('effectSelect').value = data.seEffect || 'none';
```

### Auto-save
Thêm event listener giống `themeSelect`:
```js
document.getElementById('effectSelect').addEventListener('change', scheduleSave);
```

### performSave
`performSave` xây payload thủ công — cần thêm `seEffect` vào payload:
```js
payload.seEffect = document.getElementById('effectSelect').value || 'none';
```
Thêm dòng này sau khi build `payload` object, trước `if (user.role === 'admin')` block.

---

## 4. SE Viewer — index.html

### Thêm canvas element trong `#se-photo`
Sau `<div id="se-photo-gradient"></div>`:
```html
<canvas id="se-effect-canvas" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;"></canvas>
```

Z-index stack trong `#se-photo`:
- `#se-photo-bg` — blurred background (no z-index needed, rendered first)
- `#se-photo-img` — photo (no z-index needed)
- `#se-effect-canvas` — z-index:1, above photo
- `#se-photo-gradient` — phải đặt SAU canvas trong DOM để đè lên
- `#se-hook-overlay` — trên cùng

**Lưu ý:** Đặt `#se-effect-canvas` TRƯỚC `#se-photo-gradient` và `#se-hook-overlay` trong DOM để gradient vẫn đè lên effect.

---

## 5. SE Viewer — effects.js (new file)

`public/story/js/effects.js` — ES module export một hàm `initEffect(name, canvas)`.

### Stardust
- ~120 particles, size 0.3–1.5px, màu `rgba(255,240,220,α)`
- Drift lên (`vy` âm), `vx` nhỏ
- Flicker qua `sin(phase)`, alpha 0.2–0.8
- Wrap: khi `y < 0` thì reset về bottom

### Firefly  
- 22 orbs, radius 2.5–6px
- Màu: 50% tím `(180,140,255)`, 50% vàng `(255,200,100)`
- Movement: drift + sine wave
- Glow: `createRadialGradient` với 3 color stops (center → transparent)
- Pulse: alpha = `0.45 + 0.55 * sin(t * speed + phase)`

### Aurora
- 3 bands, mỗi band là path sine wave
- Màu HSL: hue 200, 260, 300 (xanh-tím-hồng)
- `globalAlpha`: 0.18–0.32
- Uốn lượn theo thời gian qua `sin(t + offset)`

### API
```js
export function initEffect(name, canvas) {
  if (!name || name === 'none') return () => {};
  // resize canvas to match parent
  // start rAF loop
  // return stop function: () => cancelAnimationFrame(rafId)
}
```

---

## 6. SE Viewer — story.js

Sau khi validate `occasionConf`, thêm:
```js
import { initEffect } from './effects.js';
// ...
const stopEffect = initEffect(view.seEffect || 'none', document.getElementById('se-effect-canvas'));
```

Gọi `stopEffect()` khi redirect về Fall/Galaxy (trước `window.location.replace`).

---

## Out of Scope
- Effect preview trong galaxy.html (chỉ dropdown text)
- Combine 2+ effects cùng lúc
- Effect intensity settings
- Effect trên intro/finale screen (chỉ trong photo playback)
