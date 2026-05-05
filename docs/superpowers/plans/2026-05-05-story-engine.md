# Story Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Story Engine — Couple Story với 5 occasions, guided creation flow trong portal, SE viewer phát chapter-by-chapter rồi chuyển sang Fall/Galaxy.

**Architecture:** Story config tĩnh (JSON), Galaxy nhận storyType/occasion/chapters, Gallery nhận stage/order. Portal có guided setup flow khi tạo mới. SE viewer là template riêng (`public/story/`) phát story rồi `window.location.replace` sang Fall/Galaxy.

**Tech Stack:** Node.js/Express, Mongoose, Vanilla JS (ES modules), HTML/CSS

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `public/shared/story-config.json` | Định nghĩa story types, occasions, chapters, hooks |
| Modify | `models/galaxy.js` | Thêm storyType, occasion, chapters fields |
| Modify | `models/gallery.js` | Thêm stage, order fields |
| Modify | `services/gallery.service.js` | Sort by stage+order khi có stages; lưu stage khi upload |
| Modify | `controllers/gallery.controller.js` | Nhận stage từ upload request |
| Modify | `public/portal/js/main.js` | Redirect sang setup sau khi tạo galaxy |
| Modify | `public/portal/galaxy.html` | Thêm story setup UI (wizard + chapter sections) |
| Modify | `public/portal/js/galaxy-custom.js` | Guided chapter flow logic |
| Create | `public/story/index.html` | SE viewer HTML shell |
| Create | `public/story/js/story.js` | SE viewer logic — chapters + finale transition |
| Modify | `index.js` | Serve SE cho galaxies có storyType; register /story/ static |

---

## Task 1: Story Config JSON

**Files:**
- Create: `public/shared/story-config.json`

- [ ] **Tạo file story-config.json với đầy đủ 5 occasions của Couple Story**

```json
{
  "couple": {
    "label": "Couple Story",
    "occasions": {
      "anniversary": {
        "label": "Ky niem",
        "chapters": [
          {
            "id": "intro",
            "label": "Khoi dau",
            "required": true,
            "photoCount": { "min": 1, "max": 1 },
            "hooks": [
              "Chung ta bat dau tu mot ngay rat binh thuong...",
              "Anh khong nghi moi thu lai bat dau nhu the nay..."
            ]
          },
          {
            "id": "memory",
            "label": "Ky uc",
            "required": true,
            "photoCount": { "min": 1, "max": 5 },
            "hooks": [
              "Roi nhung ngay binh thuong tro thanh nhung ngay khong the quen...",
              "Co nhung khoanh khac minh chang chup lai, nhung van nho mai..."
            ]
          },
          {
            "id": "highlight",
            "label": "Khoanh khac dac biet",
            "required": false,
            "photoCount": { "min": 1, "max": 2 },
            "hooks": [
              "Va co mot khoanh khac anh nho mai...",
              "Neu phai chon mot ngay de nho, anh se chon ngay nay..."
            ]
          },
          {
            "id": "ending",
            "label": "Ket",
            "required": true,
            "photoCount": { "min": 1, "max": 1 },
            "hooks": [
              "Cam on vi da o day, va vi tat ca nhung dieu do...",
              "Anh khong can nhieu hon. Chi can em o day la du..."
            ]
          }
        ]
      },
      "confession": {
        "label": "To tinh",
        "chapters": [
          { "id": "intro",     "label": "Truoc khi gap em",        "required": true,  "photoCount": { "min": 1, "max": 1 }, "hooks": ["Truoc khi gap em, anh khong nghi dieu nay se xay ra..."] },
          { "id": "memory",    "label": "Nhung ngay ben em",       "required": true,  "photoCount": { "min": 1, "max": 5 }, "hooks": ["Roi em xuat hien. Va moi thu khac di..."] },
          { "id": "highlight", "label": "Khoanh khac anh nhan ra", "required": false, "photoCount": { "min": 1, "max": 1 }, "hooks": ["Co mot khoanh khac anh biet minh da thich em tu lau..."] },
          { "id": "ending",    "label": "Dieu anh muon noi",       "required": true,  "photoCount": { "min": 1, "max": 1 }, "hooks": ["Va bay gio, anh chi muon noi voi em mot dieu..."] }
        ]
      },
      "missing": {
        "label": "Nho nhau",
        "chapters": [
          { "id": "intro",     "label": "Khi xa nhau",               "required": true,  "photoCount": { "min": 1, "max": 1 }, "hooks": ["Co nhung ngay xa nhau, anh lai nho ve..."] },
          { "id": "memory",    "label": "Nhung ngay da co",          "required": true,  "photoCount": { "min": 1, "max": 5 }, "hooks": ["Nhung ngay minh o ben nhau, anh da khong biet tran trong..."] },
          { "id": "highlight", "label": "Khoanh khac anh nho nhat", "required": false, "photoCount": { "min": 1, "max": 2 }, "hooks": ["Neu duoc chon mot ky uc de giu lai, anh se chon cai nay..."] },
          { "id": "ending",    "label": "Gui den em",                "required": true,  "photoCount": { "min": 1, "max": 1 }, "hooks": ["Anh nho em. Chi vay thoi, nhung nhieu lam..."] }
        ]
      },
      "proposal": {
        "label": "Cau hon",
        "chapters": [
          { "id": "intro",     "label": "Ngay dau tien",           "required": true,  "photoCount": { "min": 1, "max": 1 }, "hooks": ["Moi thu bat dau tu mot ngay anh khong bao gio quen..."] },
          { "id": "memory",    "label": "Hanh trinh cua chung ta", "required": true,  "photoCount": { "min": 1, "max": 5 }, "hooks": ["Chung ta da di qua rat nhieu thu cung nhau..."] },
          { "id": "highlight", "label": "Ly do",                   "required": false, "photoCount": { "min": 1, "max": 2 }, "hooks": ["Va day la ly do anh biet em la nguoi anh muon o ben mai mai..."] },
          { "id": "ending",    "label": "Cau hoi",                 "required": true,  "photoCount": { "min": 1, "max": 1 }, "hooks": ["Em co muon cung anh viet tiep cau chuyen nay khong?"] }
        ]
      },
      "birthday": {
        "label": "Sinh nhat nguoi yeu",
        "chapters": [
          { "id": "intro",     "label": "Ngay hom nay",              "required": true,  "photoCount": { "min": 1, "max": 1 }, "hooks": ["Hom nay la ngay cua em. Va anh muon ke em nghe..."] },
          { "id": "memory",    "label": "Mot nam qua",               "required": true,  "photoCount": { "min": 1, "max": 5 }, "hooks": ["Mot nam qua, chung ta da co nhung dieu nay..."] },
          { "id": "highlight", "label": "Dieu anh thich nhat o em", "required": false, "photoCount": { "min": 1, "max": 2 }, "hooks": ["Nhung co mot dieu anh thich nhat o em, do la..."] },
          { "id": "ending",    "label": "Loi chuc",                  "required": true,  "photoCount": { "min": 1, "max": 1 }, "hooks": ["Chuc em sinh nhat vui ve. Cam on vi da la em..."] }
        ]
      }
    }
  }
}
```

