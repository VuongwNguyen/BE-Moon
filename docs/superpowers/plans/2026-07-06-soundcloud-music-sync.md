# SoundCloud Music Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin tìm nhạc SoundCloud và thêm vào thư viện nhạc nền chung; viewer stream trực tiếp qua backend resolver.

**Architecture:** Service `soundcloud.service.js` giữ OAuth token (client_credentials) và gọi API SoundCloud. BackgroundMusic có thêm `source`/`trackId`. Endpoint public `/media/musics/:id/stream` redirect về nguồn thật (ImageKit hoặc stream URL tươi của SoundCloud). `galaxy.service.js` map `music.url` sang stream endpoint cho track SoundCloud nên 4 viewer (galaxy-moon/story/aurora/fall) không cần sửa.

**Tech Stack:** Express 5, mongoose, axios (đã có sẵn). Repo không có test framework — kiểm chứng bằng curl từng bước.

**Lưu ý:** Chưa có SOUNDCLOUD_CLIENT_ID/SECRET thật — mọi verify liên quan API thật chỉ chạy được sau khi có key; trước đó verify nhánh 503.

---

### Task 1: Mở rộng model BackgroundMusic

**Files:**
- Modify: `models/backgroundMusic.js`

- [ ] **Step 1: Sửa schema**

```js
const { model, Schema } = require("mongoose");

const backgroundMusicSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    // Chỉ bắt buộc với nhạc upload; nhạc SoundCloud resolve stream URL lúc phát
    required: function () { return this.source !== "soundcloud"; },
  },
  source: {
    type: String,
    enum: ["upload", "soundcloud"],
    default: "upload",
  },
  trackId: {
    type: String,
    required: function () { return this.source === "soundcloud"; },
  },
  artist: { type: String, trim: true },
  artworkUrl: { type: String },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model("BackgroundMusic", backgroundMusicSchema, "backgroundmusics");
```

- [ ] **Step 2: Verify syntax**

Run: `node -e "require('./models/backgroundMusic'); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add models/backgroundMusic.js
git commit -m "feat: extend BackgroundMusic schema for soundcloud source"
```

---

### Task 2: SoundCloud service

**Files:**
- Create: `services/soundcloud.service.js`

- [ ] **Step 1: Viết service**

```js
// services/soundcloud.service.js — gọi SoundCloud API v2 (OAuth client_credentials)
// Docs: https://developers.soundcloud.com/docs/api/guide
const axios = require("axios");
const { errorResponse } = require("../context/responseHandle");

const API_BASE = "https://api.soundcloud.com";
const TOKEN_URL = "https://secure.soundcloud.com/oauth/token";

class SoundCloudService {
  constructor() {
    this.token = null;
    this.tokenExpiresAt = 0;
  }

  isConfigured() {
    return !!(process.env.SOUNDCLOUD_CLIENT_ID && process.env.SOUNDCLOUD_CLIENT_SECRET);
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new errorResponse({ message: "Chưa cấu hình SoundCloud API (SOUNDCLOUD_CLIENT_ID/SECRET)", statusCode: 503 });
    }
  }

  async getToken() {
    this.assertConfigured();
    if (this.token && Date.now() < this.tokenExpiresAt - 60000) return this.token;

    const body = new URLSearchParams({ grant_type: "client_credentials" });
    const res = await axios.post(TOKEN_URL, body.toString(), {
      auth: { username: process.env.SOUNDCLOUD_CLIENT_ID, password: process.env.SOUNDCLOUD_CLIENT_SECRET },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    });
    this.token = res.data.access_token;
    this.tokenExpiresAt = Date.now() + (res.data.expires_in || 3600) * 1000;
    return this.token;
  }

  async request(pathname, params = {}) {
    const token = await this.getToken();
    try {
      const res = await axios.get(`${API_BASE}${pathname}`, {
        params,
        headers: { Authorization: `OAuth ${token}` },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      // Token hết hạn giữa chừng → refresh một lần rồi thử lại
      if (err.response?.status === 401) {
        this.token = null;
        const fresh = await this.getToken();
        const res = await axios.get(`${API_BASE}${pathname}`, {
          params,
          headers: { Authorization: `OAuth ${fresh}` },
          timeout: 15000,
        });
        return res.data;
      }
      throw err;
    }
  }

  async searchTracks(q, limit = 20) {
    const data = await this.request("/tracks", { q, limit, access: "playable" });
    const tracks = Array.isArray(data) ? data : data.collection || [];
    return tracks
      .filter((t) => t.streamable !== false)
      .map((t) => ({
        trackId: String(t.id),
        title: t.title,
        artist: t.user?.username || "",
        duration: t.duration, // ms
        artworkUrl: t.artwork_url || t.user?.avatar_url || "",
        permalink: t.permalink_url,
      }));
  }

  async getStreamUrl(trackId) {
    const data = await this.request(`/tracks/${encodeURIComponent(trackId)}/streams`);
    const url = data.http_mp3_128_url || data.hls_mp3_128_url || data.preview_mp3_128_url;
    if (!url) throw new errorResponse({ message: "Track không cho phép stream", statusCode: 404 });
    return url;
  }
}

module.exports = new SoundCloudService();
```

