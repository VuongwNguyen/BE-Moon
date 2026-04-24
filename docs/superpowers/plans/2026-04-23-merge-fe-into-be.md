# Merge FE into BE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gom toàn bộ frontend galaxy-moon vào BE-Moon/public/ để deploy 1 nơi duy nhất trên Render.

**Architecture:** Express đã có `express.static('public')` sẵn. Copy FE files vào `public/galaxy-moon/` với folder structure rõ ràng (js/, css/, assets/music/). Cập nhật các path references trong index.html và đổi API URL từ absolute sang relative trong script.js.

**Tech Stack:** Node.js, Express 5, Vanilla JS, static file serving

---

## File Map

| Source (galaxy-moon/) | Destination (BE-Moon/public/galaxy-moon/) |
|----------------------|------------------------------------------|
| `index.html` | `index.html` |
| `script.js` | `js/script.js` |
| `style.css` | `css/style.css` |
| `natt.mp3` | `assets/music/natt.mp3` |
| `nbdlc.mp3` | `assets/music/nbdlc.mp3` |
| `tmlb.mp3` | `assets/music/tmlb.mp3` |
| *(new empty dirs)* | `shared/css/`, `shared/js/` |

**Files cần sửa sau khi copy:**
- `public/galaxy-moon/index.html` — đổi 3 path refs (style.css, script.js, natt.mp3)
- `public/galaxy-moon/js/script.js` — đổi API URL absolute → relative

---

## Task 1: Tạo Folder Structure và Copy Files

**Files:**
- Create: `BE-Moon/public/galaxy-moon/js/`
- Create: `BE-Moon/public/galaxy-moon/css/`
- Create: `BE-Moon/public/galaxy-moon/assets/music/`
- Create: `BE-Moon/public/shared/css/`
- Create: `BE-Moon/public/shared/js/`

- [ ] **Step 1: Tạo folder structure**

```bash
mkdir -p /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public/galaxy-moon/js
mkdir -p /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public/galaxy-moon/css
mkdir -p /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public/galaxy-moon/assets/music
mkdir -p /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public/shared/css
mkdir -p /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public/shared/js
```

- [ ] **Step 2: Tạo .gitkeep cho shared/ folders (để git track folder rỗng)**

```bash
touch /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public/shared/css/.gitkeep
touch /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public/shared/js/.gitkeep
```

- [ ] **Step 3: Copy tất cả FE files**

```bash
GALAXY=/home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/galaxy-moon
BE_PUBLIC=/home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public/galaxy-moon

cp $GALAXY/index.html $BE_PUBLIC/index.html
cp $GALAXY/script.js  $BE_PUBLIC/js/script.js
cp $GALAXY/style.css  $BE_PUBLIC/css/style.css
cp $GALAXY/natt.mp3   $BE_PUBLIC/assets/music/natt.mp3
cp $GALAXY/nbdlc.mp3  $BE_PUBLIC/assets/music/nbdlc.mp3
cp $GALAXY/tmlb.mp3   $BE_PUBLIC/assets/music/tmlb.mp3
```

- [ ] **Step 4: Verify files đã được copy**

```bash
find /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public -type f
```

Expected output:
```
.../public/shared/css/.gitkeep
.../public/shared/js/.gitkeep
.../public/galaxy-moon/index.html
.../public/galaxy-moon/js/script.js
.../public/galaxy-moon/css/style.css
.../public/galaxy-moon/assets/music/natt.mp3
.../public/galaxy-moon/assets/music/nbdlc.mp3
.../public/galaxy-moon/assets/music/tmlb.mp3
```

- [ ] **Step 5: Commit**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
git add public/
git commit -m "chore: copy galaxy-moon FE files into public/ with organized structure"
```

---

## Task 2: Cập nhật Path References trong index.html

**Files:**
- Modify: `BE-Moon/public/galaxy-moon/index.html`

Có 3 path cần đổi:
1. `line 9`: `./style.css` → `./css/style.css`
2. `line 116`: `./script.js` → `./js/script.js`
3. `line 126`: `./natt.mp3` → `./assets/music/natt.mp3`

- [ ] **Step 1: Đổi path style.css (line 9)**

Tìm dòng:
```html
<link rel="stylesheet" href="./style.css" />
```
Đổi thành:
```html
<link rel="stylesheet" href="./css/style.css" />
```

- [ ] **Step 2: Đổi path script.js (line 116)**

Tìm dòng:
```html
<script type="module" src="./script.js"></script>
```
Đổi thành:
```html
<script type="module" src="./js/script.js"></script>
```

- [ ] **Step 3: Đổi path natt.mp3 (line 126)**

Tìm dòng:
```js
this.audio = new Audio('./natt.mp3');
```
Đổi thành:
```js
this.audio = new Audio('./assets/music/natt.mp3');
```

- [ ] **Step 4: Verify 3 thay đổi**

```bash
grep -n "style.css\|script.js\|natt.mp3" /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public/galaxy-moon/index.html
```

Expected output:
```
9:    <link rel="stylesheet" href="./css/style.css" />
116:    <script type="module" src="./js/script.js"></script>
126:                this.audio = new Audio('./assets/music/natt.mp3');
```

- [ ] **Step 5: Commit**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
git add public/galaxy-moon/index.html
git commit -m "fix: update asset paths in index.html to match new folder structure"
```

---

## Task 3: Đổi API URL sang Relative trong script.js

**Files:**
- Modify: `BE-Moon/public/galaxy-moon/js/script.js:1516`

- [ ] **Step 1: Đổi API URL từ absolute sang relative**

Tìm dòng (line 1516):
```js
const res = await fetch(`https://be-moon.onrender.com/gallary/items?name=${encodeURIComponent(name)}`);
```
Đổi thành:
```js
const res = await fetch(`/gallary/items?name=${encodeURIComponent(name)}`);
```

- [ ] **Step 2: Verify thay đổi**

```bash
grep -n "gallary/items" /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public/galaxy-moon/js/script.js
```

Expected output:
```
1516:    const res = await fetch(`/gallary/items?name=${encodeURIComponent(name)}`);
```

- [ ] **Step 3: Commit**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
git add public/galaxy-moon/js/script.js
git commit -m "fix: use relative API URL in script.js"
```

---

## Task 4: Xóa Placeholder và Push

**Files:**
- Delete: `BE-Moon/public/index.html` (placeholder cũ, rỗng)

- [ ] **Step 1: Xóa placeholder index.html**

```bash
rm /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public/index.html
```

- [ ] **Step 2: Verify cấu trúc public/ cuối cùng**

```bash
find /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public -type f | sort
```

Expected:
```
.../public/galaxy-moon/assets/music/natt.mp3
.../public/galaxy-moon/assets/music/nbdlc.mp3
.../public/galaxy-moon/assets/music/tmlb.mp3
.../public/galaxy-moon/css/style.css
.../public/galaxy-moon/index.html
.../public/galaxy-moon/js/script.js
.../public/shared/css/.gitkeep
.../public/shared/js/.gitkeep
```

- [ ] **Step 3: Test local**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
npm run dev
```

Mở browser: `http://localhost:3030/galaxy-moon/?name=moon`

Expected: galaxy scene load bình thường, nhạc chạy, heart cloud hiện sau khi click hành tinh.

- [ ] **Step 4: Commit và push**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
git add -A
git commit -m "chore: remove old public/index.html placeholder"
git push
```
