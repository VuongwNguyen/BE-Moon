# Auth + User Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm authentication, User/Galaxy models, và migrate Gallery từ `name` sang `galaxyId` để hỗ trợ multi-user ownership.

**Architecture:** Theo pattern MVC hiện có của dự án (models → services → controllers → routes). Thêm JWT middleware để bảo vệ routes. Gallery.name được thay bằng Galaxy._id reference để tránh collision giữa users.

**Tech Stack:** Express 5, Mongoose 8, bcryptjs, jsonwebtoken, Vanilla JS (auth frontend)

---

## File Map

| File | Action |
|------|--------|
| `models/user.js` | Tạo mới |
| `models/galaxy.js` | Tạo mới |
| `models/gallery.js` | Sửa: bỏ `name`, thêm `galaxyId` |
| `middlewares/auth.js` | Tạo mới — JWT verify middleware |
| `services/auth.service.js` | Tạo mới |
| `services/galaxy.service.js` | Tạo mới (khác với gallery.service.js) |
| `controllers/auth.controller.js` | Tạo mới |
| `controllers/galaxy.controller.js` | Tạo mới (khác với gallery.controller.js) |
| `routes/auth.routes.js` | Tạo mới |
| `routes/galaxies.routes.js` | Tạo mới |
| `routes/index.js` | Sửa: thêm auth + galaxies routes |
| `services/gallery.service.js` | Sửa: `name` → `galaxyId` |
| `controllers/gallery.controller.js` | Sửa: `name` → `galaxyId`, thêm auth check |
| `routes/gallary.routes.js` | Sửa: thêm `requireAuth` cho upload |
| `scripts/migrate-gallery-to-galaxyid.js` | Tạo mới |
| `public/galaxy-moon/js/script.js` | Sửa: `?name=` → `?galaxyId=` |
| `public/auth/index.html` | Tạo mới |

---

## Task 1: Cài dependencies

**Files:**
- Modify: `BE-Moon/package.json`

- [ ] **Step 1: Cài bcryptjs và jsonwebtoken**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
npm install bcryptjs jsonwebtoken
```

Expected: packages added to node_modules và package.json

- [ ] **Step 2: Verify**

```bash
node -e "require('bcryptjs'); require('jsonwebtoken'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add bcryptjs and jsonwebtoken dependencies"
```

---

## Task 2: User Model

**Files:**
- Create: `BE-Moon/models/user.js`

- [ ] **Step 1: Tạo User model**

```js
const { model, Schema } = require("mongoose");

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model("User", userSchema, "users");
```

Lưu vào `/home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/models/user.js`

- [ ] **Step 2: Verify syntax**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
node -e "require('./models/user'); console.log('User model OK')"
```

Expected: `User model OK`

- [ ] **Step 3: Commit**

```bash
git add models/user.js
git commit -m "feat: add User model"
```

---

## Task 3: Galaxy Model

**Files:**
- Create: `BE-Moon/models/galaxy.js`

- [ ] **Step 1: Tạo Galaxy model**

```js
const { model, Schema } = require("mongoose");

const galaxySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
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

// name unique per user (2 users can have galaxy "moon" but not same user)
galaxySchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = model("Galaxy", galaxySchema, "galaxies");
```

Lưu vào `/home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/models/galaxy.js`

- [ ] **Step 2: Verify syntax**

```bash
node -e "require('./models/galaxy'); console.log('Galaxy model OK')"
```

Expected: `Galaxy model OK`

- [ ] **Step 3: Commit**

```bash
git add models/galaxy.js
git commit -m "feat: add Galaxy model with compound unique index"
```

---

## Task 4: Cập nhật Gallery Model

**Files:**
- Modify: `BE-Moon/models/gallery.js`

- [ ] **Step 1: Sửa gallery.js — bỏ `name`, thêm `galaxyId`**

