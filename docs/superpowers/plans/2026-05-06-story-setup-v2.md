# Story Setup v2 — Conversation UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay thế story setup dạng form bằng trang conversation riêng (`story-setup.html`) — Lumora dẫn user qua từng chapter, không có textarea, có banner trên galaxy.html để vào/cài lại.

**Architecture:** Story setup tách thành standalone page riêng. `galaxy.html` chỉ hiện banner Lumora (no-story) hoặc story-info card (has-story) với link sang trang setup. Trang setup là pure conversation: Lumora message → user response → chapter card → upload → lưu per-chapter → kết thúc redirect về galaxy.html.

**Tech Stack:** Vanilla JS (ES modules), HTML/CSS, Fetch API, FormData

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `public/portal/js/main.js` | Revert auto-redirect về closeModal + loadGalaxies |
| Modify | `public/portal/galaxy.html` | Xóa old setup CSS/HTML, thêm banner + story-info card |
| Modify | `public/portal/js/galaxy-custom.js` | Xóa initStorySetup(), thêm loadStoryBanner() |
| Create | `public/portal/story-setup.html` | Standalone conversation page |
| Create | `public/portal/js/story-setup.js` | Toàn bộ conversation logic |

---

## Task 1: Revert main.js — bỏ auto-redirect sau khi tạo galaxy

**Files:**
- Modify: `public/portal/js/main.js`

- [ ] **Tìm đoạn redirect trong click handler btn-create và thay lại**

Mở `public/portal/js/main.js`. Tìm đoạn:

```js
    const newId = data.meta?._id || data.meta?.id;
    if (newId) {
      window.location.href = `/portal/galaxy.html?galaxyId=${newId}&setup=true`;
    } else {
      closeModal();
      loadGalaxies();
    }
```

Thay bằng:

```js
    closeModal();
    loadGalaxies();
```

- [ ] **Commit**

```bash
git add public/portal/js/main.js
git commit -m "revert: galaxy creation — back to closeModal + loadGalaxies"
```

---

## Task 2: Dọn galaxy.html — xóa old story setup CSS và HTML

**Files:**
- Modify: `public/portal/galaxy.html`

- [ ] **Xóa khối CSS Story Setup trong thẻ `<style>`**

Tìm và xóa toàn bộ đoạn bắt đầu bằng:

```css
    /* ── Story Setup ── */
    .setup-step { width: 100%; }
    .story-type-btn {
```

Và kết thúc bằng:

```css
    .setup-back-btn {
      background: none; border: none; color: var(--text-sub);
      cursor: pointer; margin-bottom: 16px; font-size: 0.88em;
      font-family: inherit; padding: 0;
    }
```

Xóa toàn bộ đoạn đó (khoảng 60 dòng CSS).

- [ ] **Xóa khối HTML Story Setup trong body**

Tìm và xóa toàn bộ đoạn:

```html
    <!-- ── Story Setup ── -->
    <div id="story-setup-section" style="display:none;padding:16px;">
      ...
    </div>
    <!-- ── End Story Setup ── -->
```

- [ ] **Commit**

```bash
git add public/portal/galaxy.html
git commit -m "refactor: galaxy.html — remove old form-based story setup"
```

---

## Task 3: Thêm Lumora banner + story-info card vào galaxy.html

**Files:**
- Modify: `public/portal/galaxy.html`

- [ ] **Thêm CSS cho banner vào cuối thẻ `<style>`** (trước `</style>`)

