# Auth + User Model — Design Spec (Subsystem 1)

**Date:** 2026-04-23  
**Status:** Approved

## Overview

Thêm authentication và ownership model vào hệ thống. User đăng ký bằng email/password, sở hữu nhiều Galaxy, mỗi Galaxy chứa Gallery items. Thay thế `name` field trong Gallery bằng `galaxyId` để tránh collision và quản lý ownership rõ ràng.

---

## Data Models

### User
```js
{
  email:        String, required, unique
  passwordHash: String, required
  role:         String, enum ["admin", "user"], default "user"
  createdAt:    Date, default Date.now
}
```

### Galaxy
```js
{
  userId:    ObjectId, ref: User, required, index
  name:      String, required               // display name, unique per user
  status:    String, enum ["active", "inactive"], default "active"
  createdAt: Date, default Date.now
}
// compound index: { userId, name } unique
```

### Gallery (thay đổi)
```js
// Bỏ field: name
// Thêm field:
galaxyId: ObjectId, ref: Galaxy, required, index
```

---

## Quan hệ

```
User (1) ──owns──► Galaxy (nhiều) ──contains──► Gallery items (nhiều)
```

---

## APIs

### Auth Routes (`/auth`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|---------|
| POST | `/auth/register` | — | `{ email, password }` | `{ token, user }` |
| POST | `/auth/login` | — | `{ email, password }` | `{ token, user }` |
| GET | `/auth/me` | JWT | — | `{ user, galaxies }` |

**JWT:** access token, expire 7 ngày, lưu `Authorization: Bearer <token>`

### Galaxy Routes (`/galaxies`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|---------|
| POST | `/galaxies` | JWT (user) | `{ name }` | galaxy created |
| GET | `/galaxies/my` | JWT (user) | — | danh sách galaxies của user |
| DELETE | `/galaxies/:id` | JWT (owner) | — | galaxy deleted |

### Gallery Routes (thay đổi)

| Trước | Sau |
|-------|-----|
| `POST /gallary/upload` body: `{ name }` | body: `{ galaxyId }` |
| `GET /gallary/items?name=moon` | `GET /gallary/items?galaxyId=<id>` |

**Bảo vệ upload:** JWT required, `galaxyId` phải thuộc user đang login.

---

## JWT Middleware

File mới: `middlewares/auth.js`
- Đọc `Authorization: Bearer <token>`
- Verify JWT, gắn `req.user` vào request
- Export 2 middleware: `requireAuth` và `requireAdmin`

---

## Migration

Thứ tự thực hiện sau khi deploy:

1. **Tạo User** cho owner (`nguye4567@gmail.com`, role: `admin`)
2. **Tạo 2 Galaxy** documents: `{ name: "moon", userId }` và `{ name: "emiu", userId }`
3. **Update Gallery documents:**
   - Tất cả records có `name: "moon"` → `galaxyId: <moon_galaxy_id>`
   - Tất cả records có `name: "emiu"` → `galaxyId: <emiu_galaxy_id>`
4. **Xóa field `name`** khỏi Gallery documents (sau khi verify)

Script migration: `BE-Moon/scripts/migrate-gallery-to-galaxyid.js`

---

## Frontend

`public/auth/` — trang login/register:
- Form đăng ký: email + password
- Form đăng nhập: email + password
- Sau login: lưu JWT vào localStorage, redirect về `/portal`

`public/galaxy-moon/js/script.js` — thay đổi:
- Đọc `?galaxyId=` thay vì `?name=` từ URL
- Fetch: `/gallary/items?galaxyId=<id>` thay vì `/gallary/items?name=<name>`

---

## Error Cases

| Tình huống | Response |
|-----------|---------|
| Register email đã tồn tại | 409 Conflict |
| Login sai password | 401 Unauthorized |
| JWT invalid/expired | 401 Unauthorized |
| Upload với galaxyId không thuộc user | 403 Forbidden |
| Tạo galaxy trùng tên (cùng user) | 409 Conflict |

---

## Dependencies cần thêm

```bash
npm install bcryptjs jsonwebtoken
```

| Package | Mục đích |
|---------|---------|
| `bcryptjs` | Hash password khi register, verify khi login |
| `jsonwebtoken` | Tạo và verify JWT token |

---

## Files cần tạo/sửa

| File | Action |
|------|--------|
| `models/user.js` | Tạo mới |
| `models/galaxy.js` | Tạo mới |
| `models/gallery.js` | Sửa: bỏ `name`, thêm `galaxyId` |
| `middlewares/auth.js` | Tạo mới (JWT verify) |
| `controllers/auth.controller.js` | Tạo mới |
| `controllers/galaxy.controller.js` | Tạo mới |
| `services/auth.service.js` | Tạo mới |
| `services/galaxy.service.js` | Tạo mới |
| `routes/auth.routes.js` | Tạo mới |
| `routes/galaxies.routes.js` | Tạo mới |
| `routes/index.js` | Sửa: thêm auth + galaxies routes |
| `controllers/gallery.controller.js` | Sửa: dùng `galaxyId` thay `name` |
| `services/gallery.service.js` | Sửa: filter theo `galaxyId` |
| `scripts/migrate-gallery-to-galaxyid.js` | Tạo mới |
| `public/auth/index.html` | Tạo mới |
| `public/galaxy-moon/js/script.js` | Sửa: `?name=` → `?galaxyId=` |