```js
const { model, Schema } = require("mongoose");

const gallerySchema = new Schema({
  galaxyId: {
    type: Schema.Types.ObjectId,
    ref: "Galaxy",
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

- [ ] **Step 2: Verify syntax**

```bash
node -e "require('./models/gallery'); console.log('Gallery model OK')"
```

Expected: `Gallery model OK`

- [ ] **Step 3: Commit**

```bash
git add models/gallery.js
git commit -m "feat: replace name field with galaxyId in Gallery model"
```

---

## Task 5: JWT Auth Middleware

**Files:**
- Create: `BE-Moon/middlewares/auth.js`

- [ ] **Step 1: Tạo auth middleware**

Thêm `JWT_SECRET` vào `.env`:
```
JWT_SECRET=your_secret_key_here_change_in_production
```

Tạo `/home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/middlewares/auth.js`:

```js
const jwt = require("jsonwebtoken");
const { errorResponse } = require("../context/responseHandle");

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new errorResponse({ message: "Unauthorized", statusCode: 401 }));
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return next(new errorResponse({ message: "Invalid or expired token", statusCode: 401 }));
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new errorResponse({ message: "Forbidden", statusCode: 403 }));
  }
  next();
};

module.exports = { requireAuth, requireAdmin };
```

- [ ] **Step 2: Verify syntax**

```bash
node -e "require('./middlewares/auth'); console.log('Auth middleware OK')"
```

Expected: `Auth middleware OK`

- [ ] **Step 3: Commit**

```bash
git add middlewares/auth.js
git commit -m "feat: add JWT auth middleware (requireAuth, requireAdmin)"
```

---

## Task 6: Auth Service + Controller + Routes

**Files:**
- Create: `BE-Moon/services/auth.service.js`
- Create: `BE-Moon/controllers/auth.controller.js`
- Create: `BE-Moon/routes/auth.routes.js`
- Modify: `BE-Moon/routes/index.js`

- [ ] **Step 1: Tạo auth.service.js**

```js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user");
const { errorResponse } = require("../context/responseHandle");

class AuthService {
  async register({ email, password }) {
    const existing = await UserModel.findOne({ email });
    if (existing) {
      throw new errorResponse({ message: "Email already exists", statusCode: 409 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ email, passwordHash });
    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return { token, user: { _id: user._id, email: user.email, role: user.role } };
  }

  async login({ email, password }) {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new errorResponse({ message: "Invalid credentials", statusCode: 401 });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new errorResponse({ message: "Invalid credentials", statusCode: 401 });
    }
    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return { token, user: { _id: user._id, email: user.email, role: user.role } };
  }

  async me(userId) {
    const GalaxyModel = require("../models/galaxy");
    const user = await UserModel.findById(userId).select("-passwordHash");
    if (!user) {
      throw new errorResponse({ message: "User not found", statusCode: 404 });
    }
    const galaxies = await GalaxyModel.find({ userId, status: "active" });
    return { user, galaxies };
  }
}

module.exports = new AuthService();
```

- [ ] **Step 2: Tạo auth.controller.js**

```js
const AuthService = require("../services/auth.service");
const { successfullyResponse, errorResponse } = require("../context/responseHandle");

class AuthController {
  async register(req, res, next) {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new errorResponse({ message: "email and password are required", statusCode: 400 }));
    }
    const result = await AuthService.register({ email, password });
    return new successfullyResponse({
      message: "Registered successfully",
      meta: result,
      statusCode: 201,
    }).json(res);
  }

  async login(req, res, next) {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new errorResponse({ message: "email and password are required", statusCode: 400 }));
    }
    const result = await AuthService.login({ email, password });
    return new successfullyResponse({
      message: "Login successful",
      meta: result,
    }).json(res);
  }

  async me(req, res, next) {
    const result = await AuthService.me(req.user._id);
    return new successfullyResponse({
      message: "User info fetched",
      meta: result,
    }).json(res);
  }
}

module.exports = new AuthController();
```

- [ ] **Step 3: Tạo auth.routes.js**

```js
const router = require("express").Router();
const asyncHandler = require("../context/asyncHandler");
const { requireAuth } = require("../middlewares/auth");
const AuthController = require("../controllers/auth.controller");

router.post("/register", asyncHandler(AuthController.register));
router.post("/login", asyncHandler(AuthController.login));
router.get("/me", requireAuth, asyncHandler(AuthController.me));

module.exports = router;
```

- [ ] **Step 4: Cập nhật routes/index.js — chỉ thêm auth route**

```js
const router = require("express").Router();

router.use("/gallary", require("./gallary.routes"));
router.use("/auth", require("./auth.routes"));

module.exports = router;
```

(galaxies route sẽ được thêm ở Task 7 sau khi galaxies.routes.js được tạo)

- [ ] **Step 5: Verify bằng cách start server**

```bash
npm run dev
```

Test:
```bash
# Register
curl -X POST http://localhost:3030/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
# Expected: { statusCode: 201, meta: { token: "...", user: {...} } }

