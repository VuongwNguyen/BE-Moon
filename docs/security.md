# Security Review — BE-Moon

> Reviewed: 2026-04-24

---

## Điểm mạnh ✅

- JWT `Bearer` token, verify đúng cách
- `requireAuth` + `requireAdmin` + `requireSubscription` tách biệt rõ ràng
- Password & OTP đều hash bằng `bcryptjs` (salt 10)
- OTP TTL 5 phút, cooldown resend 60 giây, xóa sạch sau verify
- `helmet` với CSP tùy chỉnh
- CORS whitelist từ env `ALLOWED_ORIGINS`
- Rate limiting 3 tầng: auth (10/15min), payment (20/15min), API (300/15min)
- Body size limit 2MB
- Stack trace không leak ra production
- `.env` trong `.gitignore`

---

## Hạn chế & Đề xuất

### 🔴 Cao

**1. OTP dùng `Math.random()` — không đủ entropy**
```js
// ❌ Hiện tại
Math.floor(100000 + Math.random() * 900000)

// ✅ Fix
const { randomInt } = require("crypto");
const otp = randomInt(100000, 1000000).toString();
```

**2. Không giới hạn số lần thử OTP**
User có thể brute force OTP cho đến khi đúng. Thêm attempt counter vào User model:
```js
otpAttempts: { type: Number, default: 0 }
// Nếu sai: ++otpAttempts. Nếu >= 5: xóa OTP, yêu cầu register lại
```

**3. `JWT_SECRET` không được kiểm tra khi khởi động**
Nếu env không set, jwt vẫn sign với `undefined` key. Thêm fail-fast check ở `index.js`:
```js
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
```

### 🟡 Trung bình

**4. Rate limiter bị skip hoàn toàn ở dev**
```js
skip: () => isDev  // auth limiter cũng bị skip
```
Nên chỉ skip ở môi trường test, không skip toàn bộ dev để tránh bỏ sót lỗi.

**5. Thiếu input validation**
Không validate email format hay password strength. Dùng `zod` hoặc `express-validator` ở route/controller level.

**6. JWT role không re-validate từ DB**
Nếu role thay đổi trong DB, token cũ vẫn hợp lệ 7 ngày. Không có blacklist/revoke mechanism.  
Giải pháp ngắn hạn: giảm `expiresIn` xuống `1d`. Dài hạn: thêm token version vào User model.

**7. Login không có account lockout**
Rate limiter chỉ theo IP. Không có cơ chế khóa account sau N lần sai password.

### 🟢 Thấp

**8. CSP có `'unsafe-inline'`**
Giảm hiệu quả bảo vệ XSS. Nên dùng nonce-based CSP nếu có thể.

**9. `requireSubscription` thiếu try/catch**
DB lỗi sẽ throw unhandled error. Bọc logic trong try/catch và gọi `next(err)`.

**10. `me` endpoint không phân trang galaxies**
Nếu user có nhiều galaxy, response có thể rất lớn. Thêm limit hoặc pagination.

**11. `cookieParser` không cần thiết nếu không dùng cookie**
Token đang truyền qua `Authorization` header. Nếu không dùng cookie, bỏ `cookieParser` để giảm attack surface.  
Hoặc ngược lại: chuyển sang `httpOnly cookie` để chống XSS tốt hơn Bearer token.

**12. Thiếu HTTPS enforcement**
Nếu không deploy qua reverse proxy, nên bật `Strict-Transport-Security` header trong helmet.

---

## Thứ tự ưu tiên fix

| # | Việc cần làm | Độ ưu tiên |
|---|---|---|
| 1 | Dùng `crypto.randomInt` cho OTP | 🔴 Cao |
| 2 | Thêm OTP attempt limit | 🔴 Cao |
| 3 | Fail-fast check `JWT_SECRET` | 🔴 Cao |
| 4 | Input validation (email, password) | 🟡 Trung bình |
| 5 | JWT revocation / token version | 🟡 Trung bình |
| 6 | Account lockout sau N lần sai | 🟡 Trung bình |
| 7 | try/catch trong `requireSubscription` | 🟢 Thấp |
| 8 | Phân trang `me` endpoint | 🟢 Thấp |
