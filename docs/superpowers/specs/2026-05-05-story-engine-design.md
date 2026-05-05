# Story Engine — Design Spec
**Date:** 2026-05-05
**Scope:** Couple Story (first story type), 5 occasions

---

## 1. Tổng quan

Story Engine (SE) là lớp trải nghiệm xem có cấu trúc, đứng trước Fall/Galaxy template. Lumora biên kịch cấu trúc câu chuyện (chapters, hook texts, emotion flow). User điền nội dung (ảnh, tuỳ chỉnh text). Fall/Galaxy là grand finale phát sau khi SE kết thúc — không thay đổi gì.

```
Viewer vào /view/?galaxyId=xxx
        ↓
SE chạy — chapter by chapter
  [Hook text fade in] → [Ảnh của chương đó]
  ... lặp lại cho từng chương ...
        ↓
Transition: "Và đây là tất cả ký ức của chúng ta..."
        ↓
Fall hoặc Galaxy template bật lên (nguyên vẹn)
```

Galaxy không có `storyType` → bỏ qua SE, vào Fall/Galaxy trực tiếp như cũ.

---

## 2. Story Config (tĩnh)

File: `public/shared/story-config.json`

Lumora định nghĩa toàn bộ structure tại đây. Không lưu vào DB.

```json
{
  "couple": {
    "label": "Couple Story",
    "occasions": {
      "anniversary": {
        "label": "Kỷ niệm",
        "chapters": [
          {
            "id": "intro",
            "label": "Khởi đầu",
            "required": true,
            "photoCount": { "min": 1, "max": 1 },
            "hooks": [
              "Chúng ta bắt đầu từ một ngày rất bình thường...",
              "Anh không nghĩ mọi thứ lại bắt đầu như thế này..."
            ]
          },
          {
            "id": "memory",
            "label": "Ký ức",
            "required": true,
            "photoCount": { "min": 1, "max": 5 },
            "hooks": [
              "Rồi những ngày bình thường trở thành những ngày không thể quên...",
              "Có những khoảnh khắc mình chẳng chụp lại, nhưng vẫn nhớ mãi..."
            ]
          },
          {
            "id": "highlight",
            "label": "Khoảnh khắc đặc biệt",
            "required": false,
            "photoCount": { "min": 1, "max": 2 },
            "hooks": [
              "Và có một khoảnh khắc anh nhớ mãi...",
              "Nếu phải chọn một ngày để nhớ, anh sẽ chọn ngày này..."
            ]
          },
          {
            "id": "ending",
            "label": "Kết",
            "required": true,
            "photoCount": { "min": 1, "max": 1 },
            "hooks": [
              "Cảm ơn vì đã ở đây, và vì tất cả những điều đó...",
              "Anh không cần nhiều hơn. Chỉ cần em ở đây là đủ..."
            ]
          }
        ]
      },
      "confession": {
        "label": "Tỏ tình",
        "chapters": [
          {
            "id": "intro",
            "label": "Trước khi gặp em",
            "required": true,
            "photoCount": { "min": 1, "max": 1 },
            "hooks": [
              "Trước khi gặp em, anh không nghĩ điều này sẽ xảy ra..."
            ]
          },
          {
            "id": "memory",
            "label": "Những ngày bên em",
            "required": true,
            "photoCount": { "min": 1, "max": 5 },
            "hooks": [
              "Rồi em xuất hiện. Và mọi thứ khác đi..."
            ]
          },
          {
            "id": "highlight",
            "label": "Khoảnh khắc anh nhận ra",
            "required": false,
            "photoCount": { "min": 1, "max": 1 },
            "hooks": [
              "Có một khoảnh khắc anh biết mình đã thích em từ lâu..."
            ]
          },
          {
            "id": "ending",
            "label": "Điều anh muốn nói",
            "required": true,
            "photoCount": { "min": 1, "max": 1 },
            "hooks": [
              "Và bây giờ, anh chỉ muốn nói với em một điều..."
            ]
          }
        ]
      },
      "missing": {
        "label": "Nhớ nhau",
        "chapters": [
          {
            "id": "intro",
            "label": "Khi xa nhau",
            "required": true,
            "photoCount": { "min": 1, "max": 1 },
            "hooks": [
              "Có những ngày xa nhau, anh lại nhớ về..."
            ]
          },
          {
            "id": "memory",
            "label": "Những ngày đã có",
            "required": true,
            "photoCount": { "min": 1, "max": 5 },
            "hooks": [
              "Những ngày mình ở bên nhau, anh đã không biết trân trọng..."
            ]
          },
          {
            "id": "highlight",
            "label": "Khoảnh khắc anh nhớ nhất",
            "required": false,
            "photoCount": { "min": 1, "max": 2 },
            "hooks": [
              "Nếu được chọn một ký ức để giữ lại, anh sẽ chọn cái này..."
            ]
          },
          {
            "id": "ending",
            "label": "Gửi đến em",
            "required": true,
            "photoCount": { "min": 1, "max": 1 },
            "hooks": [
              "Anh nhớ em. Chỉ vậy thôi, nhưng nhiều lắm..."
            ]
          }
        ]
      },
      "proposal": {
        "label": "Cầu hôn",
        "chapters": [
          {
            "id": "intro",
            "label": "Ngày đầu tiên",
            "required": true,
            "photoCount": { "min": 1, "max": 1 },
            "hooks": [
              "Mọi thứ bắt đầu từ một ngày anh không bao giờ quên..."
            ]
          },
          {
            "id": "memory",
            "label": "Hành trình của chúng ta",
            "required": true,
            "photoCount": { "min": 1, "max": 5 },
            "hooks": [
              "Chúng ta đã đi qua rất nhiều thứ cùng nhau..."
            ]
          },
          {
            "id": "highlight",
            "label": "Lý do",
            "required": false,
            "photoCount": { "min": 1, "max": 2 },
            "hooks": [
              "Và đây là lý do anh biết em là người anh muốn ở bên mãi mãi..."
            ]
          },
          {
            "id": "ending",
            "label": "Câu hỏi",
            "required": true,
            "photoCount": { "min": 1, "max": 1 },
            "hooks": [
              "Em có muốn cùng anh viết tiếp câu chuyện này không?"
            ]
          }
        ]
      },
      "birthday": {
        "label": "Sinh nhật người yêu",
        "chapters": [
          {
            "id": "intro",
            "label": "Ngày hôm nay",
            "required": true,
            "photoCount": { "min": 1, "max": 1 },
            "hooks": [
              "Hôm nay là ngày của em. Và anh muốn kể em nghe..."
            ]
          },
          {
            "id": "memory",
            "label": "Một năm qua",
            "required": true,
            "photoCount": { "min": 1, "max": 5 },
            "hooks": [
              "Một năm qua, chúng ta đã có những điều này..."
            ]
          },
          {
            "id": "highlight",
            "label": "Điều anh thích nhất ở em",
            "required": false,
            "photoCount": { "min": 1, "max": 2 },
            "hooks": [
              "Nhưng có một điều anh thích nhất ở em, đó là..."
            ]
          },
          {
            "id": "ending",
            "label": "Lời chúc",
            "required": true,
            "photoCount": { "min": 1, "max": 1 },
            "hooks": [
              "Chúc em sinh nhật vui vẻ. Cảm ơn vì đã là em..."
            ]
          }
        ]
      }
    }
  }
}
```