- [ ] **Step 2: Verify nhánh chưa có key**

Run: `node -e "const s=require('./services/soundcloud.service'); s.searchTracks('test').catch(e=>console.log(e.statusCode, e.message))"`
Expected: `503 Chưa cấu hình SoundCloud API (SOUNDCLOUD_CLIENT_ID/SECRET)`

- [ ] **Step 3: Commit**

```bash
git add services/soundcloud.service.js
git commit -m "feat: soundcloud service (oauth + search + stream resolver)"
```

---

### Task 3: Endpoints search / preview / stream

**Files:**
- Modify: `services/media.service.js` (thêm `getMusicById`)
- Modify: `controllers/media.controller.js` (thêm 3 handler)
- Modify: `routes/media.routes.js` (thêm 3 route)

- [ ] **Step 1: media.service.js — thêm method trong class MediaService**

```js
  async getMusicById(id) {
    return BackgroundMusicModel.findById(id);
  }
```

- [ ] **Step 2: media.controller.js — thêm handlers**

Đầu file thêm: `const SoundCloudService = require('../services/soundcloud.service');`
Trong class thêm:

```js
  async searchSoundCloud(req, res, next) {
    const q = (req.query.q || '').trim();
    if (!q) return new successfullyResponse({ message: 'Empty query', meta: [] }).json(res);
    const tracks = await SoundCloudService.searchTracks(q);
    return new successfullyResponse({ message: 'SoundCloud search', meta: tracks }).json(res);
  }

  async previewSoundCloud(req, res, next) {
    const url = await SoundCloudService.getStreamUrl(req.params.trackId);
    return res.redirect(302, url);
  }

  async streamMusic(req, res, next) {
    const music = await MediaService.getMusicById(req.params.id);
    if (!music || music.status !== 'active') {
      return next(new errorResponse({ message: 'Music not found', statusCode: 404 }));
    }
    if (music.source === 'soundcloud') {
      const url = await SoundCloudService.getStreamUrl(music.trackId);
      return res.redirect(302, url);
    }
    return res.redirect(302, music.url);
  }
```

(Nếu `errorResponse` chưa được import trong controller thì thêm `const { errorResponse } = require('../context/responseHandle');`.)

- [ ] **Step 3: media.routes.js — thêm routes**

Trước `module.exports`:

```js
// SoundCloud
router.get('/soundcloud/search', requireAuth, requireAdmin, asyncHandler(MediaController.searchSoundCloud));
router.get('/soundcloud/preview/:trackId', requireAuth, requireAdmin, asyncHandler(MediaController.previewSoundCloud));

// Stream nhạc nền (public) — redirect về nguồn thật
router.get('/musics/:id/stream', asyncHandler(MediaController.streamMusic));
```