> **Note:** Hooks dùng tiếng Việt không dấu để tránh encoding issues trong JSON file. Template sẽ hiển thị đúng khi fetch về browser.

- [ ] **Verify file hợp lệ JSON**

```bash
node -e "require('./public/shared/story-config.json'); console.log('OK')"
```
Expected: `OK`

- [ ] **Commit**

```bash
git add public/shared/story-config.json
git commit -m "feat: add story-config.json — Couple Story 5 occasions"
```

---

## Task 2: Galaxy Model — thêm storyType, occasion, chapters

**Files:**
- Modify: `models/galaxy.js`

- [ ] **Thêm 3 field vào galaxySchema**

Mở `models/galaxy.js`. Sau dòng khai báo field `template`, thêm:

```js
  storyType: {
    type: String,
    enum: ['couple'],
    default: null,
  },
  occasion: {
    type: String,
    default: null,
  },
  chapters: {
    type: [
      {
        id:       { type: String },
        hookText: { type: String, default: null },
      }
    ],
    default: [],
  },
```

- [ ] **Verify model load không lỗi**

```bash
node -e "require('./models/galaxy'); console.log('OK')"
```
Expected: `OK`

- [ ] **Commit**

```bash
git add models/galaxy.js
git commit -m "feat: galaxy model — add storyType, occasion, chapters"
```

---

## Task 3: Gallery Model — thêm stage, order

**Files:**
- Modify: `models/gallery.js`

- [ ] **Thêm 2 field vào gallerySchema**

Mở `models/gallery.js`. Sau dòng khai báo field `fileId`, thêm:

```js
  stage: {
    type: String,
    default: null,
  },
  order: {
    type: Number,
    default: 0,
  },
```

- [ ] **Verify model load không lỗi**

```bash
node -e "require('./models/gallery'); console.log('OK')"
```
Expected: `OK`

- [ ] **Commit**

```bash
git add models/gallery.js
git commit -m "feat: gallery model — add stage, order"
```

---

## Task 4: Gallery Service — sort by stage+order và lưu stage khi upload

**Files:**
- Modify: `services/gallery.service.js`

- [ ] **Cập nhật method `createGallery` để lưu stage và order**

Thay thế toàn bộ method `createGallery` (hiện tại dùng forEach async không đúng):