---

## 3. Data Model

### Galaxy — thêm 3 field

```js
storyType: {
  type: String,
  enum: ['couple'],   // mở rộng dần
  default: null,
}
occasion: {
  type: String,
  default: null,
  // VD: 'anniversary', 'confession', 'missing', 'proposal', 'birthday'
}
chapters: {
  type: [
    {
      id:       String,   // 'intro' | 'memory' | 'highlight' | 'ending'
      hookText: String,   // null = dùng hooks[0] từ story-config
    }
  ],
  default: [],
}
```

### Gallery item — thêm 2 field

```js
stage: {
  type: String,
  default: null,
  // 'intro' | 'memory' | 'highlight' | 'ending'
}
order: {
  type: Number,
  default: 0,
}
```

`title` và `description` giữ nguyên, không repurpose.

### Sort order khi fetch ảnh

`GET /gallary/items?galaxyId=xxx` — khi galaxy có `storyType`:

```
sort: stage theo thứ tự chapters trong config → order ASC → createdAt ASC
```

Galaxy không có `storyType` → sort như cũ (createdAt DESC).

---

## 4. Portal UI — Guided Creation Flow

### 4a. Tạo galaxy mới

Modal tạo galaxy hiện tại: chỉ có input tên.

Sau khi tên được nhập và bấm Tạo:
1. Galaxy được tạo trong DB (POST /galaxies)
2. Redirect sang `/portal/galaxy.html?galaxyId=xxx&setup=true`

