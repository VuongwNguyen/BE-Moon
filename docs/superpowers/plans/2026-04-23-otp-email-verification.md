# OTP Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm xác thực email bằng OTP 6 số khi đăng ký, dùng nodemailer + Gmail.

**Architecture:** Thêm OTP fields vào User model. Email service riêng dùng nodemailer. Auth service xử lý toàn bộ logic OTP (generate, hash, verify, resend). Frontend thêm màn nhập OTP sau register/login chưa verify.

**Tech Stack:** Express 5, Mongoose 8, bcryptjs, jsonwebtoken, nodemailer, Gmail SMTP

---

## File Map

| File | Action |
|------|--------|
| `models/user.js` | Thêm `isVerified`, `otpCode`, `otpExpiresAt`, `otpSentAt` |
| `services/email.service.js` | Tạo mới — nodemailer transporter + sendOtp() |
| `services/auth.service.js` | Sửa register, login + thêm verifyOtp, resendOtp |
| `controllers/auth.controller.js` | Thêm verifyOtp, resendOtp handlers |
| `routes/auth.routes.js` | Thêm POST /verify-otp, POST /resend-otp |
| `public/auth/index.html` | Thêm màn OTP (screen 2) |

---

## Task 1: Cài nodemailer + cấu hình .env

**Files:**
- Modify: `BE-Moon/package.json`

- [ ] **Step 1: Cài nodemailer**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
npm install nodemailer
```

- [ ] **Step 2: Thêm Gmail credentials vào .env**

Thêm vào `.env` (thay bằng thông tin thật):
```
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

> Lấy App Password: Google Account → Security → 2-Step Verification → App passwords

- [ ] **Step 3: Verify**

```bash
node -e "require('nodemailer'); console.log('nodemailer OK')"
```

Expected: `nodemailer OK`

- [ ] **Step 4: Update yarn.lock và commit**

```bash
yarn install
git add package.json package-lock.json yarn.lock
git commit -m "chore: add nodemailer dependency"
```

---

## Task 2: Cập nhật User Model

**Files:**
- Modify: `BE-Moon/models/user.js`

- [ ] **Step 1: Thêm OTP fields vào User schema**

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
  isVerified: {
    type: Boolean,
    default: false,
  },
  otpCode: {
    type: String,
    default: null,
  },
  otpExpiresAt: {
    type: Date,
    default: null,
  },
  otpSentAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model("User", userSchema, "users");
```

- [ ] **Step 2: Verify syntax**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
node -e "require('./models/user'); console.log('User model OK')"
```

Expected: `User model OK`

- [ ] **Step 3: Patch existing admin user — set isVerified: true**

```bash
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE_URL).then(async () => {
  const result = await mongoose.connection.collection('users').updateMany(
    { isVerified: { \$exists: false } },
    { \$set: { isVerified: true, otpCode: null, otpExpiresAt: null, otpSentAt: null } }
  );
  console.log('Patched:', result.modifiedCount, 'users');
  await mongoose.disconnect();
}).catch(console.error);
"
```

Expected: `Patched: X users` (tất cả user hiện tại được set `isVerified: true`)

- [ ] **Step 4: Commit**

```bash
git add models/user.js
git commit -m "feat: add OTP fields to User model (isVerified, otpCode, otpExpiresAt, otpSentAt)"
```

---

## Task 3: Email Service

**Files:**
- Create: `BE-Moon/services/email.service.js`

- [ ] **Step 1: Tạo email.service.js**

```js
const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  async sendOtp(email, otp) {
    await this.transporter.sendMail({
      from: `"Galaxy ✨" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "[Galaxy] Mã xác thực của bạn",
      text: `Mã OTP của bạn là: ${otp}\nMã có hiệu lực trong 5 phút.\nKhông chia sẻ mã này với ai.`,
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px;background:#0a0a1f;color:#fff;border-radius:12px;">
          <h2 style="color:#e0b3ff;text-align:center;">✨ Galaxy</h2>
          <p style="margin:16px 0;">Mã OTP xác thực email của bạn:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;color:#a259f7;padding:16px;background:rgba(162,89,247,0.1);border-radius:8px;">
            ${otp}
          </div>
          <p style="margin-top:16px;font-size:13px;color:rgba(255,255,255,0.5);">
            Mã có hiệu lực trong 5 phút. Không chia sẻ mã này với ai.
          </p>
        </div>
      `,
    });
  }
}

module.exports = new EmailService();
```

- [ ] **Step 2: Verify syntax**