```js
  async createGallery({ galaxyId, title, description, stage, uploadedFiles = [] }) {
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      await GalleryModel.create({
        galaxyId,
        title,
        description,
        imageUrl: file.url,
        fileId: file.fileId || null,
        stage: stage || null,
        order: i,
      });
    }
    return;
  }
```

- [ ] **Cập nhật method `getGalleryItems` để sort theo stage+order**

Thay thế toàn bộ method `getGalleryItems`:

```js
  async getGalleryItems({ galaxyId }) {
    const galleryItems = await GalleryModel.find({ galaxyId, status: 'active' })
      .sort({ createdAt: -1 });

    if (!galleryItems) {
      throw new errorResponse({ message: 'error while fetching gallery items', statusCode: 404 });
    }

    const STAGE_ORDER = { intro: 0, memory: 1, highlight: 2, ending: 3 };
    const hasStages = galleryItems.some(item => item.stage);
    if (hasStages) {
      galleryItems.sort((a, b) => {
        const sa = STAGE_ORDER[a.stage] ?? 99;
        const sb = STAGE_ORDER[b.stage] ?? 99;
        if (sa !== sb) return sa - sb;
        return (a.order || 0) - (b.order || 0);
      });
    }

    return galleryItems;
  }
```

- [ ] **Verify service load không lỗi**

```bash
node -e "require('./services/gallery.service'); console.log('OK')"
```
Expected: `OK`

- [ ] **Commit**

```bash
git add services/gallery.service.js
git commit -m "feat: gallery service — sort by stage+order, save stage on upload"
```

---

## Task 5: Gallery Controller — nhận stage từ upload request

**Files:**
- Modify: `controllers/gallery.controller.js`

- [ ] **Thêm stage vào destructuring từ req.body**

Mở `controllers/gallery.controller.js`. Tìm dòng:

```js
const { galaxyId, title, description } = req.body;
```

Thay bằng:

```js
const { galaxyId, title, description, stage } = req.body;
```

- [ ] **Truyền stage vào createGallery**

Tìm dòng:

```js
await GalleryService.createGallery({ galaxyId, title, description, uploadedFiles });
```

Thay bằng:

```js
await GalleryService.createGallery({ galaxyId, title, description, stage, uploadedFiles });
```

- [ ] **Commit**

```bash
git add controllers/gallery.controller.js
git commit -m "feat: gallery controller — accept stage in upload"
```

---

## Task 6: Portal main.js — redirect sang setup sau khi tạo

**Files:**
- Modify: `public/portal/js/main.js`

- [ ] **Sau khi tạo galaxy thành công, redirect sang guided setup**

Mở `public/portal/js/main.js`. Trong click handler `btn-create`, tìm đoạn:

```js
    closeModal();
    loadGalaxies();
```

Thay bằng:

```js
    const newId = data.meta?._id || data.meta?.id;
    if (newId) {
      window.location.href = `/portal/galaxy.html?galaxyId=${newId}&setup=true`;
    } else {
      closeModal();
      loadGalaxies();
    }
```

- [ ] **Commit**

```bash
git add public/portal/js/main.js
git commit -m "feat: portal — redirect to story setup after galaxy creation"
```

---

## Task 7: Portal galaxy.html — thêm Story Setup UI

**Files:**
- Modify: `public/portal/galaxy.html`

- [ ] **Thêm CSS vào thẻ style trong head**

Tìm thẻ `<style>` trong `<head>` của `public/portal/galaxy.html` và append vào cuối:

```css
/* ── Story Setup ── */
.setup-step { width: 100%; }
.story-type-btn {
  display: block; width: 100%; padding: 16px 20px;
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: 12px; color: var(--text); font-size: 1em;
  cursor: pointer; text-align: left; font-family: inherit;
  margin-bottom: 10px;
}
.story-type-btn:hover { border-color: var(--accent, #8b5cf6); }
.occasion-btn {
  display: block; width: 100%; padding: 14px 18px;
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: 10px; color: var(--text); font-size: 0.95em;
  cursor: pointer; text-align: left; font-family: inherit;
  margin-bottom: 8px;
}
.occasion-btn:hover { border-color: var(--accent, #8b5cf6); }
.chapter-hook-area {
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: 10px; padding: 14px; margin-bottom: 14px;
}
.chapter-hook-label {
  font-size: 0.75em; color: var(--text-sub); margin-bottom: 6px;
}
.chapter-hook-textarea {
  width: 100%; background: transparent; border: none;
  color: var(--text); font-size: 0.9em; font-family: inherit;
  resize: none; outline: none; min-height: 56px;
}
.chapter-upload-zone {
  border: 2px dashed var(--border); border-radius: 10px;
  padding: 22px; text-align: center; cursor: pointer;
  margin-bottom: 14px; color: var(--text-sub); font-size: 0.88em;
}
.chapter-upload-zone:hover { border-color: var(--accent, #8b5cf6); }
.chapter-photos-preview { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.chapter-photo-thumb { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; }
.btn-next-chapter {
  width: 100%; padding: 13px; background: var(--accent, #8b5cf6);
  border: none; border-radius: 10px; color: #fff;
  font-size: 0.95em; cursor: pointer; font-family: inherit;
}
.btn-next-chapter:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-skip-chapter {
  width: 100%; padding: 10px; background: none;
  border: 1px solid var(--border); border-radius: 10px;
  color: var(--text-sub); font-size: 0.88em;
  cursor: pointer; margin-top: 8px; font-family: inherit;
}
.setup-back-btn {
  background: none; border: none; color: var(--text-sub);
  cursor: pointer; margin-bottom: 16px; font-size: 0.88em;
  font-family: inherit; padding: 0;
}
```