# Login
curl -X POST http://localhost:3030/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
# Expected: { statusCode: 200, meta: { token: "...", user: {...} } }
```

- [ ] **Step 6: Commit**

```bash
git add services/auth.service.js controllers/auth.controller.js routes/auth.routes.js routes/index.js
git commit -m "feat: add auth register/login/me endpoints"
```

---

## Task 7: Galaxy Service + Controller + Routes

**Files:**
- Create: `BE-Moon/services/galaxy.service.js`
- Create: `BE-Moon/controllers/galaxy.controller.js`
- Create: `BE-Moon/routes/galaxies.routes.js`

- [ ] **Step 1: Tạo galaxy.service.js**

```js
const GalaxyModel = require("../models/galaxy");
const { errorResponse } = require("../context/responseHandle");

class GalaxyService {
  async createGalaxy({ userId, name }) {
    const existing = await GalaxyModel.findOne({ userId, name });
    if (existing) {
      throw new errorResponse({ message: "Galaxy name already exists", statusCode: 409 });
    }
    return await GalaxyModel.create({ userId, name });
  }

  async getMyGalaxies(userId) {
    return await GalaxyModel.find({ userId, status: "active" }).sort({ createdAt: -1 });
  }

  async deleteGalaxy({ galaxyId, userId }) {
    const galaxy = await GalaxyModel.findById(galaxyId);
    if (!galaxy) {
      throw new errorResponse({ message: "Galaxy not found", statusCode: 404 });
    }
    if (galaxy.userId.toString() !== userId.toString()) {
      throw new errorResponse({ message: "Forbidden", statusCode: 403 });
    }
    await GalaxyModel.findByIdAndDelete(galaxyId);
  }
}

module.exports = new GalaxyService();
```

- [ ] **Step 2: Tạo galaxy.controller.js**

```js
const GalaxyService = require("../services/galaxy.service");
const { successfullyResponse, errorResponse } = require("../context/responseHandle");

class GalaxyController {
  async createGalaxy(req, res, next) {
    const { name } = req.body;
    if (!name) {
      return next(new errorResponse({ message: "name is required", statusCode: 400 }));
    }
    const galaxy = await GalaxyService.createGalaxy({ userId: req.user._id, name });
    return new successfullyResponse({
      message: "Galaxy created",
      meta: galaxy,
      statusCode: 201,
    }).json(res);
  }

  async getMyGalaxies(req, res, next) {
    const galaxies = await GalaxyService.getMyGalaxies(req.user._id);
    return new successfullyResponse({
      message: "Galaxies fetched",
      meta: galaxies,
    }).json(res);
  }

  async deleteGalaxy(req, res, next) {
    await GalaxyService.deleteGalaxy({ galaxyId: req.params.id, userId: req.user._id });
    return new successfullyResponse({ message: "Galaxy deleted" }).json(res);
  }
}

module.exports = new GalaxyController();
```

- [ ] **Step 3: Tạo galaxies.routes.js và cập nhật routes/index.js**

Tạo `routes/galaxies.routes.js`:
```js
const router = require("express").Router();
const asyncHandler = require("../context/asyncHandler");
const { requireAuth } = require("../middlewares/auth");
const GalaxyController = require("../controllers/galaxy.controller");

router.post("/", requireAuth, asyncHandler(GalaxyController.createGalaxy));
router.get("/my", requireAuth, asyncHandler(GalaxyController.getMyGalaxies));
router.delete("/:id", requireAuth, asyncHandler(GalaxyController.deleteGalaxy));

module.exports = router;
```

Cập nhật `routes/index.js` — thêm galaxies route:
```js
const router = require("express").Router();

router.use("/gallary", require("./gallary.routes"));
router.use("/auth", require("./auth.routes"));
router.use("/galaxies", require("./galaxies.routes"));

module.exports = router;
```

- [ ] **Step 4: Verify**

```bash
# Dùng token từ task trước
TOKEN="<token_từ_login>"

curl -X POST http://localhost:3030/galaxies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"test-galaxy"}'
# Expected: { statusCode: 201, meta: { _id: "...", name: "test-galaxy", ... } }

curl http://localhost:3030/galaxies/my \
  -H "Authorization: Bearer $TOKEN"
