# Merge FE into BE — Design Spec

**Date:** 2026-04-23  
**Status:** Approved

## Overview

Gom toàn bộ frontend (galaxy-moon) vào backend (BE-Moon), serve static files qua Express. Sau khi xong chỉ deploy 1 nơi duy nhất trên Render. Repo galaxy-moon được archive.

---

## Folder Structure

```
BE-Moon/public/
├── shared/
│   ├── css/          ← CSS dùng chung giữa các feature (hiện để trống)
│   └── js/           ← JS utilities dùng chung (hiện để trống)
└── galaxy-moon/
    ├── index.html
    ├── js/
    │   └── script.js
    ├── css/
    │   └── style.css
    └── assets/
        └── music/
            ├── natt.mp3
            ├── nbdlc.mp3
            └── tmlb.mp3
```

**URL:** `be-moon.onrender.com/galaxy-moon/?name=moon`

---

## Thay đổi cần thực hiện

### 1. Tạo folder structure

Tạo các thư mục:
- `BE-Moon/public/shared/css/`
- `BE-Moon/public/shared/js/`
- `BE-Moon/public/galaxy-moon/js/`
- `BE-Moon/public/galaxy-moon/css/`
- `BE-Moon/public/galaxy-moon/assets/music/`

### 2. Copy files từ galaxy-moon

| Source (galaxy-moon/) | Destination (BE-Moon/public/galaxy-moon/) |
|----------------------|------------------------------------------|
| `index.html` | `index.html` |
| `script.js` | `js/script.js` |
| `style.css` | `css/style.css` |
| `natt.mp3` | `assets/music/natt.mp3` |
| `nbdlc.mp3` | `assets/music/nbdlc.mp3` |
| `tmlb.mp3` | `assets/music/tmlb.mp3` |

### 3. Cập nhật references trong index.html

| Trước | Sau |
|-------|-----|
| `src="./script.js"` | `src="./js/script.js"` |
| `href` hoặc inline CSS | `./css/style.css` (nếu có link tag) |
| `new Audio('./natt.mp3')` | `new Audio('./assets/music/natt.mp3')` |

### 4. Cập nhật API URL trong script.js

```js
// Trước (absolute URL)
fetch("https://be-moon.onrender.com/gallary/items?name=...")

// Sau (relative URL)
fetch("/gallary/items?name=...")
```

### 5. Xóa placeholder index.html cũ

`BE-Moon/public/index.html` hiện là placeholder — xóa đi vì FE nằm trong `galaxy-moon/`.

### 6. Express config

`express.static('public')` đã có sẵn trong `index.js:23`, không cần thay đổi.

---

## URL sau khi deploy

| Trước | Sau |
|-------|-----|
| `vuongwnguyen.github.io/galaxy-moon/?name=moon` | `be-moon.onrender.com/galaxy-moon/?name=moon` |
| `be-moon.onrender.com/gallary/items` | Giữ nguyên |

---

## Post-implementation

- Archive repo `galaxy-moon` trên GitHub
- Xóa `BE-Moon/public/index.html` (placeholder cũ)