```css
    /* ── Story Banner ── */
    .story-banner {
      background: linear-gradient(135deg, rgba(109,40,217,0.1) 0%, rgba(76,29,149,0.05) 100%);
      border: 1px solid rgba(139,92,246,0.2);
      border-radius: var(--radius);
      padding: 16px 18px;
      display: flex;
      gap: 14px;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .story-banner-av {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, #6d28d9, #4c1d95);
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-family: 'Jost', sans-serif;
      color: rgba(255,255,255,0.85);
      box-shadow: 0 0 12px rgba(109,40,217,0.3);
      margin-top: 2px;
    }
    .story-banner-body { flex: 1; }
    .story-banner-body p {
      font-size: 13px; line-height: 1.65;
      color: rgba(237,233,254,0.7);
      margin-bottom: 12px;
      font-family: 'Jost', sans-serif;
    }
    .story-banner-btns { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-story-add {
      padding: 8px 18px; border-radius: 20px;
      background: rgba(139,92,246,0.18);
      border: 1px solid rgba(139,92,246,0.38);
      font-family: 'Jost', sans-serif; font-size: 12px;
      color: rgba(196,181,253,0.9); cursor: pointer;
      letter-spacing: 0.02em;
    }
    .btn-story-add:hover { background: rgba(139,92,246,0.28); }
    .btn-story-dismiss {
      padding: 8px 14px; border-radius: 20px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.09);
      font-family: 'Jost', sans-serif; font-size: 12px;
      color: rgba(255,255,255,0.28); cursor: pointer;
    }
    .story-info-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--radius);
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .story-info-left .story-badge {
      font-size: 11px; font-family: 'Jost', sans-serif;
      color: rgba(196,181,253,0.7);
      letter-spacing: 0.06em; margin-bottom: 3px;
    }
    .story-info-left .story-occasion {
      font-size: 14px; color: rgba(237,233,254,0.85);
    }
    .btn-story-reset {
      padding: 7px 16px; border-radius: 20px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.1);
      font-family: 'Jost', sans-serif; font-size: 12px;
      color: rgba(255,255,255,0.35); cursor: pointer;
      white-space: nowrap;
    }
    .btn-story-reset:hover { border-color: rgba(139,92,246,0.3); color: rgba(196,181,253,0.7); }
```

- [ ] **Thêm HTML banner vào body — ngay trước `<!-- Customization -->`**

Tìm:

```html
    <!-- Customization -->
    <div class="card">
```

Thêm VÀO TRƯỚC nó:

```html
    <!-- ── Story Banner ── -->
    <div id="story-banner" class="story-banner" style="display:none;">
      <div class="story-banner-av">L</div>
      <div class="story-banner-body">
        <p>Galaxy này chưa có câu chuyện. Lumora có thể giúp bạn tạo một câu chuyện theo dịp — kỷ niệm, tỏ tình, sinh nhật…</p>
        <div class="story-banner-btns">
          <button class="btn-story-add" id="btn-story-add">✨ Thêm câu chuyện</button>
          <button class="btn-story-dismiss" id="btn-story-dismiss">Không cần</button>
        </div>
      </div>
    </div>

    <div id="story-info-card" class="story-info-card" style="display:none;">
      <div class="story-info-left">
        <div class="story-badge">✨ Couple Story</div>
        <div class="story-occasion" id="story-occasion-label"></div>
      </div>
      <button class="btn-story-reset" id="btn-story-reset">Cài lại</button>
    </div>
    <!-- ── End Story Banner ── -->

    <!-- Customization -->
    <div class="card">
```

- [ ] **Commit**

```bash
git add public/portal/galaxy.html
git commit -m "feat: galaxy.html — add story banner and story-info card"
```

---

## Task 4: galaxy-custom.js — xóa initStorySetup(), thêm loadStoryBanner()

**Files:**
- Modify: `public/portal/js/galaxy-custom.js`

- [ ] **Xóa toàn bộ IIFE initStorySetup**

Tìm và xóa toàn bộ đoạn từ comment đến `})();` cuối cùng của file:

```js
// ── Story Setup Flow ──────────────────────────────────────────────────────────
(async function initStorySetup() {
  ...
})();
```

Xóa toàn bộ phần này (từ dòng `// ── Story Setup Flow ──` đến hết file).

- [ ] **Thêm `loadStoryBanner()` vào cuối file** (sau `window.removeCaption = removeCaption;`)

```js
// ── Story Banner ──────────────────────────────────────────────────────────────
async function loadStoryBanner() {
  if (!galaxyId) return;
  const res = await fetch(`/galaxies/${galaxyId}`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!res.ok) return;
  const galaxy = (await res.json()).meta;

  const OCCASION_LABELS = {
    anniversary: 'Kỷ niệm', confession: 'Tỏ tình',
    missing: 'Nhớ nhau', proposal: 'Cầu hôn', birthday: 'Sinh nhật',
  };
  const DISMISS_KEY = `story-banner-dismissed-${galaxyId}`;
  const banner   = document.getElementById('story-banner');
  const infoCard = document.getElementById('story-info-card');

  if (galaxy.storyType) {
    const label = document.getElementById('story-occasion-label');
    label.textContent = OCCASION_LABELS[galaxy.occasion] || galaxy.occasion;
    infoCard.style.display = 'flex';
    document.getElementById('btn-story-reset').addEventListener('click', () => {
      window.location.href = `/portal/story-setup.html?galaxyId=${galaxyId}`;
    });
  } else if (!localStorage.getItem(DISMISS_KEY)) {
    banner.style.display = 'flex';
    document.getElementById('btn-story-add').addEventListener('click', () => {
      window.location.href = `/portal/story-setup.html?galaxyId=${galaxyId}`;
    });
    document.getElementById('btn-story-dismiss').addEventListener('click', () => {
      localStorage.setItem(DISMISS_KEY, '1');
      banner.style.display = 'none';
    });
  }
}

loadStoryBanner();
```