- [ ] **Step 4: Verify bằng curl (server dev đang chạy)**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3030/media/soundcloud/search?q=abc"   # 401 (chưa auth)
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3030/media/musics/000000000000000000000000/stream"  # 404
# Với một music upload có thật (lấy id từ GET /media/musics):
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3030/media/musics/<ID>/stream"  # 302 + url ImageKit
```

- [ ] **Step 5: Commit**

```bash
git add services/media.service.js controllers/media.controller.js routes/media.routes.js
git commit -m "feat: soundcloud search/preview + unified music stream endpoint"
```

---

### Task 4: Map URL trong galaxy view (viewer không cần sửa)

**Files:**
- Modify: `services/galaxy.service.js:79-89`

- [ ] **Step 1: Sửa populate + map**

Đổi `.populate("backgroundMusicId", "name url")` thành `.populate("backgroundMusicId", "name url source")`.

Đổi `music: galaxy.backgroundMusicId || null,` thành:

```js
      music: galaxy.backgroundMusicId
        ? {
            name: galaxy.backgroundMusicId.name,
            url: galaxy.backgroundMusicId.source === "soundcloud"
              ? `/media/musics/${galaxy.backgroundMusicId._id}/stream`
              : galaxy.backgroundMusicId.url,
          }
        : null,
```

(Nếu chỗ này trả document mongoose thì giữ nguyên hình dạng field mà viewer đọc: `view.music.url` và `view.music.name`.)

- [ ] **Step 2: Verify**

Mở một galaxy có nhạc upload cũ trên viewer — nhạc vẫn phát như trước (url ImageKit không đổi).

- [ ] **Step 3: Commit**

```bash
git add services/galaxy.service.js
git commit -m "feat: galaxy view maps soundcloud music to stream endpoint"
```

---

### Task 5: Admin UI — tìm và thêm nhạc SoundCloud

**Files:**
- Modify: `public/admin/index.html` (thêm khối search vào music modal hoặc cạnh nút Add Music)
- Modify: `public/admin/js/main.js` (logic search/preview/add)

- [ ] **Step 1: index.html — thêm nút + modal SoundCloud (cạnh `btn-add-music`, line ~275)**

```html
<button class="btn btn-primary btn-sm" id="btn-add-soundcloud">☁ SoundCloud</button>
```

Và thêm modal (cạnh `music-modal`, line ~346):

```html
<div class="modal-overlay" id="sc-modal">
  <div class="modal" style="max-width:520px">
    <h3 style="margin-bottom:14px">Tìm nhạc trên SoundCloud</h3>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <input type="text" id="sc-query" placeholder="Tên bài hát / nghệ sĩ…" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:9px 12px;color:#fff;font-size:13px;outline:none" />
      <button class="btn btn-primary" id="btn-sc-search">Tìm</button>
    </div>
    <div id="sc-results" style="max-height:320px;overflow-y:auto"></div>
    <div style="display:flex;justify-content:flex-end;margin-top:14px">
      <button class="btn btn-ghost" id="btn-sc-close">Đóng</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: main.js — thêm logic (sau khối Music modal, line ~448)**