```bash
node -e "require('./services/email.service'); console.log('Email service OK')"
```

Expected: `Email service OK`

- [ ] **Step 3: Commit**

```bash
git add services/email.service.js
git commit -m "feat: add email service with nodemailer Gmail SMTP"
```

---

## Task 4: Cập nhật Auth Service

**Files:**
- Modify: `BE-Moon/services/auth.service.js`

- [ ] **Step 1: Thay toàn bộ auth.service.js**

```js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user");
const EmailService = require("./email.service");
const { errorResponse } = require("../context/responseHandle");

const OTP_EXPIRES_MINUTES = 5;
const OTP_RESEND_SECONDS = 60;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(user) {
  return jwt.sign(
    { _id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

class AuthService {
  async register({ email, password }) {
    const existing = await UserModel.findOne({ email });

    if (existing && existing.isVerified) {
      throw new errorResponse({ message: "Email already exists", statusCode: 409 });
    }

    const otp = generateOtp();
    const otpCode = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);
    const otpSentAt = new Date();

    if (existing && !existing.isVerified) {
      // Ghi đè user chưa verify
      existing.passwordHash = await bcrypt.hash(password, 10);
      existing.otpCode = otpCode;
      existing.otpExpiresAt = otpExpiresAt;
      existing.otpSentAt = otpSentAt;
      await existing.save();
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await UserModel.create({ email, passwordHash, otpCode, otpExpiresAt, otpSentAt });
    }

    await EmailService.sendOtp(email, otp);
    return { email };
  }

  async verifyOtp({ email, otp }) {
    const user = await UserModel.findOne({ email });
    if (!user || user.isVerified) {
      throw new errorResponse({ message: "Invalid request", statusCode: 400 });
    }
    if (!user.otpCode || !user.otpExpiresAt) {
      throw new errorResponse({ message: "No OTP found, please register again", statusCode: 400 });
    }
    if (new Date() > user.otpExpiresAt) {
      throw new errorResponse({ message: "OTP expired, please request a new one", statusCode: 400 });
    }
    const valid = await bcrypt.compare(otp, user.otpCode);
    if (!valid) {
      throw new errorResponse({ message: "Invalid OTP", statusCode: 400 });
    }

    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpSentAt = null;
    await user.save();

    const token = signToken(user);
    return { token, user: { _id: user._id, email: user.email, role: user.role } };
  }

  async resendOtp({ email }) {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new errorResponse({ message: "Email not found", statusCode: 404 });
    }
    if (user.isVerified) {
      throw new errorResponse({ message: "Email already verified", statusCode: 400 });
    }
    if (user.otpSentAt) {
      const secondsSince = (Date.now() - new Date(user.otpSentAt).getTime()) / 1000;
      if (secondsSince < OTP_RESEND_SECONDS) {
        const wait = Math.ceil(OTP_RESEND_SECONDS - secondsSince);
        throw new errorResponse({ message: `Please wait ${wait} seconds before requesting a new OTP`, statusCode: 429 });
      }
    }

    const otp = generateOtp();
    user.otpCode = await bcrypt.hash(otp, 10);
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);
    user.otpSentAt = new Date();
    await user.save();

    await EmailService.sendOtp(email, otp);
    return { email };
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
    if (!user.isVerified) {
      // Auto resend OTP nếu chưa trong rate limit
      try { await this.resendOtp({ email }); } catch (_) {}
      throw new errorResponse({ message: "Email not verified. A new OTP has been sent.", statusCode: 403 });
    }
    const token = signToken(user);
    return { token, user: { _id: user._id, email: user.email, role: user.role } };
  }

  async me(userId) {
    const GalaxyModel = require("../models/galaxy");
    const user = await UserModel.findById(userId).select("-passwordHash -otpCode -otpExpiresAt -otpSentAt");
    if (!user) {
      throw new errorResponse({ message: "User not found", statusCode: 404 });
    }
    const galaxies = await GalaxyModel.find({ userId, status: "active" });
    return { user, galaxies };
  }
}

module.exports = new AuthService();
```

- [ ] **Step 2: Verify syntax**

```bash
node -e "require('./services/auth.service'); console.log('Auth service OK')"
```

Expected: `Auth service OK`

- [ ] **Step 3: Commit**

```bash
git add services/auth.service.js
git commit -m "feat: add OTP logic to auth service (register, verifyOtp, resendOtp, login)"
```

---

## Task 5: Cập nhật Auth Controller + Routes