- [ ] **Verify syntax**

```bash
node --check public/portal/js/galaxy-custom.js && echo "OK"
```

Expected: `OK`

- [ ] **Commit**

```bash
git add public/portal/js/galaxy-custom.js
git commit -m "feat: galaxy-custom — replace initStorySetup with loadStoryBanner"
```

---

## Task 5: Tạo story-setup.html — standalone conversation page

**Files:**
- Create: `public/portal/story-setup.html`

- [ ] **Tạo file**

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <title>Lumora — Câu chuyện</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #06060e;
      --surface: rgba(255,255,255,0.04);
      --border: rgba(255,255,255,0.08);
      --border-accent: rgba(139,92,246,0.35);
      --text: #ede9fe;
      --text-sub: rgba(255,255,255,0.42);
      --accent: #8b5cf6;
      --radius: 14px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background: var(--bg);
      background-image:
        radial-gradient(ellipse 70% 45% at 15% 0%, rgba(109,40,217,0.18) 0%, transparent 70%),
        radial-gradient(ellipse 45% 55% at 85% 105%, rgba(79,25,175,0.1) 0%, transparent 70%);
      font-family: 'Jost', sans-serif;
      color: var(--text);
    }
    .page-header {
      padding: 18px 20px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex; align-items: center; gap: 16px;
      position: sticky; top: 0;
      background: rgba(6,6,14,0.92);
      backdrop-filter: blur(12px);
      z-index: 10;
    }
    .back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--surface); border: 1px solid var(--border);
      color: var(--text-sub); padding: 7px 14px; border-radius: 8px;
      cursor: pointer; font-size: 12px; font-family: 'Jost', sans-serif;
      text-decoration: none; transition: all 0.2s; white-space: nowrap;
    }
    .back-btn:hover { border-color: var(--border-accent); color: var(--text); }
    .header-info { flex: 1; min-width: 0; }
    .header-eyebrow {
      font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
      color: var(--text-sub); margin-bottom: 2px;
    }
    .header-name {
      font-size: 16px; font-weight: 400;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .chat-wrap {
      max-width: 560px; width: 100%;
      margin: 0 auto;
      padding: 24px 16px 80px;
      display: flex; flex-direction: column;
    }
    /* Lumora row */
    .lmsg { display: flex; gap: 10px; margin-bottom: 14px; align-items: flex-start; }
    .av {
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, #6d28d9, #4c1d95);
      flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      font-size: 10px; color: rgba(255,255,255,0.85);
      box-shadow: 0 0 14px rgba(109,40,217,0.35);
      margin-top: 2px;
    }
    .lbubble {
      background: rgba(139,92,246,0.1);
      border: 1px solid rgba(139,92,246,0.18);
      border-radius: 3px 14px 14px 14px;
      padding: 11px 15px; font-size: 13px; line-height: 1.7;
      color: rgba(237,233,254,0.8); max-width: 88%;
    }
    .lbubble em { color: rgba(196,181,253,0.95); font-style: italic; }
    /* Typing */
    .typing-dots {
      display: flex; gap: 5px; align-items: center;
      padding: 12px 16px;
      background: rgba(139,92,246,0.08);
      border: 1px solid rgba(139,92,246,0.12);
      border-radius: 3px 14px 14px 14px;
    }
    .typing-dots span {
      width: 5px; height: 5px; border-radius: 50%;
      background: rgba(139,92,246,0.55);
      animation: tdot 1.2s infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes tdot {
      0%,60%,100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-5px); opacity: 1; }
    }
    /* User row */
    .umsg { display: flex; gap: 10px; margin-bottom: 14px; flex-direction: row-reverse; }
    .ububble {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px 3px 14px 14px;
      padding: 10px 15px; font-size: 13px;
      color: rgba(255,255,255,0.55); max-width: 80%;
    }
    /* Chips */
    .chips-wrap { margin: 2px 0 14px 38px; display: flex; flex-wrap: wrap; gap: 8px; }
    .chip {
      padding: 8px 18px; border-radius: 24px;
      background: rgba(139,92,246,0.07);
      border: 1px solid rgba(139,92,246,0.2);
      font-size: 12px; color: rgba(196,181,253,0.65);
      cursor: pointer; transition: all 0.18s;
    }
    .chip:hover { background: rgba(139,92,246,0.14); border-color: rgba(139,92,246,0.4); }
    .chip.on { background: rgba(139,92,246,0.22); border-color: rgba(139,92,246,0.55); color: #ddd6fe; }
    /* Chapter card */
    .ch-card {
      margin: 5px 0 8px 38px;
      border-radius: 14px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.07);
      background: rgba(255,255,255,0.03);
    }
    .ch-head {
      padding: 13px 16px;
      background: linear-gradient(135deg, rgba(80,20,140,0.5) 0%, rgba(12,8,28,0.85) 100%);
    }
    .ch-num {
      font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
      color: rgba(255,255,255,0.25); margin-bottom: 3px;
    }
    .ch-title { font-size: 14px; color: rgba(237,233,254,0.88); letter-spacing: 0.02em; }
    .ch-photos { padding: 13px 15px; display: flex; gap: 8px; flex-wrap: wrap; }
    .ch-ph {
      width: 54px; height: 54px; border-radius: 10px;
      background: rgba(255,255,255,0.04); border: 1px dashed rgba(255,255,255,0.1);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; color: rgba(255,255,255,0.2); cursor: pointer;
      overflow: hidden; flex-shrink: 0;
    }
    .ch-ph img { width: 100%; height: 100%; object-fit: cover; }
    /* Action rows */
    .action-row { margin: 4px 0 18px 38px; display: flex; gap: 9px; }
    .btn-next {
      padding: 10px 22px; border-radius: 24px;
      background: rgba(139,92,246,0.18); border: 1px solid rgba(139,92,246,0.38);
      font-size: 13px; color: rgba(196,181,253,0.95);
      cursor: pointer; letter-spacing: 0.02em; transition: all 0.18s;
    }
    .btn-next:disabled { opacity: 0.35; cursor: not-allowed; }
    .btn-next:not(:disabled):hover { background: rgba(139,92,246,0.28); }
    .btn-next.done {
      background: rgba(110,231,183,0.15); border-color: rgba(110,231,183,0.35);
      color: rgba(110,231,183,0.95);
    }
    .btn-yesno { margin: 4px 0 16px 38px; display: flex; gap: 9px; }
    .btn-yes {
      padding: 10px 22px; border-radius: 24px;
      background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3);
      font-size: 13px; color: rgba(196,181,253,0.85); cursor: pointer;
    }
    .btn-no {
      padding: 10px 18px; border-radius: 24px;
      background: transparent; border: 1px solid rgba(255,255,255,0.09);
      font-size: 13px; color: rgba(255,255,255,0.3); cursor: pointer;
    }
    .done-note {
      font-size: 11px; color: rgba(255,255,255,0.3);
      display: block; margin-top: 5px; font-style: normal;
    }
  </style>