### 4b. Setup flow (khi `?setup=true`)

Trang galaxy hiện `Story Setup` thay vì form thông thường. Gồm 3 bước tuyến tính:

**Bước 1 — Chọn Story Type**
- Hiện các loại story (hiện tại: Couple Story)
- Mỗi loại có label + mô tả ngắn + icon

**Bước 2 — Chọn Dịp**
- Sau khi chọn Story Type, hiện danh sách occasions
- VD Couple Story: Kỷ niệm / Tỏ tình / Nhớ nhau / Cầu hôn / Sinh nhật người yêu

**Bước 3 — Upload từng chương**
- Hiện từng chapter một (required trước, optional sau)
- Mỗi chapter:
  ```
  ┌─────────────────────────────────┐
  │ Chương 2: Ký ức                 │
  │                                 │
  │ "Rồi những ngày bình thường..." │ ← hook text gợi ý (editable textarea)
  │                                 │
  │  [Drop ảnh vào đây]             │ ← upload zone (1-5 ảnh)
  │                                 │
  │              [Chương tiếp →]    │
  └─────────────────────────────────┘
  ```
- Hook text: placeholder = text gợi ý, user gõ đè nếu muốn
- Bấm "Chương tiếp" → save hook text + ảnh → chuyển chương tiếp
- Chapter optional: có thêm nút "Bỏ qua chương này"
- Chương cuối: nút "Hoàn thành" thay vì "Chương tiếp"

**Sau khi hoàn thành setup:**
- Redirect sang trang galaxy bình thường (không có `?setup=true`)
- Form customization thông thường hiện ra (theme, nhạc, template)

### 4c. Upload ảnh trong guided flow

Khi upload trong chapter X:
- `POST /gallary/upload` với thêm body: `stage=memory&order=0,1,2...`
- Backend save `stage` và `order` vào gallery item

### 4d. Galaxy đã có story type — edit flow

Khi user quay lại trang galaxy đã có story, hiện thêm section "Chỉnh sửa câu chuyện":
- List chapters, mỗi chương có thể edit hook text và thêm/xoá ảnh
- Không bắt buộc phải đi qua guided flow lại

---

## 5. SE Viewer — Story Engine Template

### 5a. Route

`GET /view/?galaxyId=xxx`

- Nếu galaxy có `storyType` → phục vụ SE template
- Nếu không → phục vụ Fall/Galaxy như cũ

### 5b. File structure

```
public/story/
  index.html
  js/
    story.js
```

### 5c. Trải nghiệm xem

**Màn hình intro (tap to start):**
```
[Tên galaxy]
[Label occasion: "Một câu chuyện kỷ niệm"]
[Tap để bắt đầu]
```

