# Multi-User Gallery — Design Spec

**Date:** 2026-04-22  
**Status:** Approved

## Overview

Thêm field `name` vào Gallery để phân biệt dữ liệu theo từng "user" (ví dụ: `moon`, `emiu`). Frontend đọc `name` từ URL query string và truyền vào API call. Không cần authentication — `name` là định danh tĩnh, đơn giản.

---

## Backend (BE-Moon)

### Schema thay đổi

Thêm field `name` vào `models/gallery.js`:

```
name: { type: String, required: true, index: true }
```

Index trên `name` để tối ưu query filter thường xuyên.

### API thay đổi

**`POST /gallary/upload`**
- Thêm `name` vào request body (required)
- Validate: nếu thiếu `name` → trả lỗi 400
- Lưu `name` vào từng document được tạo

**`GET /gallary/items?name=<value>`**
- Thêm filter `{ name }` vào query
- Nếu không có `name` param → trả về 404 (not found)
- Nếu có `name` nhưng không có kết quả → trả về mảng rỗng (đã là behavior hiện tại)

### Files cần sửa

| File | Thay đổi |
|------|---------|
| `models/gallery.js` | Thêm field `name` (required, indexed) |
| `services/gallery.service.js` | Thêm `name` vào `createGallery()`, filter theo `name` trong `getGalleryItems()` |
| `controllers/gallery.controller.js` | Đọc `name` từ `req.body` (upload) và `req.query` (get items), validate required |

---

## Frontend (galaxy-moon)

### Thay đổi

Trong `script.js`, tại chỗ fetch API (line 1515):

1. Đọc `name` từ `window.location.search` (`URLSearchParams`)
2. Nếu không có `name` → không gọi API, bỏ qua heart cloud (hoặc log warning)
3. Nếu có `name` → append vào URL: `https://be-moon.onrender.com/gallary/items?name=<value>`

### Files cần sửa

| File | Thay đổi |
|------|---------|
| `script.js` | Cập nhật fetch URL tại line ~1515 để đọc `name` từ URL params |

---

## Data Flow

```
Upload:
  Client POST /gallary/upload { name, files[] }
    → Multer → ImageKit CDN → MongoDB { name, imageUrl, ... }

Fetch:
  Browser URL: https://galaxy-moon.com/?name=moon
    → script.js đọc URLSearchParams → name = "moon"
    → fetch https://be-moon.onrender.com/gallary/items?name=moon
    → BE filter { name: "moon", status: "active" }
    → trả về imageUrl[] → render heart particle cloud
```

---

## Error Cases

| Tình huống | Behavior |
|-----------|---------|
| Upload thiếu `name` | 400 Bad Request |
| GET `/gallary/items` không có `?name` | 404 Not Found |
| GET với `name` hợp lệ nhưng không có data | 200 + mảng rỗng |
| Frontend URL không có `?name` | Không gọi API, không render heart cloud |

---

## Migration

**Bước đầu tiên trước khi deploy feature:** Chạy migration script để update tất cả document hiện tại chưa có `name` → set `name = "moon"`.

Script migration (`scripts/migrate-name-moon.js`):
```js
// Chạy: node scripts/migrate-name-moon.js
// Update tất cả documents không có field name → name = "moon"
db.gallery.updateMany({ name: { $exists: false } }, { $set: { name: "moon" } })
```

**Thứ tự thực hiện:**
1. Chạy migration script (update existing docs → `name: "moon"`)
2. Deploy BE-Moon (schema + API changes)
3. Deploy galaxy-moon (frontend changes)
