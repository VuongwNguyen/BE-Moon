# Auth Security — Logout, Session Management & Bug Fixes

**Date:** 2026-05-09  
**Status:** Approved

---

## Goal

Add server-side logout with full session management (logout current, logout all, list sessions), and fix two existing security bugs found during review.

---

## Schema Changes

### `models/user.js`

Replace `sessions: [String]` with enriched session objects:

```js
sessions: [{
  sid:       { type: String, required: true },
  ua:        { type: String, default: '' },
  ip:        { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}]
```

Remove `tokenVersion` field — it is dead code (never read in middleware).

---

## New Endpoints

All three require `requireAuth`.

### `POST /auth/logout`
Removes only the `sid` in the current JWT from `user.sessions`.

**Request:** none (uses `req.user.sid` from decoded token)  
**Response:** `200 { message: "Logged out successfully" }`

### `POST /auth/logout-all`
Clears all sessions: `user.sessions = []`.

**Request:** none  
**Response:** `200 { message: "All sessions logged out" }`

### `GET /auth/sessions`
Returns all active sessions with `isCurrent` flag for the calling session.

**Response:**
```json
{
  "sessions": [
    {
      "sid": "abc123",
      "ua": "Chrome/124 on macOS",
      "ip": "1.2.3.4",
      "createdAt": "2026-05-09T10:00:00.000Z",
      "isCurrent": true
    }
  ]
}
```

---

## Bug Fixes

### Bug 1 — `auth.service.js` : `verifyOtp` issues token without session

**Problem:** `signToken(user)` called without `sessionId` → `decoded.sid` is `undefined` → `requireAuth` always rejects the token.

**Fix:** Mirror the `login` flow — generate a `sessionId`, push `{ sid, ua, ip, createdAt }` to `user.sessions` (with same `MAX_SESSIONS = 3` cap), then call `signToken(user, sessionId)`. The service needs `ua` and `ip` passed in, so the controller must forward `req.headers['user-agent']` and `req.ip`.

### Bug 2 — `media.routes.js` : write routes missing `requireAdmin`

**Problem:** `POST/PUT/DELETE /themes` and `POST/PUT/DELETE /musics` and `POST /upload-music` only check `requireAuth`. Any authenticated user can create or delete themes and music.

**Fix:** Add `requireAdmin` after `requireAuth` on all 7 write routes.

---

## Middleware Update

### `middlewares/auth.js`

Session check must handle object array instead of string array:

```js
// Before
!user.sessions?.includes(decoded.sid)

// After
!user.sessions?.some(s => s.sid === decoded.sid)
```

---

## Files to Change

| File | Change |
|------|--------|
| `models/user.js` | Replace `sessions: [String]` with object schema; remove `tokenVersion` |
| `middlewares/auth.js` | Update session check to `.some(s => s.sid === ...)` |
| `services/auth.service.js` | Fix `verifyOtp` to create session; update `login` to store object; add `logout`, `logoutAll`, `getSessions` methods |
| `controllers/auth.controller.js` | Add `logout`, `logoutAll`, `sessions` handlers; pass `ua`/`ip` to `verifyOtp` and `login` |
| `routes/auth.routes.js` | Register 3 new routes |
| `routes/media.routes.js` | Add `requireAdmin` to 7 write routes |

---

## Out of Scope

- Refresh tokens
- Push notifications on new login
- Geolocation of IP
