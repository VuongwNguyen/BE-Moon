# Auth Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side logout with session management (logout current, logout all, list sessions) and fix two security bugs (verifyOtp token invalid, media write routes missing requireAdmin).

**Architecture:** Enrich `sessions` field in User model from `[String]` to `[{sid, ua, ip, createdAt}]`. Middleware updated to check `.some()`. Three new auth endpoints added. Two bugs fixed inline.

**Tech Stack:** Node.js, Express, Mongoose, jsonwebtoken, bcryptjs

---

## File Map

| File | Change |
|------|--------|
| `models/user.js` | Replace `sessions: [String]` with object schema; remove `tokenVersion` |
| `middlewares/auth.js` | Change `.includes(sid)` → `.some(s => s.sid === sid)` |
| `services/auth.service.js` | Fix `login` + `verifyOtp`; add `logout`, `logoutAll`, `getSessions` |
| `controllers/auth.controller.js` | Pass `ua`/`ip` to service; add `logout`, `logoutAll`, `sessions` handlers |
| `routes/auth.routes.js` | Register 3 new routes |
| `routes/media.routes.js` | Add `requireAdmin` to 7 write routes |

---

## Task 1: Update User model schema

**Files:**
- Modify: `models/user.js`

- [ ] **Step 1: Replace sessions field and remove tokenVersion**

Open `models/user.js`. Replace the entire `tokenVersion` and `sessions` fields with:

```js
  sessions: [{
    sid:       { type: String, required: true },
    ua:        { type: String, default: '' },
    ip:        { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  }],
```

Remove this block entirely:
```js
  tokenVersion: {
    type: Number,
    default: 0,
  },
```

Final `userSchema` field list (in order): `email`, `passwordHash`, `role`, `isVerified`, `otpCode`, `otpExpiresAt`, `otpSentAt`, `otpAttempts`, `otpPurpose`, `loginAttempts`, `lockedUntil`, `createdAt`, `sessions`.

- [ ] **Step 2: Commit**

```bash
git add models/user.js
git commit -m "refactor: enrich sessions to objects, remove unused tokenVersion"
```

---

## Task 2: Update auth middleware session check

**Files:**
- Modify: `middlewares/auth.js`

- [ ] **Step 1: Update session validation**

In `middlewares/auth.js`, the current check on line 14 is:
```js
if (!user || !user.sessions?.includes(decoded.sid)) {
```

Replace with:
```js
if (!user || !user.sessions?.some(s => s.sid === decoded.sid)) {
```

- [ ] **Step 2: Commit**

```bash
git add middlewares/auth.js
git commit -m "fix: update session check for object array schema"
```

---

## Task 3: Fix login() to store session objects

**Files:**
- Modify: `services/auth.service.js`
- Modify: `controllers/auth.controller.js`

- [ ] **Step 1: Update login() signature in auth.service.js**

Current signature at line 124:
```js
async login({ email, password }) {
```

Change to:
```js
async login({ email, password, ua = '', ip = '' }) {
```

- [ ] **Step 2: Replace session push in login()**

Current session creation (lines 148–149):
```js
const sessionId = require('crypto').randomBytes(16).toString('hex');
user.sessions = [...(user.sessions || []), sessionId].slice(-MAX_SESSIONS);
```

Replace with:
```js
const sessionId = require('crypto').randomBytes(16).toString('hex');
const sessionEntry = { sid: sessionId, ua, ip, createdAt: new Date() };
user.sessions = [...(user.sessions || []), sessionEntry].slice(-MAX_SESSIONS);
```

- [ ] **Step 3: Pass ua/ip from login controller**

In `controllers/auth.controller.js`, current login handler (line 43):
```js
const result = await AuthService.login({ email, password });
```

Replace with:
```js
const result = await AuthService.login({
  email,
  password,
  ua: req.headers['user-agent'] || '',
  ip: req.ip || '',
});
```

- [ ] **Step 4: Commit**

```bash
git add services/auth.service.js controllers/auth.controller.js
git commit -m "fix: login stores session object with ua/ip/createdAt"
```

---

## Task 4: Fix verifyOtp() bug — token without session

**Files:**
- Modify: `services/auth.service.js`
- Modify: `controllers/auth.controller.js`

- [ ] **Step 1: Update verifyOtp() signature**

