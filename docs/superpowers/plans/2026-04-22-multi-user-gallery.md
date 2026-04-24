# Multi-User Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm field `name` vào Gallery để phân biệt dữ liệu theo từng user, filter theo `?name=` query param.

**Architecture:** Migration script chạy trước để gán `name="moon"` cho tất cả document hiện tại. BE-Moon thêm `name` vào schema + API. galaxy-moon đọc `name` từ URL query string và truyền vào fetch.

**Tech Stack:** Node.js, Express 5, Mongoose 8, MongoDB, Vanilla JS (Three.js frontend)

---

## File Map

| File | Thay đổi |
|------|---------|
| `BE-Moon/scripts/migrate-name-moon.js` | **Tạo mới** — script update tất cả doc hiện tại → `name: "moon"` |
| `BE-Moon/models/gallery.js` | Thêm field `name` (required, indexed) |
| `BE-Moon/services/gallery.service.js` | Thêm `name` vào `createGallery()`, filter theo `name` trong `getGalleryItems()` |
| `BE-Moon/controllers/gallery.controller.js` | Đọc `name` từ `req.body` (upload) và `req.query` (get), validate required |
| `galaxy-moon/script.js` | Đọc `name` từ `URLSearchParams`, append vào fetch URL |

---

## Task 1: Migration Script

**Files:**
- Create: `BE-Moon/scripts/migrate-name-moon.js`

- [ ] **Step 1: Tạo thư mục scripts**

```bash
mkdir -p /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/scripts
```

- [ ] **Step 2: Tạo file migration**

Tạo file `BE-Moon/scripts/migrate-name-moon.js`:

```js
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

async function migrate() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Connected to database");

  const result = await mongoose
    .connection
    .collection("gallery")
    .updateMany({ name: { $exists: false } }, { $set: { name: "moon" } });

  console.log(`Migration complete: ${result.modifiedCount} documents updated → name="moon"`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Chạy migration**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
node scripts/migrate-name-moon.js
```

Expected output:
```
Connected to database
Migration complete: X documents updated → name="moon"
```

- [ ] **Step 4: Commit**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
git add scripts/migrate-name-moon.js
git commit -m "chore: add migration script to set name=moon on existing gallery docs"
```

---

## Task 2: Cập nhật Gallery Model

**Files:**
- Modify: `BE-Moon/models/gallery.js`

- [ ] **Step 1: Thêm field `name` vào schema**

Sửa `BE-Moon/models/gallery.js` thành:

```js
const { model, Schema } = require("mongoose");

const gallerySchema = new Schema({
  name: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  status: {
    enum: ["active", "inactive"],
    default: "active",
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model("Gallery", gallerySchema, "gallery");
```

- [ ] **Step 2: Commit**

```bash
git add models/gallery.js
git commit -m "feat: add name field to Gallery schema with index"
```

---

## Task 3: Cập nhật GalleryService

**Files:**
- Modify: `BE-Moon/services/gallery.service.js`

- [ ] **Step 1: Thêm `name` vào `createGallery()` và filter trong `getGalleryItems()`**

Sửa `BE-Moon/services/gallery.service.js` thành:

```js
const GalleryModel = require("../models/gallery");
const { errorResponse } = require("../context/responseHandle");

class GalleryService {
  async createGallery({ name, title, description, uploadedFiles = [] }) {
    uploadedFiles.forEach(async (file) => {
      await GalleryModel.create({
        name,
        title,
        description,
        imageUrl: file.url,
      });
    });

    return;
  }

  async getGalleryItems({ name }) {
    const galleryItems = await GalleryModel.find({ name, status: "active" })
      .sort({ createdAt: -1 })
      .limit(200);

    if (!galleryItems) {
      throw new errorResponse({
        message: "error while fetching gallery items",
        statusCode: 404,
      });
    }
    return galleryItems;
  }
}

module.exports = new GalleryService();
```

- [ ] **Step 2: Commit**

```bash
git add services/gallery.service.js
git commit -m "feat: pass name to createGallery and filter getGalleryItems by name"
```

---

## Task 4: Cập nhật GalleryController

**Files:**
- Modify: `BE-Moon/controllers/gallery.controller.js`

- [ ] **Step 1: Đọc và validate `name`**

Sửa `BE-Moon/controllers/gallery.controller.js` thành:

```js
const GalleryService = require("../services/gallery.service");
const { successfullyResponse, errorResponse } = require("../context/responseHandle");

class GalleryController {
  async createGallery(req, res, next) {
    const { name, title, description } = req.body;

    if (!name) {
      return next(new errorResponse({ message: "name is required", statusCode: 400 }));
    }

    const { uploadedFiles } = req;
    await GalleryService.createGallery({ name, title, description, uploadedFiles });

    return new successfullyResponse({
      message: "Gallery item created successfully",
    }).json(res);
  }

  async getGalleryItems(req, res, next) {
    const { name } = req.query;

    if (!name) {
      return next(new errorResponse({ message: "name is required", statusCode: 404 }));
    }

    const galleryItems = await GalleryService.getGalleryItems({ name });
    return new successfullyResponse({
      message: "Gallery items fetched successfully",
      meta: galleryItems,
    }).json(res);
  }
}

module.exports = new GalleryController();
```

- [ ] **Step 2: Verify bằng cách start server và test thủ công**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
npm run dev
```

Test các case:
```bash
# 404 khi không có name
curl http://localhost:3030/gallary/items
# Expected: { statusCode: 404, message: "name is required" }

# 200 với name hợp lệ
curl http://localhost:3030/gallary/items?name=moon
# Expected: { statusCode: 200, meta: [...] }

# 400 khi upload thiếu name
curl -X POST http://localhost:3030/gallary/upload
# Expected: { statusCode: 400, message: "name is required" }
```

- [ ] **Step 3: Commit**

```bash
git add controllers/gallery.controller.js
git commit -m "feat: validate name in controller for upload and get gallery items"
```

---

## Task 5: Cập nhật Frontend galaxy-moon

**Files:**
- Modify: `galaxy-moon/script.js:1511-1523`

- [ ] **Step 1: Đọc `name` từ URL và truyền vào fetch**

Sửa function `getHeartImages()` tại `galaxy-moon/script.js` (line 1511-1523):

```js
async function getHeartImages() {
  let heartImages = [...(window.dataLove2Loveloom?.data?.heartImages || [])];

  const params = new URLSearchParams(window.location.search);
  const name = params.get("name");

  if (!name) {
    console.warn("⚠️ Không có ?name= trong URL, bỏ qua tải ảnh từ server.");
    return heartImages;
  }

  try {
    const res = await fetch(`https://be-moon.onrender.com/gallary/items?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    heartImages.push(...data.meta.map((item) => item.imageUrl));
  } catch (err) {
    console.error("❌ Lỗi khi tải ảnh:", err);
  }

  return heartImages;
}
```

- [ ] **Step 2: Verify trên browser**

Mở file `galaxy-moon/index.html` trên browser (hoặc local server):
- `index.html` (không có `?name`) → console hiện `⚠️ Không có ?name=...`, không có heart cloud
- `index.html?name=moon` → heart cloud hiển thị bình thường với ảnh của `moon`
- `index.html?name=emiu` → heart cloud hiển thị ảnh của `emiu` (nếu có data)

- [ ] **Step 3: Commit**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/galaxy-moon
git add script.js
git commit -m "feat: read name from URL query param and pass to gallery API"
```