</head>
<body>
  <div class="page-header">
    <a id="back-link" href="/portal/" class="back-btn">← Portal</a>
    <div class="header-info">
      <div class="header-eyebrow">Lumora — Câu chuyện</div>
      <div class="header-name" id="galaxy-name">Đang tải…</div>
    </div>
  </div>
  <div class="chat-wrap" id="chat"></div>
  <script type="module" src="./js/story-setup.js"></script>
</body>
</html>
```

- [ ] **Commit**

```bash
git add public/portal/story-setup.html
git commit -m "feat: story-setup.html — standalone conversation page shell"
```

---

## Task 6: Tạo story-setup.js — conversation logic

**Files:**
- Create: `public/portal/js/story-setup.js`

- [ ] **Tạo file với toàn bộ logic**

```js
const params   = new URLSearchParams(location.search);
const galaxyId = params.get('galaxyId');
const token    = localStorage.getItem('token');

if (!token) window.location.href = '/auth/';
if (!galaxyId) window.location.href = '/portal/';

const chat = document.getElementById('chat');

const OCCASION_LABELS = {
  anniversary: 'Kỷ niệm', confession: 'Tỏ tình',
  missing: 'Nhớ nhau', proposal: 'Cầu hôn', birthday: 'Sinh nhật',
};