Current signature at line 60:
```js
async verifyOtp({ email, otp }) {
```

Change to:
```js
async verifyOtp({ email, otp, ua = '', ip = '' }) {
```

- [ ] **Step 2: Add session creation before signToken in verifyOtp()**

Current code at end of `verifyOtp` (lines 86–94):
```js
user.isVerified = true;
user.otpCode = null;
user.otpExpiresAt = null;
user.otpSentAt = null;
user.otpAttempts = 0;
await user.save();

const token = signToken(user);
return { token, user: { _id: user._id, email: user.email, role: user.role } };
```

Replace with:
```js
user.isVerified = true;
user.otpCode = null;
user.otpExpiresAt = null;
user.otpSentAt = null;
user.otpAttempts = 0;
const sessionId = require('crypto').randomBytes(16).toString('hex');
user.sessions = [...(user.sessions || []), { sid: sessionId, ua, ip, createdAt: new Date() }].slice(-MAX_SESSIONS);
await user.save();

const token = signToken(user, sessionId);
return { token, user: { _id: user._id, email: user.email, role: user.role } };
```

- [ ] **Step 3: Pass ua/ip from verifyOtp controller**

In `controllers/auth.controller.js`, current handler (line 23):
```js
const result = await AuthService.verifyOtp({ email, otp });
```

Replace with:
```js
const result = await AuthService.verifyOtp({
  email,
  otp,
  ua: req.headers['user-agent'] || '',
  ip: req.ip || '',
});
```

- [ ] **Step 4: Commit**

```bash
git add services/auth.service.js controllers/auth.controller.js
git commit -m "fix: verifyOtp creates session before signing token"
```

---

## Task 5: Add logout / logoutAll / getSessions to auth.service

**Files:**
- Modify: `services/auth.service.js`

- [ ] **Step 1: Add three methods to AuthService class**

Add these three methods inside `class AuthService`, after the existing `me()` method (before the closing `}`):

```js
async logout({ userId, sid }) {
  await UserModel.findByIdAndUpdate(userId, {
    $pull: { sessions: { sid } },
  });
}

async logoutAll({ userId }) {
  await UserModel.findByIdAndUpdate(userId, { sessions: [] });
}

async getSessions({ userId, currentSid }) {
  const user = await UserModel.findById(userId, 'sessions').lean();
  if (!user) throw new errorResponse({ message: 'User not found', statusCode: 404 });
  return {
    sessions: user.sessions.map(s => ({
      sid: s.sid,
      ua: s.ua,
      ip: s.ip,
      createdAt: s.createdAt,
      isCurrent: s.sid === currentSid,
    })),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add services/auth.service.js
git commit -m "feat: add logout, logoutAll, getSessions to AuthService"
```

---

## Task 6: Add controller handlers for logout / logoutAll / sessions

**Files:**
- Modify: `controllers/auth.controller.js`

- [ ] **Step 1: Add three handlers to AuthController class**

Add after the existing `me()` handler (before the closing `}`):

```js
async logout(req, res, next) {
  await AuthService.logout({ userId: req.user._id, sid: req.user.sid });
  return new successfullyResponse({ message: 'Logged out successfully' }).json(res);
}

async logoutAll(req, res, next) {
  await AuthService.logoutAll({ userId: req.user._id });
  return new successfullyResponse({ message: 'All sessions logged out' }).json(res);
}

async sessions(req, res, next) {
  const result = await AuthService.getSessions({ userId: req.user._id, currentSid: req.user.sid });
  return new successfullyResponse({ message: 'Sessions fetched', meta: result }).json(res);
}
```

- [ ] **Step 2: Commit**

```bash
git add controllers/auth.controller.js
git commit -m "feat: add logout, logoutAll, sessions controller handlers"
```

---

## Task 7: Register new routes in auth.routes.js

**Files:**
- Modify: `routes/auth.routes.js`

- [ ] **Step 1: Add 3 new routes**

After the existing `router.get("/me", ...)` line, add:

```js
router.post("/logout", requireAuth, asyncHandler(AuthController.logout));
router.post("/logout-all", requireAuth, asyncHandler(AuthController.logoutAll));
router.get("/sessions", requireAuth, asyncHandler(AuthController.sessions));
```

- [ ] **Step 2: Commit**

```bash
git add routes/auth.routes.js
git commit -m "feat: register logout, logout-all, sessions routes"
```

