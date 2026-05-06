# Story Setup v2 — Conversation UI Design

**Date:** 2026-05-06
**Status:** Approved
**Goal:** Thay thế story setup dạng form hiện tại bằng UI conversation — Lumora "nói chuyện" với user để thu thập occasion và ảnh từng chapter. Không có textarea, không có label form.

---

## Vấn đề hiện tại

- Flow cũ nhúng trực tiếp vào `galaxy.html` — khó bảo trì, khó mở rộng
- Mỗi chapter có 3–4 input elements (textarea hook, upload zone, nút tiếp, nút skip) → cảm giác điền form
- Auto-redirect sang setup ngay sau khi tạo galaxy — không hỏi user trước
- Không cho phép setup lại khi galaxy đã có story

---

## Design chốt

### 1. Trang riêng: `story-setup.html`

Story setup tách thành trang độc lập tại `/portal/story-setup.html?galaxyId=...`

- Có header riêng với back button → về `galaxy.html`
- Không nhúng vào `galaxy.html` nữa
- Dùng được cho cả tạo mới lẫn setup lại

### 2. Lumora Banner trên `galaxy.html`

Thay vì auto-redirect sau khi tạo galaxy, banner Lumora xuất hiện trên trang quản lý:

**Nếu galaxy chưa có story:**
```
┌─────────────────────────────────────────────┐
│  L   Galaxy này chưa có câu chuyện.          │
│       Lumora có thể giúp bạn tạo một câu     │
│       chuyện theo dịp — kỷ niệm, tỏ tình…  │
│       [ ✨ Thêm câu chuyện ]  [ Không cần ] │
└─────────────────────────────────────────────┘
```

**Nếu galaxy đã có story:**
```
┌─────────────────────────────────────────────┐
│  ✨ Couple Story · Tỏ tình                   │
│  4 chương · đã thiết lập                    │
│                              [ Cài lại ]    │
└─────────────────────────────────────────────┘
```

- Bấm "Thêm câu chuyện" hoặc "Cài lại" → navigate sang `story-setup.html?galaxyId=...`
- Bấm "Không cần" → ẩn banner, lưu vào localStorage để không hỏi lại

### 3. Conversation Flow trong `story-setup.html`

**Bước 0 — Init:**
- Fetch `story-config.json` và `GET /galaxies/:id`
- Nếu galaxy đã có story → flow vẫn chạy bình thường (mode "cài lại"), ghi đè dữ liệu cũ

**Bước 1 — Occasion:**
- Lumora: *"Câu chuyện này dành cho dịp nào?"*
- Hiện occasion chips (pill buttons): Kỷ niệm / Tỏ tình / Nhớ nhau / Cầu hôn / Sinh nhật
- User tap → chip highlight, user bubble xuất hiện với tên occasion đã chọn
- Scroll to bottom tự động

**Bước 2..N — Chapters (từng chương một):**

Với **chapter bắt buộc (`required: true`):**
1. Typing indicator (3 dots, ~600ms)
2. Lumora bubble: trích `hooks[0]` từ story-config + gợi ý upload
3. Chapter card hiện ra:
   - Header gradient với số chương + tên chương
   - Photo grid: thumbnail 52×52px + nút `+`
4. Nút **"Tiếp →"** chỉ hiện sau khi upload ≥ 1 ảnh
5. Bấm Tiếp → `saveChapter()` → render chương tiếp

Với **chapter không bắt buộc (`required: false`):**
1. Typing indicator
2. Lumora hỏi: *"Có [tên chapter] không?"* (câu hỏi cụ thể, không phải tiêu đề)
3. Hai nút: **"Có 🫧"** / **"Không có"**
4. User bubble xuất hiện với lựa chọn
5. Nếu "Có" → chapter card hiện ra → upload → "Tiếp →"
6. Nếu "Không có" → bỏ qua, render chapter tiếp

**Bước cuối — Chapter cuối:**
- Nút đổi thành **"Hoàn thành ✓"** (màu xanh lá)
- Bấm → `saveChapter()` → `saveStoryMeta()` → Lumora: *"Câu chuyện của bạn đã sẵn sàng ✨"* → redirect về `galaxy.html?galaxyId=...`

### 4. UX Details

- **Typing indicator:** 3 dots bounce animation, hiện ~600ms trước mỗi tin Lumora
- **Auto-scroll:** mỗi khi có message/card mới, scroll smooth xuống bottom
- **Hook text:** luôn dùng `hooks[0]` từ story-config, không có textarea
- **Photo upload:** input[type=file] ẩn, click vào `+` để trigger
- **Photo limit:** tối đa `photoCount.max` từ config (1–5 tùy chapter)
- **Save per chapter:** gọi `POST /gallary/upload` với `stage=chapterId` ngay khi bấm "Tiếp →"
- **storyType bước đầu:** hiện chỉ có "Couple Story" → không hiện step chọn loại, đi thẳng vào occasion
- **Re-setup:** overwrite hoàn toàn — upload ảnh mới, PUT galaxy với storyType/occasion/chapters mới

---

## Files

| Action | File | Việc |
|--------|------|------|
| Create | `public/portal/story-setup.html` | Trang conversation UI |
| Create | `public/portal/js/story-setup.js` | Logic conversation, upload, save |
| Modify | `public/portal/galaxy.html` | Xóa old setup HTML/CSS, thêm Lumora banner + story-info card |
| Modify | `public/portal/js/galaxy-custom.js` | Xóa `initStorySetup()`, thêm `loadStoryBanner()` |
| Modify | `public/portal/js/main.js` | Revert auto-redirect → `closeModal() + loadGalaxies()` |

**Không thay đổi:** `models/`, `services/`, `controllers/`, `index.js`, `story-config.json`

---

## Data Flow

```
story-setup.html
  → fetch /shared/story-config.json       (occasion + chapter definitions)
  → fetch /galaxies/:id                   (galaxy name, existing story)
  → per chapter: POST /gallary/upload     (files + stage=chapterId)
  → finish: PUT /galaxies/:id             (storyType, occasion, chapters[{id, hookText:null}])
  → redirect /portal/galaxy.html?galaxyId=...

galaxy.html
  → fetch /galaxies/:id                   (check storyType để show/hide banner)
  → banner click → navigate story-setup.html
```

---

## Out of Scope

- Hook text tùy chỉnh (textarea) — bị bỏ hoàn toàn, dùng default hook
- Chọn story type (chỉ có Couple Story) — skip step này
- Xóa story đã thiết lập — không có trong spec này
- Pagination ảnh trong chapter — giới hạn đơn giản bằng photoCount.max