const OPTIONAL_QUESTIONS = {
  highlight: {
    anniversary: 'Có khoảnh khắc đặc biệt nào bạn muốn lưu lại không?',
    confession:  'Có khoảnh khắc nào bạn nhận ra mình thích họ không?',
    missing:     'Có kỷ niệm nào bạn nhớ nhất không?',
    proposal:    'Có lý do nào bạn muốn chia sẻ thêm không?',
    birthday:    'Có điều gì bạn thích nhất ở họ muốn kể không?',
  },
};

let STORY_CONFIG = null;
let selectedOccasion = null;
const chapterFiles = {};

// ── DOM helpers ───────────────────────────────────────────────────────────────

function scrollBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function makeLRow() {
  const row = document.createElement('div');
  row.className = 'lmsg';
  const av = document.createElement('div');
  av.className = 'av';
  av.textContent = 'L';
  row.appendChild(av);
  return row;
}

function appendLMsg(text, italicText) {
  const row = makeLRow();
  const bubble = document.createElement('div');
  bubble.className = 'lbubble';
  if (italicText) {
    const em = document.createElement('em');
    em.textContent = italicText;
    bubble.appendChild(em);
    if (text) {
      bubble.appendChild(document.createTextNode(' ' + text));
    }
  } else {
    bubble.textContent = text;
  }
  row.appendChild(bubble);
  chat.appendChild(row);
  scrollBottom();
  return row;
}

function appendLMsgWithNote(text, noteText) {
  const row = makeLRow();
  const bubble = document.createElement('div');
  bubble.className = 'lbubble';
  bubble.textContent = text;
  const note = document.createElement('span');
  note.className = 'done-note';
  note.textContent = noteText;
  bubble.appendChild(note);
  row.appendChild(bubble);
  chat.appendChild(row);
  scrollBottom();
}

function appendUMsg(text) {
  const row = document.createElement('div');
  row.className = 'umsg';
  const bubble = document.createElement('div');
  bubble.className = 'ububble';
  bubble.textContent = text;
  row.appendChild(bubble);
  chat.appendChild(row);
  scrollBottom();
}

function appendEl(el) {
  chat.appendChild(el);
  scrollBottom();
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function typingThen(text, italicText, delayMs = 700) {
  const row = makeLRow();
  const dots = document.createElement('div');
  dots.className = 'typing-dots';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    dots.appendChild(s);
  }
  row.appendChild(dots);
  chat.appendChild(row);
  scrollBottom();
  await wait(delayMs);
  row.remove();
  appendLMsg(text, italicText);
}

// ── API ───────────────────────────────────────────────────────────────────────

async function saveChapter(chapterId) {
  const files = chapterFiles[chapterId] || [];
  if (!files.length) return;
  const form = new FormData();
  form.append('galaxyId', galaxyId);
  form.append('title', 'Uploaded image');
  form.append('description', 'Image uploaded from story setup');
  form.append('stage', chapterId);
  files.forEach(f => form.append('files', f));
  await fetch('/gallary/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: form,
  });
}