- [ ] **Thêm Story Setup HTML vào body — đặt trước section customization**

Tìm dòng `<div id="customization-section"` hoặc section đầu tiên của main content. Thêm đoạn sau VÀO TRƯỚC nó:

```html
<!-- ── Story Setup ── -->
<div id="story-setup-section" style="display:none;padding:16px;">

  <div id="step-type" class="setup-step">
    <h2 style="font-size:1.2em;margin-bottom:16px;color:var(--text)">Chọn loại câu chuyện</h2>
    <button class="story-type-btn" data-type="couple">
      💑 Couple Story
    </button>
  </div>

  <div id="step-occasion" class="setup-step" style="display:none;">
    <button class="setup-back-btn" id="btn-back-type">← Quay lại</button>
    <h2 style="font-size:1.2em;margin-bottom:16px;color:var(--text)">Đây là dịp gì?</h2>
    <div id="occasion-list"></div>
  </div>

  <div id="step-chapters" class="setup-step" style="display:none;">
    <button class="setup-back-btn" id="btn-back-occasion">← Quay lại</button>
    <div id="chapter-progress" style="font-size:0.8em;color:var(--text-sub);margin-bottom:10px;"></div>
    <div id="chapter-content"></div>
  </div>

</div>
<!-- ── End Story Setup ── -->
```

- [ ] **Commit**

```bash
git add public/portal/galaxy.html
git commit -m "feat: portal galaxy — add story setup UI skeleton"
```

---

## Task 8: Portal galaxy-custom.js — Guided chapter flow logic

**Files:**
- Modify: `public/portal/js/galaxy-custom.js`

- [ ] **Thêm toàn bộ Story Setup logic vào cuối file**

Append vào cuối `public/portal/js/galaxy-custom.js`:

```js
// ── Story Setup Flow ──────────────────────────────────────────────────────────
(async function initStorySetup() {
  const params   = new URLSearchParams(location.search);
  const galaxyId = params.get('galaxyId');
  const isSetup  = params.get('setup') === 'true';
  const token    = localStorage.getItem('token');

  if (!galaxyId || !isSetup) return;

  const configRes  = await fetch('/shared/story-config.json');
  const STORY_CONFIG = await configRes.json();

  const galaxyRes = await fetch(`/galaxies/${galaxyId}`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  const galaxy = galaxyRes.ok ? (await galaxyRes.json()).meta : null;

  // Galaxy đã setup rồi thì bỏ qua
  if (galaxy && galaxy.storyType) return;

  const setupSection = document.getElementById('story-setup-section');
  if (!setupSection) return;
  setupSection.style.display = 'block';

  // Ẩn phần customization bình thường trong lúc setup
  const customSection = document.getElementById('customization-section');
  if (customSection) customSection.style.display = 'none';

  let selectedType      = null;
  let selectedOccasion  = null;
  let currentChapterIdx = 0;
  const chapterFiles    = {};   // { chapterId: File[] }
  const chapterHooks    = {};   // { chapterId: string }

  const stepType     = document.getElementById('step-type');
  const stepOccasion = document.getElementById('step-occasion');
  const stepChapters = document.getElementById('step-chapters');
  const occasionList = document.getElementById('occasion-list');
  const chapterProg  = document.getElementById('chapter-progress');
  const chapterContent = document.getElementById('chapter-content');

  function getChapters() {
    return STORY_CONFIG[selectedType].occasions[selectedOccasion].chapters;
  }

  // Step 1 — Story Type
  document.querySelectorAll('.story-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedType = btn.dataset.type;
      renderOccasions();
      stepType.style.display = 'none';
      stepOccasion.style.display = 'block';
    });
  });

  // Step 2 — Occasion
  function renderOccasions() {
    occasionList.replaceChildren();
    const occasions = STORY_CONFIG[selectedType].occasions;
    Object.entries(occasions).forEach(([id, occ]) => {
      const btn = document.createElement('button');
      btn.className = 'occasion-btn';
      btn.textContent = occ.label;
      btn.addEventListener('click', () => {
        selectedOccasion  = id;
        currentChapterIdx = 0;
        Object.keys(chapterFiles).forEach(k => delete chapterFiles[k]);
        Object.keys(chapterHooks).forEach(k => delete chapterHooks[k]);
        stepOccasion.style.display = 'none';
        stepChapters.style.display = 'block';
        renderChapter(currentChapterIdx);
      });
      occasionList.appendChild(btn);
    });
  }

  document.getElementById('btn-back-type').addEventListener('click', () => {
    stepOccasion.style.display = 'none';
    stepType.style.display = 'block';
  });

  document.getElementById('btn-back-occasion').addEventListener('click', () => {
    stepChapters.style.display = 'none';
    stepOccasion.style.display = 'block';
  });

  // Step 3 — Chapters
  function renderChapter(idx) {
    const chapters = getChapters();
    const ch       = chapters[idx];
    const isLast   = idx === chapters.length - 1;

    chapterProg.textContent = `Chương ${idx + 1} / ${chapters.length}`;
    chapterContent.replaceChildren();

    // Title
    const titleEl = document.createElement('h2');
    titleEl.style.cssText = 'font-size:1.1em;margin-bottom:8px;color:var(--text)';
    titleEl.textContent = ch.label;
    if (!ch.required) {
      const optTag = document.createElement('span');
      optTag.style.cssText = 'font-size:0.72em;color:var(--text-sub);margin-left:8px';
      optTag.textContent = '(không bắt buộc)';
      titleEl.appendChild(optTag);
    }
    chapterContent.appendChild(titleEl);

    // Hook text
    const hookWrap = document.createElement('div');
    hookWrap.className = 'chapter-hook-area';
    const hookLabel = document.createElement('div');
    hookLabel.className = 'chapter-hook-label';
    hookLabel.textContent = 'Lời dẫn (để trống = dùng gợi ý Lumora)';
    const hookTA = document.createElement('textarea');
    hookTA.className = 'chapter-hook-textarea';
    hookTA.placeholder = ch.hooks[0];
    hookTA.value = chapterHooks[ch.id] || '';
    hookTA.addEventListener('input', () => { chapterHooks[ch.id] = hookTA.value.trim(); });
    hookWrap.appendChild(hookLabel);
    hookWrap.appendChild(hookTA);
    chapterContent.appendChild(hookWrap);

    // Upload
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = ch.photoCount.max > 1;
    fileInput.style.display = 'none';

    const uploadZone = document.createElement('div');
    uploadZone.className = 'chapter-upload-zone';
    uploadZone.textContent = `Chọn ảnh (${ch.photoCount.min}–${ch.photoCount.max} ảnh)`;
    uploadZone.addEventListener('click', () => fileInput.click());

    const preview = document.createElement('div');
    preview.className = 'chapter-photos-preview';

    function refreshPreview() {
      preview.replaceChildren();
      (chapterFiles[ch.id] || []).forEach(file => {
        const img = document.createElement('img');
        img.className = 'chapter-photo-thumb';
        img.src = URL.createObjectURL(file);
        preview.appendChild(img);
      });
      nextBtn.disabled = ch.required && !(chapterFiles[ch.id] || []).length;
    }

    fileInput.addEventListener('change', () => {
      chapterFiles[ch.id] = Array.from(fileInput.files).slice(0, ch.photoCount.max);
      refreshPreview();
    });

    chapterContent.appendChild(fileInput);
    chapterContent.appendChild(uploadZone);
    chapterContent.appendChild(preview);

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-next-chapter';
    nextBtn.textContent = isLast ? 'Hoàn thành ✓' : 'Chương tiếp →';
    nextBtn.disabled = ch.required && !(chapterFiles[ch.id] || []).length;
    nextBtn.addEventListener('click', async () => {
      nextBtn.disabled = true;
      nextBtn.textContent = 'Đang lưu...';
      await saveChapter(ch.id);
      if (isLast) { await saveStoryMeta(); finishSetup(); }
      else { currentChapterIdx++; renderChapter(currentChapterIdx); }
    });
    chapterContent.appendChild(nextBtn);

    // Skip button (optional only)
    if (!ch.required) {
      const skipBtn = document.createElement('button');
      skipBtn.className = 'btn-skip-chapter';
      skipBtn.textContent = 'Bỏ qua chương này';
      skipBtn.addEventListener('click', async () => {
        if (isLast) { await saveStoryMeta(); finishSetup(); }
        else { currentChapterIdx++; renderChapter(currentChapterIdx); }
      });
      chapterContent.appendChild(skipBtn);
    }

    refreshPreview();
  }

  async function saveChapter(chapterId) {
    const files = chapterFiles[chapterId] || [];
    if (!files.length) return;
    const form = new FormData();
    form.append('galaxyId', galaxyId);
    form.append('title', 'Uploaded image');
    form.append('description', 'Image uploaded from portal');
    form.append('stage', chapterId);
    files.forEach(f => form.append('files', f));
    await fetch('/gallary/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: form,
    });
  }

  async function saveStoryMeta() {
    const chapters = getChapters().map(ch => ({
      id:       ch.id,
      hookText: chapterHooks[ch.id] || null,
    }));
    await fetch(`/galaxies/${galaxyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ storyType: selectedType, occasion: selectedOccasion, chapters }),
    });
  }

  function finishSetup() {
    window.location.href = `/portal/galaxy.html?galaxyId=${galaxyId}`;
  }
})();
```

- [ ] **Test flow trong browser**

1. Tạo galaxy mới → bị redirect sang `?setup=true`
2. Chọn "Couple Story" → chọn occasion
3. Upload ảnh từng chương → bấm "Hoàn thành"
4. Kiểm tra galaxy trong DB có `storyType`, `occasion`, `chapters`
5. Kiểm tra gallery items có `stage` đúng

- [ ] **Commit**

```bash
git add public/portal/js/galaxy-custom.js
git commit -m "feat: portal — guided story setup flow with chapter upload"
```

---

## Task 9: SE Viewer — HTML shell

**Files:**
- Create: `public/story/index.html`

- [ ] **Tạo thư mục và file**

```bash
mkdir -p public/story/js
```

Tạo `public/story/index.html`:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lumora Story</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background:#080810; color:#fff;
      font-family:'Georgia',serif;
      overflow:hidden; height:100vh; width:100vw;
      user-select:none;
    }
    #se-intro {
      position:fixed; inset:0; z-index:50;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      background:#080810; cursor:pointer;
      transition:opacity 0.8s ease;
    }
    #se-intro.hidden { opacity:0; pointer-events:none; }
    #se-intro-title {
      font-size:clamp(24px,5vw,48px);
      font-weight:300; letter-spacing:0.08em;
      color:#f0ece4; text-align:center; margin-bottom:8px;
    }
    #se-intro-occasion {
      font-size:13px; color:rgba(255,255,255,0.35);
      letter-spacing:0.2em; text-transform:uppercase; margin-bottom:52px;
      font-family:sans-serif;
    }
    .se-pulse {
      width:56px; height:56px; border-radius:50%;
      border:1px solid rgba(255,255,255,0.3);
      animation:sePulse 2s ease-out infinite;
    }
    @keyframes sePulse {
      0%   { transform:scale(0.8); opacity:1; }
      100% { transform:scale(2.2); opacity:0; }
    }
    .se-tap-hint {
      margin-top:20px; font-family:sans-serif;
      font-size:12px; color:rgba(255,255,255,0.3); letter-spacing:0.15em;
    }
    #se-hook {
      position:fixed; inset:0; z-index:30;
      display:flex; align-items:center; justify-content:center;
      padding:48px; background:rgba(8,8,16,0.95);
      opacity:0; pointer-events:none; transition:opacity 0.6s ease;
    }
    #se-hook.visible { opacity:1; pointer-events:all; }
    #se-hook-text {
      font-size:clamp(20px,3.5vw,36px);
      font-weight:300; line-height:1.7;
      text-align:center; color:#f0ece4;
      max-width:600px; letter-spacing:0.02em;
    }
    #se-photo {
      position:fixed; inset:0; z-index:20;
      display:flex; align-items:center; justify-content:center;
      background:#080810; opacity:0; pointer-events:none;
      transition:opacity 0.5s ease; cursor:pointer;
    }
    #se-photo.visible { opacity:1; pointer-events:all; }
    #se-photo-img { max-width:100%; max-height:100%; object-fit:contain; }
    #se-counter {
      position:fixed; bottom:24px; left:50%;
      transform:translateX(-50%); z-index:40;
      display:flex; gap:6px;
    }
    .se-dot {
      width:6px; height:6px; border-radius:50%;
      background:rgba(255,255,255,0.25); transition:background 0.3s;
    }
    .se-dot.active { background:rgba(255,255,255,0.8); }
    #se-finale {
      position:fixed; inset:0; z-index:60;
      display:flex; align-items:center; justify-content:center;
      background:#080810; opacity:0; pointer-events:none;
      transition:opacity 1s ease;
    }
    #se-finale.visible { opacity:1; }
    #se-finale-text {
      font-size:clamp(16px,2.8vw,28px);
      font-weight:300; color:rgba(240,236,228,0.7);
      letter-spacing:0.05em; text-align:center;
    }
    #btn-audio {
      position:fixed; top:20px; right:20px; z-index:100;
      width:40px; height:40px; border-radius:50%;
      background:rgba(255,255,255,0.08);
      border:1px solid rgba(255,255,255,0.15);
      color:#fff; font-size:16px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
    }
    #btn-audio.hidden { display:none; }
  </style>
</head>
<body>

  <div id="se-intro">
    <div id="se-intro-title">Lumora</div>
    <div id="se-intro-occasion"></div>
    <div class="se-pulse"></div>
    <div class="se-tap-hint">Chạm để bắt đầu</div>
  </div>

  <div id="se-hook"><div id="se-hook-text"></div></div>

  <div id="se-photo">
    <img id="se-photo-img" src="" alt="" />
  </div>

  <div id="se-counter"></div>

  <div id="se-finale"><div id="se-finale-text">Và đây là tất cả ký ức của chúng ta...</div></div>

  <button id="btn-audio" class="hidden">🔇</button>

  <script>
    window.musicManager = {
      audio:null, isPlaying:false, _initialized:false,
      init(url){
        if(this._initialized)return; this._initialized=true;
        const btn=document.getElementById('btn-audio');
        if(!url){btn&&btn.classList.add('hidden');return;}
        this.audio=new Audio(url);
        this.audio.loop=true; this.audio.volume=0.7;
        this.audio.onplay =()=>{this.isPlaying=true; if(btn)btn.textContent='🔊';};
        this.audio.onpause=()=>{this.isPlaying=false;if(btn)btn.textContent='🔇';};
        this.audio.play().catch(()=>{});
        if(btn){btn.classList.remove('hidden');btn.addEventListener('click',()=>this.toggle());}
      },
      play(){return this.audio?.play()??Promise.reject();},
      toggle(){this.audio?.paused?this.play().catch(()=>{}):this.audio?.pause();}
    };
  </script>

  <script type="module" src="./js/story.js"></script>
</body>
</html>
```