---

## Task 8: Fix media.routes.js — add requireAdmin to write routes

**Files:**
- Modify: `routes/media.routes.js`

- [ ] **Step 1: Import requireAdmin**

Current import on line 3:
```js
const { requireAuth } = require('../middlewares/auth');
```

Replace with:
```js
const { requireAuth, requireAdmin } = require('../middlewares/auth');
```

- [ ] **Step 2: Add requireAdmin to all 7 write routes**

Replace the 7 write route definitions:
```js
router.post('/themes', requireAuth, asyncHandler(MediaController.createTheme));
router.put('/themes/:id', requireAuth, asyncHandler(MediaController.updateTheme));
router.delete('/themes/:id', requireAuth, asyncHandler(MediaController.deleteTheme));

router.post('/upload-music', requireAuth, upload.single('file'), ImageKit.uploadMusic.bind(ImageKit), asyncHandler(MediaController.uploadMusic));
router.post('/musics', requireAuth, asyncHandler(MediaController.createMusic));
router.put('/musics/:id', requireAuth, asyncHandler(MediaController.updateMusic));
router.delete('/musics/:id', requireAuth, asyncHandler(MediaController.deleteMusic));
```

With:
```js
router.post('/themes', requireAuth, requireAdmin, asyncHandler(MediaController.createTheme));
router.put('/themes/:id', requireAuth, requireAdmin, asyncHandler(MediaController.updateTheme));
router.delete('/themes/:id', requireAuth, requireAdmin, asyncHandler(MediaController.deleteTheme));

router.post('/upload-music', requireAuth, requireAdmin, upload.single('file'), ImageKit.uploadMusic.bind(ImageKit), asyncHandler(MediaController.uploadMusic));
router.post('/musics', requireAuth, requireAdmin, asyncHandler(MediaController.createMusic));
router.put('/musics/:id', requireAuth, requireAdmin, asyncHandler(MediaController.updateMusic));
router.delete('/musics/:id', requireAuth, requireAdmin, asyncHandler(MediaController.deleteMusic));
```

- [ ] **Step 3: Commit**

```bash
git add routes/media.routes.js
git commit -m "fix: add requireAdmin to media write routes"
```

---

## Task 9: Manual smoke test

Assumes server is running locally on port 3030. Replace `TOKEN` with a valid JWT from login.

- [ ] **Step 1: Register + verify OTP → check token works**

```bash
# 1. Register
curl -s -X POST http://localhost:3030/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq .

# 2. Verify OTP (use OTP from email)
curl -s -X POST http://localhost:3030/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"<OTP>"}' | jq .
# Expected: token returned AND subsequent /me call works (previously broken)
```

- [ ] **Step 2: Login + list sessions**

```bash
curl -s -X POST http://localhost:3030/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq .
# Save token from response

curl -s http://localhost:3030/auth/sessions \
  -H "Authorization: Bearer <TOKEN>" | jq .
# Expected: array with 1 session, isCurrent: true
```

- [ ] **Step 3: Logout current session**

```bash
curl -s -X POST http://localhost:3030/auth/logout \
  -H "Authorization: Bearer <TOKEN>" | jq .
# Expected: 200 "Logged out successfully"

curl -s http://localhost:3030/auth/me \
  -H "Authorization: Bearer <TOKEN>" | jq .
# Expected: 401 "Session expired, please login again"
```

- [ ] **Step 4: Logout all sessions**

```bash
# Login twice to get 2 sessions
curl -s -X POST http://localhost:3030/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq .
# TOKEN_A

curl -s -X POST http://localhost:3030/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq .
# TOKEN_B

curl -s http://localhost:3030/auth/sessions \
  -H "Authorization: Bearer <TOKEN_B>" | jq .
# Expected: 2 sessions

curl -s -X POST http://localhost:3030/auth/logout-all \
  -H "Authorization: Bearer <TOKEN_B>" | jq .
# Expected: 200

curl -s http://localhost:3030/auth/me \
  -H "Authorization: Bearer <TOKEN_A>" | jq .
# Expected: 401 — TOKEN_A also invalidated
```

- [ ] **Step 5: Verify media write routes require admin**

```bash
curl -s -X POST http://localhost:3030/media/themes \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}' | jq .
# Expected: 403 Forbidden
```