**Mỗi chapter phát như sau:**
```
1. Hook text fade in — chữ lớn, giữa màn hình, nền tối
   (1 hook text, dùng user's hookText nếu có, fallback hooks[0] từ config)

2. Ảnh của chapter xuất hiện từng cái một
   — ảnh hiện toàn màn hình, tap để xem ảnh tiếp
   — hoặc auto-advance sau 4 giây

3. Hết ảnh của chapter → chuyển chapter tiếp
   (fade to black → hook text mới)
```

**Transition giữa chapters:**
- Fade to black nhẹ (~0.8s)
- Hook text của chapter mới fade in

**Kết thúc SE:**
```
[Màn hình tối]
Text: "Và đây là tất cả ký ức của chúng ta..."
[Pause 2 giây]
        ↓
Launch Fall hoặc Galaxy template
(dùng galaxy.template field, default = galaxy)
```

**Launch Fall/Galaxy:**
- SE gọi `window.location.replace('/view/?galaxyId=xxx&skip_se=true')`
- Server nhận `skip_se=true` → bỏ qua SE, phục vụ Fall/Galaxy trực tiếp

### 5d. Data fetch của SE

```
GET /galaxies/:id/view  → { storyType, occasion, chapters: [{id, hookText}], template }
GET /gallary/items?galaxyId=xxx → sorted by stage+order
GET /shared/story-config.json → local import hoặc bundle vào story.js
```

Nhóm ảnh theo stage:
```js
const grouped = {
  intro:     items.filter(i => i.stage === 'intro').sort(byOrder),
  memory:    items.filter(i => i.stage === 'memory').sort(byOrder),
  highlight: items.filter(i => i.stage === 'highlight').sort(byOrder),
  ending:    items.filter(i => i.stage === 'ending').sort(byOrder),
}
```

Hook text resolution per chapter:
```js
function getHook(chapterId, userChapters, config, occasionId) {
  const userChapter = userChapters.find(c => c.id === chapterId);
  if (userChapter?.hookText) return userChapter.hookText;
  const configChapter = config.occasions[occasionId].chapters.find(c => c.id === chapterId);
  return configChapter.hooks[0];
}
```

---

## 6. API Changes

### 6a. POST /galaxies — tạo galaxy

Không thay đổi. `storyType` và `occasion` sẽ được update sau ở bước setup.

### 6b. PUT /galaxies/:id — update galaxy

Cho phép update thêm: `storyType`, `occasion`, `chapters`.

Subscription gating: `storyType` yêu cầu **Free trở lên** (tất cả user đều được dùng — đây là core value).

### 6c. POST /gallary/upload — upload ảnh

Nhận thêm body fields:
- `stage: String` — chapter id
- `order: Number` — thứ tự trong chapter

### 6d. GET /gallary/items — fetch ảnh public

Thêm sort logic: nếu galaxy có storyType → sort theo stage order + order field.

Stage order map:
```js
const STAGE_ORDER = { intro: 0, memory: 1, highlight: 2, ending: 3 };
```

### 6e. GET /view/ — serve template

```js
if (galaxy.storyType && !req.query.skip_se) {
  // serve SE template
} else {
  // serve Fall/Galaxy như cũ
}
```

---

## 7. Scope

### Trong scope
- Couple Story với 5 occasions
- 4 chapters: intro, memory, highlight, ending
- SE viewer: hook text + photos, tap to advance
- Transition sang Fall/Galaxy ở cuối
- Portal guided setup flow
- Edit chapters sau khi setup

### Ngoài scope (làm sau)
- Các story type khác (birthday, family, friendship...)
- Auto-advance timing config per chapter
- Analytics (story_opened, story_completed, share rate)
- Viral hook trên trang view (CTA tạo story)
- Video export

---

## 8. Build Order

```
1. story-config.json
2. Galaxy model (storyType, occasion, chapters)
3. Gallery model (stage, order)
4. API: PUT /galaxies + POST /gallary/upload + GET /gallary/items sort
5. Portal: guided setup flow
6. SE viewer (public/story/)
7. Route /view/ nhận biết storyType → serve SE
```