- [ ] **Commit**

```bash
git add public/story/
git commit -m "feat: SE viewer — HTML shell"
```

---

## Task 10: SE Viewer — story.js engine

**Files:**
- Create: `public/story/js/story.js`

- [ ] **Tạo `public/story/js/story.js`**

```js
const galaxyId = new URLSearchParams(location.search).get('galaxyId');

async function fetchAll() {
  if (!galaxyId) return null;
  try {
    const [cfgRes, viewRes, itemsRes] = await Promise.all([
      fetch('/shared/story-config.json'),
      fetch(`/galaxies/${galaxyId}/view`),
      fetch(`/gallary/items?galaxyId=${encodeURIComponent(galaxyId)}`),
    ]);
    return {
      config: await cfgRes.json(),
      view:   viewRes.ok  ? (await viewRes.json()).meta  : null,
      items:  itemsRes.ok ? (await itemsRes.json()).meta : [],
    };
  } catch { return null; }
}

function groupByStage(items) {
  const map = {};
  items.forEach(item => {
    if (!item.stage) return;
    (map[item.stage] = map[item.stage] || []).push(item.imageUrl);
  });
  return map;
}

function resolveHook(chapterId, userChapters, configChapters) {
  const found = (userChapters || []).find(c => c.id === chapterId);
  if (found?.hookText) return found.hookText;
  return configChapters.find(c => c.id === chapterId)?.hooks[0] || '';
}

const elIntro         = document.getElementById('se-intro');
const elIntroTitle    = document.getElementById('se-intro-title');
const elIntroOccasion = document.getElementById('se-intro-occasion');
const elHook          = document.getElementById('se-hook');
const elHookText      = document.getElementById('se-hook-text');
const elPhoto         = document.getElementById('se-photo');
const elPhotoImg      = document.getElementById('se-photo-img');
const elCounter       = document.getElementById('se-counter');
const elFinale        = document.getElementById('se-finale');

const wait    = ms => new Promise(res => setTimeout(res, ms));
const fadeIn  = el => el.classList.add('visible');
const fadeOut = el => el.classList.remove('visible');

function waitTapOrTimer(ms) {
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const t = setTimeout(finish, ms);
    const onTap = () => { clearTimeout(t); finish(); };
    elPhoto.addEventListener('click',    onTap, { once: true });
    elPhoto.addEventListener('touchend', onTap, { once: true });
  });
}

async function playChapter(hookText, photoUrls) {
  elHookText.textContent = hookText;
  fadeIn(elHook);
  await wait(2800);
  fadeOut(elHook);
  await wait(600);

  for (let i = 0; i < photoUrls.length; i++) {
    elPhotoImg.src = photoUrls[i];

    elCounter.replaceChildren();
    photoUrls.forEach((_, di) => {
      const dot = document.createElement('div');
      dot.className = 'se-dot' + (di === i ? ' active' : '');
      elCounter.appendChild(dot);
    });

    fadeIn(elPhoto);
    await waitTapOrTimer(4500);
    fadeOut(elPhoto);
    await wait(400);
  }

  elCounter.replaceChildren();
}

async function main() {
  const data = await fetchAll();
  if (!data || !data.view?.storyType) {
    window.location.replace(`/view/?galaxyId=${galaxyId}&skip_se=true`);
    return;
  }

  const { config, view, items } = data;
  const occasionConf = config[view.storyType]?.occasions[view.occasion];
  if (!occasionConf) {
    window.location.replace(`/view/?galaxyId=${galaxyId}&skip_se=true`);
    return;
  }

  const configChapters = occasionConf.chapters;
  const grouped        = groupByStage(items);

  // Preload images
  Object.values(grouped).flat().forEach(url => { const img = new Image(); img.src = url; });

  elIntroTitle.textContent    = view.name || 'Lumora';
  elIntroOccasion.textContent = occasionConf.label || '';
  window.musicManager.init(view.music?.url || null);

  await new Promise(resolve => {
    const start = () => { elIntro.classList.add('hidden'); resolve(); };
    elIntro.addEventListener('click',    start, { once: true });
    elIntro.addEventListener('touchend', start, { once: true });
  });

  window.musicManager.play?.().catch?.(() => {});
  document.documentElement.requestFullscreen?.().catch?.(() => {});
  await wait(900);

  for (const chapter of configChapters) {
    const photos = grouped[chapter.id] || [];
    if (!photos.length) continue;
    const hook = resolveHook(chapter.id, view.chapters, configChapters);
    await playChapter(hook, photos);
    await wait(300);
  }

  fadeIn(elFinale);
  await wait(2800);
  window.location.replace(`/view/?galaxyId=${galaxyId}&skip_se=true`);
}

main();
```

