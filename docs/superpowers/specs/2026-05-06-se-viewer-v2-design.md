# SE Viewer v2 + Hook Input Design

**Date:** 2026-05-06
**Status:** Approved

## Goal

Redesign SE viewer theo hướng Cinematic (ảnh fill màn hình, hook overlay dưới cùng, progress bar thay dots). Thêm textarea hook tuỳ chọn vào chapter card trong story-setup. Đã done: thêm dấu story-config.json.

---

## 1. SE Viewer — Cinematic Redesign

### Files
- Modify: `public/story/index.html` — CSS + HTML
- Modify: `public/story/js/story.js` — playChapter logic

### Visual

**Intro screen:**
- Nền: radial gradient tím (`rgba(109,40,217,0.25)`) + stars nhỏ (CSS pseudo hoặc absolute divs)
- Giữ title, occasion label, pulse animation, tap hint — không thay đổi cấu trúc

**Photo + Hook screen (thay thế 2 màn hình riêng):**
- `#se-photo-img`: `width:100%; height:100%; object-fit:cover` — fill màn hình, không còn đen viền
- Gradient tối ở bottom (55% height) để hook đọc được
- `#se-chapter-tag` (thêm mới): tên chapter + số thứ tự, trên hook text, font nhỏ uppercase
- `#se-hook-text`: italic, smaller (14–16px), left-aligned thay vì center, nằm trong vùng gradient dưới
- Progress bar mỏng (2px) ở top thay cho `#se-counter` dots — fill theo % chapters đã xem
- Audio button giữ nguyên top-right

### Playback flow mới

`playChapter(hookText, chapterTag, photoUrls, chapterProgress)`:
1. Set `#se-chapter-tag` textContent, `#se-hook-text` textContent
2. Update progress bar width = `(chapterProgress / totalChapters) * 100%`
3. **First photo**: fade in photo + hook cùng lúc → sau 2500ms hook tự fade out → photo ở lại → wait tap or 4500ms
4. **Subsequent photos**: fade in photo (không hook) → wait tap or 4500ms
5. Photo fades out → next

Bỏ hoàn toàn màn hình hook riêng (`elHook` fade in/out trước khi show ảnh).

### HTML thay đổi

Thêm vào body (trong `#se-photo`):
```html
<div id="se-chapter-tag"></div>
```

Thêm progress bar (thay `#se-counter`):
```html
<div id="se-progress-bar"><div id="se-progress-fill"></div></div>
```

---

## 2. Hook Textarea trong Chapter Card

### Files
- Modify: `public/portal/story-setup.html` — thêm CSS cho textarea
- Modify: `public/portal/js/story-setup.js` — thêm textarea trong `buildChapterCard`, lưu vào `chapterHooks`, truyền vào `saveStoryMeta`

### UI

Trong chapter card (dưới photos grid, trên action row):
```
┌─────────────────────────────┐
│ Lời dẫn (tuỳ chọn)         │  ← label nhỏ uppercase
│ ┌─────────────────────────┐ │
│ │ placeholder = hooks[0]  │ │  ← textarea 2 rows, serif italic
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- Textarea để trống → `hookText: null` → viewer dùng hook default từ config
- Textarea có nội dung → `hookText: "nội dung"` → viewer dùng nội dung này

### Code changes

**story-setup.js:**
- Thêm `const chapterHooks = {};` module-level (cùng với `chapterFiles`)
- Trong `buildChapterCard`: append hook section sau `photosEl`, trước `wrap.appendChild(card)`
- `saveStoryMeta(occasion)`: thay `hookText: null` bằng `hookText: chapterHooks[ch.id] || null`

---

## Out of Scope

- Animation stars phức tạp (dùng CSS simple dots)
- Hook per-photo (một hook dùng cho toàn chapter)
- Chỉnh hook sau khi đã setup (cần màn hình edit riêng)