**Files:**
- Modify: `BE-Moon/controllers/auth.controller.js`
- Modify: `BE-Moon/routes/auth.routes.js`

- [ ] **Step 1: Cập nhật auth.controller.js — thêm verifyOtp và resendOtp**

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
      message: "OTP sent to your email",
      meta: result,
      statusCode: 201,
    }).json(res);
  }

  async verifyOtp(req, res, next) {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return next(new errorResponse({ message: "email and otp are required", statusCode: 400 }));
    }
    const result = await AuthService.verifyOtp({ email, otp });
    return new successfullyResponse({
      message: "Email verified successfully",
      meta: result,
    }).json(res);
  }

  async resendOtp(req, res, next) {
    const { email } = req.body;
    if (!email) {
      return next(new errorResponse({ message: "email is required", statusCode: 400 }));
    }
    const result = await AuthService.resendOtp({ email });
    return new successfullyResponse({
      message: "OTP resent successfully",
      meta: result,
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

- [ ] **Step 2: Cập nhật auth.routes.js — thêm 2 routes mới**

```js
const router = require("express").Router();
const asyncHandler = require("../context/asyncHandler");
const { requireAuth } = require("../middlewares/auth");
const AuthController = require("../controllers/auth.controller");

router.post("/register", asyncHandler(AuthController.register));
router.post("/verify-otp", asyncHandler(AuthController.verifyOtp));
router.post("/resend-otp", asyncHandler(AuthController.resendOtp));
router.post("/login", asyncHandler(AuthController.login));
router.get("/me", requireAuth, asyncHandler(AuthController.me));

module.exports = router;
```

- [ ] **Step 3: Test API bằng curl**

```bash
npm run dev &
sleep 3

# Register → nhận OTP qua email
curl -s -X POST http://localhost:3030/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test-otp@test.com","password":"123456"}' | head -c 200
# Expected: { message: "OTP sent to your email", meta: { email: "test-otp@test.com" } }

# Login chưa verify → 403
curl -s -X POST http://localhost:3030/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test-otp@test.com","password":"123456"}' | head -c 200
# Expected: { statusCode: 403, message: "Email not verified..." }

kill %1
```

- [ ] **Step 4: Commit**

```bash
git add controllers/auth.controller.js routes/auth.routes.js
git commit -m "feat: add verifyOtp and resendOtp endpoints"
```

---

## Task 6: Cập nhật Auth Frontend

**Files:**
- Modify: `BE-Moon/public/auth/index.html`

- [ ] **Step 1: Thay toàn bộ public/auth/index.html**

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
      min-height: 100vh; background: #0a0a1f;
      display: flex; align-items: center; justify-content: center;
      font-family: sans-serif; color: #fff;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 32px; width: 360px;
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
    input.otp-input {
      font-size: 28px; font-weight: bold; letter-spacing: 12px;
      text-align: center;
    }
    button[type=submit] {
      width: 100%; padding: 12px; background: #a259f7;
      border: none; border-radius: 6px; color: #fff;
      font-size: 15px; cursor: pointer; margin-top: 4px;
    }
    button[type=submit]:hover { background: #8b3de8; }
    .btn-resend {
      width: 100%; padding: 10px; margin-top: 8px;
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px; color: #fff; font-size: 14px; cursor: pointer;
    }
    .btn-resend:disabled { opacity: 0.4; cursor: not-allowed; }
    .msg { text-align: center; margin-top: 12px; font-size: 13px; min-height: 20px; }
    .msg.error { color: #ff6b6b; }
    .msg.success { color: #6bffb8; }
    .otp-hint { font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 16px; text-align: center; }
    .screen { display: none; }
    .screen.active { display: block; }
    .back-btn {
      background: none; border: none; color: rgba(255,255,255,0.5);
      font-size: 13px; cursor: pointer; margin-bottom: 16px; padding: 0;
    }
    .back-btn:hover { color: #fff; }
  </style>
</head>
<body>
  <div class="card">
    <h2>✨ Galaxy</h2>

    <!-- Screen 1: Login / Register -->
    <div class="screen active" id="screen-auth">
      <div class="tabs">
        <button class="tab active" onclick="switchTab('login')">Đăng nhập</button>
        <button class="tab" onclick="switchTab('register')">Đăng ký</button>
      </div>
      <form id="form-auth">
        <input type="email" id="email" placeholder="Email" required />
        <input type="password" id="password" placeholder="Password" required />
        <button type="submit" id="submit-btn">Đăng nhập</button>
      </form>
      <div class="msg" id="msg-auth"></div>
    </div>

    <!-- Screen 2: OTP Verification -->
    <div class="screen" id="screen-otp">
      <button class="back-btn" onclick="showScreen('auth')">← Quay lại</button>
      <p class="otp-hint">Nhập mã OTP 6 số đã gửi tới<br><strong id="otp-email-display"></strong></p>
      <form id="form-otp">
        <input type="text" class="otp-input" id="otp" placeholder="______"
          maxlength="6" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required />
        <button type="submit">Xác thực</button>
      </form>
      <button class="btn-resend" id="btn-resend" onclick="resendOtp()">Gửi lại OTP</button>
      <div class="msg" id="msg-otp"></div>
    </div>
  </div>

  <script>
    let mode = 'login';
    let pendingEmail = '';
    let resendTimer = null;

    function showScreen(name) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById('screen-' + name).classList.add('active');
    }

    function switchTab(tab) {
      mode = tab;
      document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
      });
      document.getElementById('submit-btn').textContent = tab === 'login' ? 'Đăng nhập' : 'Đăng ký';
      document.getElementById('msg-auth').textContent = '';
    }

    function startResendCountdown(seconds) {
      const btn = document.getElementById('btn-resend');
      btn.disabled = true;
      let remaining = seconds;
      btn.textContent = `Gửi lại sau ${remaining}s`;
      resendTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(resendTimer);
          btn.disabled = false;
          btn.textContent = 'Gửi lại OTP';
        } else {
          btn.textContent = `Gửi lại sau ${remaining}s`;
        }
      }, 1000);
    }

    function showOtpScreen(email, countdown = 60) {
      pendingEmail = email;
      document.getElementById('otp-email-display').textContent = email;
      document.getElementById('otp').value = '';
      document.getElementById('msg-otp').textContent = '';
      showScreen('otp');
      if (resendTimer) clearInterval(resendTimer);
      startResendCountdown(countdown);
    }

    document.getElementById('form-auth').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const msg = document.getElementById('msg-auth');
      msg.textContent = '';

      try {
        const res = await fetch('/auth/' + mode, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (res.status === 403 && data.message && data.message.includes('not verified')) {
          showOtpScreen(email);
          return;
        }
        if (!res.ok) {
          msg.className = 'msg error';
          msg.textContent = data.message || 'Có lỗi xảy ra';
          return;
        }
        if (mode === 'register') {
          showOtpScreen(email);
          return;
        }
        localStorage.setItem('token', data.meta.token);
        localStorage.setItem('user', JSON.stringify(data.meta.user));
        msg.className = 'msg success';
        msg.textContent = 'Thành công! Đang chuyển hướng...';
        setTimeout(() => { window.location.href = '/portal/'; }, 800);
      } catch {
        msg.className = 'msg error';
        msg.textContent = 'Lỗi kết nối server';
      }
    });

    document.getElementById('form-otp').addEventListener('submit', async (e) => {
      e.preventDefault();
      const otp = document.getElementById('otp').value;
      const msg = document.getElementById('msg-otp');
      msg.textContent = '';

      try {
        const res = await fetch('/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pendingEmail, otp }),
        });
        const data = await res.json();
        if (!res.ok) {
          msg.className = 'msg error';
          msg.textContent = data.message || 'OTP không hợp lệ';
          return;
        }
        localStorage.setItem('token', data.meta.token);
        localStorage.setItem('user', JSON.stringify(data.meta.user));
        msg.className = 'msg success';
        msg.textContent = 'Xác thực thành công! Đang chuyển hướng...';
        setTimeout(() => { window.location.href = '/portal/'; }, 800);
      } catch {
        msg.className = 'msg error';
        msg.textContent = 'Lỗi kết nối server';
      }
    });

    async function resendOtp() {
      const msg = document.getElementById('msg-otp');
      try {
        const res = await fetch('/auth/resend-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pendingEmail }),
        });
        const data = await res.json();
        if (!res.ok) {
          msg.className = 'msg error';
          msg.textContent = data.message || 'Lỗi gửi OTP';
          return;
        }
        msg.className = 'msg success';
        msg.textContent = 'OTP đã được gửi lại!';
        startResendCountdown(60);
      } catch {
        msg.className = 'msg error';
        msg.textContent = 'Lỗi kết nối server';
      }
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit và push**

```bash
cd /home/vuongwnguyen/CODE/NguyenVuongw/node/galaxy-apend/BE-Moon
git add public/auth/index.html
git commit -m "feat: add OTP verification screen to auth frontend"
git push
```