- [ ] **Commit**

```bash
git add public/story/js/story.js
git commit -m "feat: SE viewer — chapter engine with hook text, photos, finale"
```

---

## Task 11: index.js — Serve SE cho galaxies có storyType

**Files:**
- Modify: `index.js`

- [ ] **Đăng ký story template trong TEMPLATE_HTML**

Tìm object `TEMPLATE_HTML` trong `index.js`. Thêm vào:

```js
  story: fs.readFileSync(path.join(__dirname, 'public/story/index.html'), 'utf8')
    .replace(/\.\/js\//g, '/story/js/'),
```

- [ ] **Cập nhật route /view/ để detect storyType**

Trong route `app.get('/view/', ...)`, tìm:

```js
const template = galaxy.template || 'galaxy';
const html = TEMPLATE_HTML[template] ?? TEMPLATE_HTML.galaxy;
```

Thay bằng:

```js
const skipSE = req.query.skip_se === 'true';
let html;
if (galaxy.storyType && !skipSE) {
  html = TEMPLATE_HTML.story;
} else {
  const template = galaxy.template || 'galaxy';
  html = TEMPLATE_HTML[template] ?? TEMPLATE_HTML.galaxy;
}
```

- [ ] **Verify bằng cách check node syntax**

```bash
node --check index.js && echo "Syntax OK"
```
Expected: `Syntax OK`

- [ ] **Commit và push**

```bash
git add index.js
git commit -m "feat: route /view/ — serve SE viewer for story galaxies"
git push
```

---

## Task 12: End-to-End Test thủ công

- [ ] **Restart server** (bạn tự restart)

- [ ] **Test tạo Couple Story**

1. Portal → "+ New Galaxy" → đặt tên → Tạo
2. Phải redirect sang `?setup=true`
3. Chọn "Couple Story" → chọn occasion
4. Upload ảnh từng chương → "Hoàn thành ✓"
5. Kiểm tra redirect về galaxy page bình thường

- [ ] **Test SE viewer**

1. Từ trang galaxy → click "↗" để mở view
2. Thấy SE intro screen (tên galaxy + occasion)
3. Tap → hook text fade in → ảnh từng chương
4. Sau khi hết chapters → finale → chuyển sang Fall/Galaxy

- [ ] **Test galaxy cũ không bị ảnh hưởng**

Mở galaxy cũ không có storyType ở `/view/?galaxyId=xxx`
Expected: Fall/Galaxy như cũ, không có SE

- [ ] **Test skip_se**

`/view/?galaxyId=xxx&skip_se=true` với galaxy có storyType
Expected: Fall/Galaxy trực tiếp, bỏ qua SE
