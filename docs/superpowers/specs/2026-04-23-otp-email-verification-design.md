# OTP Email Verification — Design Spec

**Date:** 2026-04-23  
**Status:** Approved

## Overview

Thêm xác thực email bằng OTP 6 số khi đăng ký tài khoản. Dùng nodemailer + Gmail App Password. User phải nhập OTP trước khi tài khoản được kích hoạt và JWT được cấp.

---

## User Model thêm fields

```js
isVerified:   Boolean, default: false
otpCode:      String   // bcrypt hash của 6 số OTP
otpExpiresAt: Date     // hết hạn sau 5 phút
otpSentAt:    Date     // dùng để rate limit resend (1 phút)
```

---

## API

| Method | Path | Body | Mô tả |
|--------|------|------|-------|
| POST | `/auth/register` | `{ email, password }` | Tạo/ghi đè user chưa verify + gửi OTP |
| POST | `/auth/verify-otp` | `{ email, otp }` | Verify OTP → trả JWT |
| POST | `/auth/resend-otp` | `{ email }` | Gửi lại OTP (rate limit 1 phút) |
| POST | `/auth/login` | `{ email, password }` | Nếu chưa verify → 403 + auto resend OTP |

---

## Logic các case

| Tình huống | Xử lý |
|-----------|-------|
| Register email mới | Tạo user `isVerified:false`, hash + lưu OTP, gửi email |
| Register email chưa verify | Ghi đè OTP mới (reset otpCode, otpExpiresAt, otpSentAt), gửi lại |
| Register email đã verify | 409 "Email already exists" |
| Login chưa verify | 403 "Email not verified" + auto resend OTP (nếu chưa trong rate limit) |
| Login đã verify + pass đúng | JWT như cũ |
| verify-otp đúng + còn hạn | Set `isVerified:true`, xóa otpCode/otpExpiresAt, trả JWT |
| verify-otp sai | 400 "Invalid OTP" |
| verify-otp hết hạn | 400 "OTP expired, please request a new one" |
| resend-otp trong vòng 1 phút | 429 "Please wait before requesting a new OTP" |

---

## OTP Generation

- 6 chữ số ngẫu nhiên: `Math.floor(100000 + Math.random() * 900000).toString()`
- Hash bằng bcrypt trước khi lưu vào DB
- Verify bằng `bcrypt.compare(inputOtp, user.otpCode)`

---

## Email Template

Subject: `[Galaxy] Mã xác thực của bạn`

Body:
```
Mã OTP của bạn là: 123456
Mã có hiệu lực trong 5 phút.
Không chia sẻ mã này với ai.
```

---

## Nodemailer Config

```js
// .env
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

// transporter
nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
})
```

---

## Frontend thay đổi (public/auth/index.html)

**Màn hình 1 (hiện tại):** Form register/login

**Màn hình 2 (mới):** Form nhập OTP — hiện sau khi register hoặc login chưa verify
- Input 6 chữ số
- Nút "Xác thực"
- Nút "Gửi lại OTP" — disabled 60s đếm ngược sau mỗi lần gửi
- Email được hiển thị để user biết OTP gửi về đâu

**Flow frontend:**
1. Register thành công → switch sang màn OTP (lưu email vào state)
2. Login chưa verify → server trả 403 → switch sang màn OTP
3. OTP đúng → lưu JWT → redirect `/portal/`

---

## Dependencies cần thêm

```bash
npm install nodemailer
```

---

## Files cần tạo/sửa

| File | Action |
|------|--------|
| `models/user.js` | Thêm `isVerified`, `otpCode`, `otpExpiresAt`, `otpSentAt` |
| `services/email.service.js` | Tạo mới — nodemailer transporter + sendOtp() |
| `services/auth.service.js` | Sửa: register, login, thêm verifyOtp, resendOtp |
| `controllers/auth.controller.js` | Sửa: thêm verifyOtp, resendOtp handlers |
| `routes/auth.routes.js` | Thêm POST /verify-otp, POST /resend-otp |
| `public/auth/index.html` | Thêm màn OTP |