async function saveStoryMeta(occasion) {
  const chapters = STORY_CONFIG['couple'].occasions[occasion].chapters.map(ch => ({
    id: ch.id,
    hookText: null,
  }));
  await fetch(`/galaxies/${galaxyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ storyType: 'couple', occasion, chapters }),
  });
}

// ── Chapter card builder ──────────────────────────────────────────────────────

function buildChapterCard(chapter, chapterIdx, totalChapters) {
  const wrap = document.createElement('div');

  const card = document.createElement('div');
  card.className = 'ch-card';

  const head = document.createElement('div');
  head.className = 'ch-head';
  const num = document.createElement('div');
  num.className = 'ch-num';
  num.textContent = `Chương ${chapterIdx + 1} / ${totalChapters}`;
  const title = document.createElement('div');
  title.className = 'ch-title';
  title.textContent = chapter.label;
  head.appendChild(num);
  head.appendChild(title);
  card.appendChild(head);

  const photosEl = document.createElement('div');
  photosEl.className = 'ch-photos';
  card.appendChild(photosEl);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = chapter.photoCount.max > 1;
  fileInput.style.display = 'none';
  card.appendChild(fileInput);

  function renderPhotos() {
    photosEl.replaceChildren();
    const files = chapterFiles[chapter.id] || [];
    files.forEach(file => {
      const ph = document.createElement('div');
      ph.className = 'ch-ph';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = '';
      ph.appendChild(img);
      photosEl.appendChild(ph);
    });
    if (files.length < chapter.photoCount.max) {
      const addPh = document.createElement('div');
      addPh.className = 'ch-ph';
      addPh.textContent = '+';
      addPh.addEventListener('click', () => fileInput.click());
      photosEl.appendChild(addPh);
    }
  }

  renderPhotos();

  fileInput.addEventListener('change', () => {
    const existing = chapterFiles[chapter.id] || [];
    const incoming = Array.from(fileInput.files);
    const merged = [...existing, ...incoming].slice(0, chapter.photoCount.max);
    chapterFiles[chapter.id] = merged;
    renderPhotos();
    nextBtn.disabled = false;
    scrollBottom();
  });

  wrap.appendChild(card);

  const actionRow = document.createElement('div');
  actionRow.className = 'action-row';
  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn-next';
  nextBtn.disabled = chapter.required;
  nextBtn.textContent = 'Tiếp →';
  actionRow.appendChild(nextBtn);
  wrap.appendChild(actionRow);

  return { wrap, nextBtn, fileInput };
}

// ── Chapter runners ───────────────────────────────────────────────────────────

function runChapter(chapter, chapterIdx, totalChapters) {
  return new Promise(async resolve => {
    await typingThen(null, chapter.hooks[0]);
    const { wrap, nextBtn } = buildChapterCard(chapter, chapterIdx, totalChapters);
    appendEl(wrap);
    nextBtn.addEventListener('click', async () => {
      nextBtn.disabled = true;
      nextBtn.textContent = 'Đang lưu…';
      await saveChapter(chapter.id);
      resolve();
    }, { once: true });
  });
}

function runOptionalChapter(chapter, chapterIdx, totalChapters, occasion) {
  return new Promise(async resolve => {
    const question = OPTIONAL_QUESTIONS[chapter.id]?.[occasion]
      || `Có ${chapter.label.toLowerCase()} nào bạn muốn thêm không?`;
    await typingThen(question);

    const yesno = document.createElement('div');
    yesno.className = 'btn-yesno';
    const btnYes = document.createElement('button');
    btnYes.className = 'btn-yes';
    btnYes.textContent = 'Có 🫧';
    const btnNo = document.createElement('button');
    btnNo.className = 'btn-no';
    btnNo.textContent = 'Không có';
    yesno.appendChild(btnYes);
    yesno.appendChild(btnNo);
    appendEl(yesno);

    btnYes.addEventListener('click', async () => {
      yesno.replaceChildren();
      appendUMsg('Có 🫧');
      const { wrap, nextBtn } = buildChapterCard(chapter, chapterIdx, totalChapters);
      nextBtn.disabled = false;
      appendEl(wrap);
      nextBtn.addEventListener('click', async () => {
        nextBtn.disabled = true;
        nextBtn.textContent = 'Đang lưu…';
        await saveChapter(chapter.id);
        resolve();
      }, { once: true });
    }, { once: true });

    btnNo.addEventListener('click', () => {
      yesno.replaceChildren();
      appendUMsg('Không có');
      resolve();
    }, { once: true });
  });
}

function runLastChapter(chapter, chapterIdx, totalChapters) {
  return new Promise(async resolve => {
    await typingThen(null, chapter.hooks[0]);
    const { wrap, nextBtn } = buildChapterCard(chapter, chapterIdx, totalChapters);
    nextBtn.textContent = 'Hoàn thành ✓';
    nextBtn.classList.add('done');
    appendEl(wrap);
    nextBtn.addEventListener('click', async () => {
      nextBtn.disabled = true;
      nextBtn.textContent = 'Đang lưu…';
      await saveChapter(chapter.id);
      await saveStoryMeta(selectedOccasion);
      appendLMsgWithNote(
        'Câu chuyện của bạn đã sẵn sàng ✨',
        'Đang chuyển về trang quản lý…'
      );
      await wait(1800);
      window.location.href = `/portal/galaxy.html?galaxyId=${galaxyId}`;
      resolve();
    }, { once: true });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function init() {
  const [cfgRes, galaxyRes] = await Promise.all([
    fetch('/shared/story-config.json'),
    fetch(`/galaxies/${galaxyId}`, { headers: { Authorization: 'Bearer ' + token } }),
  ]);

  if (!galaxyRes.ok) { window.location.href = '/portal/'; return; }

  STORY_CONFIG = await cfgRes.json();
  const galaxy = (await galaxyRes.json()).meta;

  document.getElementById('galaxy-name').textContent = galaxy.name || 'Galaxy';
  document.getElementById('back-link').href = `/portal/galaxy.html?galaxyId=${galaxyId}`;

  // Step 1 — Occasion
  await typingThen('Câu chuyện này dành cho dịp nào?', null, 500);

  const occasions = STORY_CONFIG['couple'].occasions;
  const chipsWrap = document.createElement('div');
  chipsWrap.className = 'chips-wrap';
  Object.entries(occasions).forEach(([id, occ]) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = occ.label;
    chip.dataset.id = id;
    chipsWrap.appendChild(chip);
  });
  appendEl(chipsWrap);

  selectedOccasion = await new Promise(resolve => {
    chipsWrap.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chipsWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
        chip.classList.add('on');
        setTimeout(() => {
          appendUMsg(chip.textContent);
          chipsWrap.querySelectorAll('.chip').forEach(c => {
            c.style.pointerEvents = 'none';
          });
          resolve(chip.dataset.id);
        }, 200);
      });
    });
  });

  // Step 2..N — Chapters
  const chapters = occasions[selectedOccasion].chapters;
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const isLast = i === chapters.length - 1;
    if (isLast) {
      await runLastChapter(ch, i, chapters.length);
    } else if (ch.required) {
      await runChapter(ch, i, chapters.length);
    } else {
      await runOptionalChapter(ch, i, chapters.length, selectedOccasion);
    }
  }
}

init();
```

- [ ] **Commit**

```bash
git add public/portal/js/story-setup.js
git commit -m "feat: story-setup.js — conversation flow, chapter upload, save"
```

---

## Task 7: End-to-End manual test

- [ ] **Restart server** (tự restart)

- [ ] **Test galaxy mới — banner xuất hiện**

1. Portal → "+ New Galaxy" → tạo → modal đóng + loadGalaxies() bình thường (không redirect)
2. Bấm "Quản lý" → vào `galaxy.html?galaxyId=...`
3. Thấy Lumora banner ở đầu trang
4. Bấm "Không cần" → banner ẩn; refresh lại → banner không hiện lại (localStorage)

- [ ] **Test flow thêm câu chuyện**

1. Bấm "✨ Thêm câu chuyện" → navigate sang `story-setup.html?galaxyId=...`
2. Header: tên galaxy đúng, back link về galaxy.html
3. Lumora typing dots → message "Câu chuyện này dành cho dịp nào?"
4. Chips hiện → chọn "Tỏ tình" → chip sáng, user bubble xuất hiện
5. Chapter 1 (required): typing dots → italic hook text → card với số chương đúng → upload ảnh → "Tiếp →" unlock → bấm Tiếp
6. Chapter 3 (optional "highlight"): Lumora hỏi câu hỏi tùy occasion → "Có 🫧" → card → upload → Tiếp
7. Chapter cuối: nút "Hoàn thành ✓" màu xanh lá → bấm → "Đang lưu…" → Lumora done message → redirect

- [ ] **Verify dữ liệu đã lưu**

Sau khi setup xong, vào galaxy.html → phải thấy story-info card (không phải banner):
```
✨ Couple Story
Tỏ tình
                    [ Cài lại ]
```

- [ ] **Test Cài lại**

Bấm "Cài lại" → vào story-setup.html → flow chạy lại từ đầu bình thường (ghi đè data cũ)

- [ ] **Test SE viewer vẫn hoạt động**

Bấm "↗" từ galaxy.html → `/view/?galaxyId=...` → SE viewer phát chapters bình thường

- [ ] **Test galaxy không có story, đã dismiss**

Vào galaxy.html với galaxy không có story + đã bấm "Không cần" → không thấy banner, không thấy story-info card → trang bình thường

- [ ] **Push**

```bash
git push
```