# Expected: { meta: [{ _id: "...", name: "test-galaxy" }] }
```

- [ ] **Step 5: Commit**

```bash
git add services/galaxy.service.js controllers/galaxy.controller.js routes/galaxies.routes.js routes/index.js
git commit -m "feat: add galaxy CRUD endpoints (create, list, delete)"
```

---

## Task 8: Cập nhật Gallery Service + Controller

**Files:**
- Modify: `BE-Moon/services/gallery.service.js`
- Modify: `BE-Moon/controllers/gallery.controller.js`
- Modify: `BE-Moon/routes/gallary.routes.js`

- [ ] **Step 1: Cập nhật gallery.service.js**

```js
const GalleryModel = require("../models/gallery");
const GalaxyModel = require("../models/galaxy");
const { errorResponse } = require("../context/responseHandle");

class GalleryService {
  async createGallery({ galaxyId, title, description, uploadedFiles = [] }) {
    uploadedFiles.forEach(async (file) => {
      await GalleryModel.create({
        galaxyId,
        title,
        description,
        imageUrl: file.url,
      });
    });
    return;
  }

  async getGalleryItems({ galaxyId }) {
    const galleryItems = await GalleryModel.find({ galaxyId, status: "active" })
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

- [ ] **Step 2: Cập nhật gallery.controller.js**

```js
const GalleryService = require("../services/gallery.service");
const GalaxyModel = require("../models/galaxy");
const { successfullyResponse, errorResponse } = require("../context/responseHandle");

class GalleryController {
  async createGallery(req, res, next) {
    const { galaxyId, title, description } = req.body;

    if (!galaxyId) {
      return next(new errorResponse({ message: "galaxyId is required", statusCode: 400 }));
    }

    // Verify galaxy thuộc về user đang login
    const galaxy = await GalaxyModel.findById(galaxyId);
    if (!galaxy) {
      return next(new errorResponse({ message: "Galaxy not found", statusCode: 404 }));
    }
    if (galaxy.userId.toString() !== req.user._id.toString()) {
      return next(new errorResponse({ message: "Forbidden", statusCode: 403 }));
    }

    const { uploadedFiles } = req;
    await GalleryService.createGallery({ galaxyId, title, description, uploadedFiles });

    return new successfullyResponse({
      message: "Gallery item created successfully",
    }).json(res);
  }

  async getGalleryItems(req, res, next) {
    const { galaxyId } = req.query;

    if (!galaxyId) {
      return next(new errorResponse({ message: "galaxyId is required", statusCode: 404 }));
    }

    const galleryItems = await GalleryService.getGalleryItems({ galaxyId });
    return new successfullyResponse({
      message: "Gallery items fetched successfully",
      meta: galleryItems,
    }).json(res);
  }
}

module.exports = new GalleryController();
```

- [ ] **Step 3: Cập nhật gallary.routes.js — thêm requireAuth cho upload**

```js
const asyncHandler = require("../context/asyncHandler");
const router = require("express").Router();
const uploader = require("../middlewares/uploader");
const ImageKit = require("../middlewares/ImageKit");
const { requireAuth } = require("../middlewares/auth");
const GalleryController = require("../controllers/gallery.controller");

router.post(
  "/upload",
  requireAuth,
  uploader.array("files", 50),
  ImageKit.uploadImage,
  asyncHandler(GalleryController.createGallery)
);
router.get(
  "/items",
  asyncHandler(GalleryController.getGalleryItems)
);

module.exports = router;
```

- [ ] **Step 4: Verify**

```bash
# GET items không có galaxyId → 404
curl http://localhost:3030/gallary/items
# Expected: { statusCode: 404, message: "galaxyId is required" }

# GET items với galaxyId hợp lệ
GALAXY_ID="<id_từ_task_7>"
curl "http://localhost:3030/gallary/items?galaxyId=$GALAXY_ID"
# Expected: { statusCode: 200, meta: [] }
```

- [ ] **Step 5: Commit**

```bash
git add services/gallery.service.js controllers/gallery.controller.js routes/gallary.routes.js
git commit -m "feat: update gallery to use galaxyId instead of name"
```

---

## Task 9: Migration Script

**Files:**
- Create: `BE-Moon/scripts/migrate-gallery-to-galaxyid.js`

- [ ] **Step 1: Tạo migration script**

```js
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function migrate() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Connected to database");

  try {
    const UserModel = require("../models/user");
    const GalaxyModel = require("../models/galaxy");

    // 1. Tạo user owner nếu chưa có
    let owner = await UserModel.findOne({ email: "nguye4567@gmail.com" });
    if (!owner) {
      const passwordHash = await bcrypt.hash("changeme123", 10);
      owner = await UserModel.create({
        email: "nguye4567@gmail.com",
        passwordHash,
        role: "admin",
      });
      console.log(`Created owner user: ${owner._id}`);
    } else {
      console.log(`Owner already exists: ${owner._id}`);
    }

    // 2. Tạo Galaxy "moon" nếu chưa có
    let moonGalaxy = await GalaxyModel.findOne({ userId: owner._id, name: "moon" });
    if (!moonGalaxy) {
      moonGalaxy = await GalaxyModel.create({ userId: owner._id, name: "moon" });
      console.log(`Created galaxy moon: ${moonGalaxy._id}`);
    } else {
      console.log(`Galaxy moon exists: ${moonGalaxy._id}`);
    }

    // 3. Tạo Galaxy "emiu" nếu chưa có
    let emiuGalaxy = await GalaxyModel.findOne({ userId: owner._id, name: "emiu" });
    if (!emiuGalaxy) {
      emiuGalaxy = await GalaxyModel.create({ userId: owner._id, name: "emiu" });
      console.log(`Created galaxy emiu: ${emiuGalaxy._id}`);
    } else {
      console.log(`Galaxy emiu exists: ${emiuGalaxy._id}`);
    }

    // 4. Update Gallery documents: name "moon" → galaxyId
    const moonResult = await mongoose.connection.collection("gallery").updateMany(
      { name: "moon" },
      { $set: { galaxyId: moonGalaxy._id }, $unset: { name: "" } }
    );
    console.log(`Moon gallery updated: ${moonResult.modifiedCount} documents`);

    // 5. Update Gallery documents: name "emiu" → galaxyId
    const emiuResult = await mongoose.connection.collection("gallery").updateMany(
      { name: "emiu" },
      { $set: { galaxyId: emiuGalaxy._id }, $unset: { name: "" } }
    );
    console.log(`Emiu gallery updated: ${emiuResult.modifiedCount} documents`);

    console.log("\n=== Migration complete ===");
    console.log(`Moon galaxy ID: ${moonGalaxy._id}`);
    console.log(`Emiu galaxy ID: ${emiuGalaxy._id}`);
    console.log("\nUpdate frontend URLs:");
    console.log(`  moon: /galaxy-moon/?galaxyId=${moonGalaxy._id}`);
    console.log(`  emiu: /galaxy-moon/?galaxyId=${emiuGalaxy._id}`);
  } finally {
    await mongoose.disconnect();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Chạy migration**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
node scripts/migrate-gallery-to-galaxyid.js
```

Expected output:
```
Connected to database
Created owner user: <id>
Created galaxy moon: <moon_id>
Created galaxy emiu: <emiu_id>
Moon gallery updated: 603 documents
Emiu gallery updated: 44 documents
=== Migration complete ===
Moon galaxy ID: <moon_id>
Emiu galaxy ID: <emiu_id>
Update frontend URLs:
  moon: /galaxy-moon/?galaxyId=<moon_id>
  emiu: /galaxy-moon/?galaxyId=<emiu_id>
```

**Lưu lại 2 galaxy IDs từ output để dùng ở Task 10.**

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-gallery-to-galaxyid.js
git commit -m "chore: add migration script to convert gallery name to galaxyId"
```

---

## Task 10: Cập nhật Frontend galaxy-moon

**Files:**
- Modify: `BE-Moon/public/galaxy-moon/js/script.js`

- [ ] **Step 1: Đổi `?name=` → `?galaxyId=` trong getHeartImages()**

Tìm đoạn code trong `public/galaxy-moon/js/script.js` (khoảng line 1511-1531):

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
    const res = await fetch(`/gallary/items?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    heartImages.push(...data.meta.map((item) => item.imageUrl));
  } catch (err) {
    console.error("❌ Lỗi khi tải ảnh:", err);
  }