```js
// ── SoundCloud sync ───────────────────────────────
let scPreviewAudio = null;

document.getElementById('btn-add-soundcloud').addEventListener('click', () => {
  document.getElementById('sc-modal').classList.add('open');
});
document.getElementById('btn-sc-close').addEventListener('click', () => {
  document.getElementById('sc-modal').classList.remove('open');
  if (scPreviewAudio) { scPreviewAudio.pause(); scPreviewAudio = null; }
});

async function scSearch() {
  const q = document.getElementById('sc-query').value.trim();
  const box = document.getElementById('sc-results');
  if (!q) return;
  box.innerHTML = '<div class="loading">Đang tìm…</div>';
  try {
    const data = await api(`/media/soundcloud/search?q=${encodeURIComponent(q)}`);
    const tracks = data.meta || [];
    if (!tracks.length) { box.innerHTML = '<div class="empty">Không tìm thấy bài nào.</div>'; return; }
    box.innerHTML = tracks.map((t, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">
        <img src="${esc(t.artworkUrl || '')}" onerror="this.style.visibility='hidden'" style="width:40px;height:40px;border-radius:6px;object-fit:cover;background:rgba(255,255,255,0.06)" />
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4)">${esc(t.artist)} · ${Math.round(t.duration / 60000)} phút</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="scPreview('${esc(t.trackId)}', this)">▶</button>
        <button class="btn btn-primary btn-sm" onclick="scAdd(${i})">Thêm</button>
      </div>`).join('');
    window.__scTracks = tracks;
  } catch (e) { box.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
document.getElementById('btn-sc-search').addEventListener('click', scSearch);
document.getElementById('sc-query').addEventListener('keydown', (e) => { if (e.key === 'Enter') scSearch(); });

async function scPreview(trackId, btn) {
  if (scPreviewAudio) { scPreviewAudio.pause(); scPreviewAudio = null; document.querySelectorAll('#sc-results button.btn-ghost').forEach(b => b.textContent = '▶'); if (btn.dataset.playing === trackId) { delete btn.dataset.playing; return; } }
  try {
    // <audio> không gửi được header Authorization → fetch blob rồi phát
    const res = await fetch(`/media/soundcloud/preview/${trackId}`, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) throw new Error('Preview failed');
    const blob = await res.blob();
    scPreviewAudio = new Audio(URL.createObjectURL(blob));
    scPreviewAudio.play();
    btn.textContent = '■';
    btn.dataset.playing = trackId;
    scPreviewAudio.onended = () => { btn.textContent = '▶'; delete btn.dataset.playing; };
  } catch (e) { toast(e.message, 'error'); }
}

async function scAdd(index) {
  const t = window.__scTracks[index];
  try {
    await api('/media/musics', { method: 'POST', body: JSON.stringify({
      name: t.title, artist: t.artist, source: 'soundcloud', trackId: t.trackId, artworkUrl: t.artworkUrl,
    }) });
    toast('Đã thêm từ SoundCloud!');
    loadMusics();
  } catch (e) { toast(e.message, 'error'); }
}
```

- [ ] **Step 3: Verify chưa có key**

Mở admin → Music → nút "☁ SoundCloud" → tìm bất kỳ → hiện message "Chưa cấu hình SoundCloud API…" (503) trong khung kết quả, không vỡ UI.

- [ ] **Step 4: Commit**

```bash
git add public/admin/index.html public/admin/js/main.js
git commit -m "feat: admin UI search + add music from SoundCloud"
```

---

### Task 6: galaxy-setup tab Nhạc — preview qua stream endpoint

**Files:**
- Modify: `public/portal/js/galaxy-setup.js:243` (playBtn onclick) và hàm `togglePreviewMusic`

- [ ] **Step 1: Đổi nguồn preview**

Dòng `playBtn.onclick = (e) => { e.stopPropagation(); togglePreviewMusic(m.url, playBtn); };` đổi thành:

```js
    playBtn.onclick = (e) => { e.stopPropagation(); togglePreviewMusic(`/media/musics/${m._id}/stream`, playBtn); };
```

(`togglePreviewMusic` giữ nguyên — nhận url, so sánh `currentAudio.src.includes(url)` vẫn đúng vì url giờ là path duy nhất theo id.)

- [ ] **Step 2: Verify**

Mở galaxy-setup tab Nhạc → bấm ▶ trên nhạc upload cũ → vẫn phát (302 redirect). Hiện artist nếu muốn: `info.appendChild(el('div','music-artist', m.artist||''))` — tùy chọn, bỏ qua nếu CSS chưa có.

- [ ] **Step 3: Commit**

```bash
git add public/portal/js/galaxy-setup.js
git commit -m "feat: galaxy-setup music preview via unified stream endpoint"
```

---

### Task 7: .env placeholder + verify tổng

- [ ] **Step 1: Thêm vào `.env` và `.env.example`**

```
# SoundCloud — đăng ký app tại https://soundcloud.com/you/apps
SOUNDCLOUD_CLIENT_ID=
SOUNDCLOUD_CLIENT_SECRET=
```

- [ ] **Step 2: Verify tổng khi CHƯA có key**

1. `yarn dev` chạy sạch, không crash.
2. `GET /media/musics` vẫn trả nhạc cũ.
3. Viewer galaxy có nhạc cũ vẫn phát.
4. Admin search SoundCloud → thông báo 503 gọn.

- [ ] **Step 3: Verify khi CÓ key (sau khi user đăng ký)**

1. Search trả kết quả thật.
2. Preview phát được.
3. Thêm track → xuất hiện trong bảng music + tab Nhạc galaxy-setup.
4. Chọn làm nhạc nền → mở viewer nghe được.

- [ ] **Step 4: Commit cuối**

```bash
git add .env.example
git commit -m "chore: soundcloud env placeholders"
```