  return heartImages;
}
```

Đổi thành:

```js
async function getHeartImages() {
  let heartImages = [...(window.dataLove2Loveloom?.data?.heartImages || [])];

  const params = new URLSearchParams(window.location.search);
  const galaxyId = params.get("galaxyId");

  if (!galaxyId) {
    console.warn("⚠️ Không có ?galaxyId= trong URL, bỏ qua tải ảnh từ server.");
    return heartImages;
  }

  try {
    const res = await fetch(`/gallary/items?galaxyId=${encodeURIComponent(galaxyId)}`);
    const data = await res.json();
    heartImages.push(...data.meta.map((item) => item.imageUrl));
  } catch (err) {
    console.error("❌ Lỗi khi tải ảnh:", err);
  }

  return heartImages;
}
```

- [ ] **Step 2: Verify**

```bash
grep -n "galaxyId\|name=" /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public/galaxy-moon/js/script.js | grep -i "getHeart\|params\|fetch\|warn"
```

Expected: Không còn `?name=`, chỉ còn `?galaxyId=`

- [ ] **Step 3: Commit và push**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
git add public/galaxy-moon/js/script.js
git commit -m "feat: update galaxy-moon frontend to use galaxyId param"
git push
```

---

## Task 11: Auth Frontend

**Files:**
- Create: `BE-Moon/public/auth/index.html`

- [ ] **Step 1: Tạo thư mục**

```bash
mkdir -p /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon/public/auth
```

- [ ] **Step 2: Tạo public/auth/index.html**

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login — Galaxy</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background: #0a0a1f;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
      color: #fff;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 32px;
      width: 360px;
    }
    h2 { text-align: center; margin-bottom: 24px; color: #e0b3ff; }
    .tabs { display: flex; margin-bottom: 24px; gap: 8px; }
    .tab {
      flex: 1; padding: 8px; border: none; border-radius: 6px;
      cursor: pointer; background: rgba(255,255,255,0.08); color: #fff;
    }
    .tab.active { background: #a259f7; }
    input {
      width: 100%; padding: 10px 12px; margin-bottom: 12px;
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px; color: #fff; font-size: 14px;
    }
    button[type=submit] {
      width: 100%; padding: 12px; background: #a259f7;
      border: none; border-radius: 6px; color: #fff;
      font-size: 15px; cursor: pointer; margin-top: 4px;
    }
    button[type=submit]:hover { background: #8b3de8; }
    .msg { text-align: center; margin-top: 12px; font-size: 13px; min-height: 20px; }
    .msg.error { color: #ff6b6b; }
    .msg.success { color: #6bffb8; }
  </style>
</head>
<body>
  <div class="card">
    <h2>✨ Galaxy</h2>
    <div class="tabs">
      <button class="tab active" onclick="switchTab('login')">Đăng nhập</button>
      <button class="tab" onclick="switchTab('register')">Đăng ký</button>
    </div>
    <form id="form">
      <input type="email" id="email" placeholder="Email" required />
      <input type="password" id="password" placeholder="Password" required />
      <button type="submit" id="submit-btn">Đăng nhập</button>
    </form>
    <div class="msg" id="msg"></div>
  </div>

  <script>
    let mode = 'login';

    function switchTab(tab) {
      mode = tab;
      document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
      });
      document.getElementById('submit-btn').textContent = tab === 'login' ? 'Đăng nhập' : 'Đăng ký';
      document.getElementById('msg').textContent = '';
    }

    document.getElementById('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const msg = document.getElementById('msg');
      msg.textContent = '';

      try {
        const res = await fetch(`/auth/${mode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          msg.className = 'msg error';
          msg.textContent = data.message || 'Có lỗi xảy ra';
          return;
        }
        localStorage.setItem('token', data.meta.token);
        localStorage.setItem('user', JSON.stringify(data.meta.user));
        msg.className = 'msg success';
        msg.textContent = 'Thành công! Đang chuyển hướng...';
        setTimeout(() => { window.location.href = '/portal'; }, 800);
      } catch {
        msg.className = 'msg error';
        msg.textContent = 'Lỗi kết nối server';
      }
    });
  </script>
</body>
</html>
```

- [ ] **Step 3: Test trên browser**

Mở: `http://localhost:3030/auth/`

Expected: Trang login/register hiển thị, có thể switch tab, đăng nhập được với tài khoản đã tạo ở migration.

- [ ] **Step 4: Commit và push**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
git add public/auth/index.html
git commit -m "feat: add auth login/register frontend page"
git push
```
