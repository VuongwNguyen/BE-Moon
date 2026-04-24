# PayOS Subscription — Design Spec

**Date:** 2026-04-24  
**Scope:** Payment infrastructure only. Premium features (themes, music, text) built separately.

---

## Context

Galaxy management (create, upload, delete) is **free** for all users — no limits.  
Subscription unlocks **premium customization features**: themes, nhạc nền, text/caption.  
Platform targets couples → subscription model must be extensible for shared/couple plans later.  
Payment records must support **tax audit**: store amount, buyer email, transaction ID, timestamps.

---

## Plans (hardcoded, not in DB)

```js
PLANS = {
  plus: {
    monthly: 10000,
    yearly:  109000,
    features: ["themes"],
  },
  pro: {
    monthly: 19000,
    yearly:  159000,
    features: ["themes", "music", "text"],
  },
}
```

**Admin role** automatically receives Pro-level access — no subscription required.

---

## Data Models

### Subscription
```js
{
  userId:     ObjectId ref User   // required, indexed
  plan:       "plus" | "pro"
  period:     "monthly" | "yearly"
  status:     "active" | "expired" | "cancelled"
  startDate:  Date
  expiredAt:  Date
  // future: sharedWith: [ObjectId ref User]  ← couples feature
  createdAt:  Date
}
```

One active subscription per user at a time (enforced in service layer).

### Payment (tax audit record)
```js
{
  userId:             ObjectId ref User
  subscriptionId:     ObjectId ref Subscription
  payosOrderCode:     String    // unique, used as PayOS order reference
  payosTransactionId: String    // filled after PayOS confirms payment
  plan:               "plus" | "pro"
  period:             "monthly" | "yearly"
  amount:             Number    // VND
  status:             "pending" | "paid" | "cancelled"
  paidAt:             Date
  buyerEmail:         String    // copied from user.email at time of purchase
  description:        String    // e.g. "Galaxy Plus - 1 tháng"
  createdAt:          Date
}
```

---

## API Endpoints

All under `/payment`, registered in `routes/index.js`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/payment/create` | requireAuth | Create PayOS checkout link |
| `POST` | `/payment/webhook` | public | PayOS callback → activate subscription |
| `GET`  | `/payment/status`  | requireAuth | Current subscription of user |
| `GET`  | `/payment/history` | requireAuth | User's payment history (for self-review) |

### POST /payment/create
**Body:** `{ plan: "plus"|"pro", period: "monthly"|"yearly" }`  
**Flow:**
1. Validate plan/period
2. Calculate amount from PLANS config
3. Generate unique `orderCode` (timestamp-based number, PayOS requires Number)
4. Create `Payment { status: "pending" }`
5. Call PayOS SDK → get `checkoutUrl`
6. Return `{ checkoutUrl }`

### POST /payment/webhook
**Headers:** PayOS signature headers  
**Flow:**
1. Verify PayOS webhook signature (using `@payos/node`)
2. Find Payment by `orderCode`
3. If `code === "00"` (success):
   - Update `Payment { status: "paid", payosTransactionId, paidAt }`
   - Upsert Subscription: if active subscription exists → extend `expiredAt`, else create new
4. Return `{ error: "0" }` to PayOS (required by PayOS spec)

### GET /payment/status
Returns current active subscription or `null`.

### GET /payment/history
Returns paginated list of user's Payment records.

---

## Middleware

### requireSubscription(minPlan)
```js
// middlewares/subscription.js
const requireSubscription = (minPlan) => async (req, res, next) => {
  // Admin bypasses all subscription checks
  if (req.user.role === "admin") return next();

  const sub = await Subscription.findOne({ userId: req.user._id, status: "active" });
  if (!sub || sub.expiredAt < new Date()) {
    return next(new errorResponse({ message: "Subscription required", statusCode: 403 }));
  }

  const planRank = { plus: 1, pro: 2 };
  if (planRank[sub.plan] < planRank[minPlan]) {
    return next(new errorResponse({ message: "Upgrade required", statusCode: 403 }));
  }

  req.subscription = sub;
  next();
};
```

Usage on future premium routes:
```js
router.get("/galaxies/:id/theme", requireAuth, requireSubscription("plus"), handler);
router.post("/galaxies/:id/music", requireAuth, requireSubscription("pro"), handler);
```

---

## Frontend Changes

### Files
- `public/portal/index.html` — add Subscription tab
- `public/portal/js/subscription.js` — new file, subscription UI logic
- `public/portal/js/main.js` — add tab switching for Subscription

### UI States

**No subscription:**
```
[ Plus — 10,000đ/tháng ]  [ Pro — 19,000đ/tháng ]
Tiết kiệm khi mua năm: Plus 109,000đ | Pro 159,000đ
```

**Active:**
```
Plan: Pro  |  Hết hạn: 24/04/2027
[ Gia hạn ]
```

**Expired:**
```
⚠ Subscription đã hết hạn — [ Gia hạn ngay ]
```

### Return URLs (PayOS redirect after checkout)
- Success: `/portal/?payment=success`
- Cancel:  `/portal/?payment=cancel`

Frontend reads query param on load and shows a toast notification.

---

## File Structure

```
models/
  subscription.js        ← new
  payment.js             ← new
routes/
  payment.routes.js      ← new
  index.js               ← add /payment route
controllers/
  payment.controller.js  ← new
services/
  payment.service.js     ← new
middlewares/
  subscription.js        ← new (requireSubscription)
public/portal/
  js/subscription.js     ← new
  index.html             ← add Subscription tab
```

---

## Environment Variables Required

```
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
PAYOS_RETURN_URL=https://yourdomain.com/portal/?payment=success
PAYOS_CANCEL_URL=https://yourdomain.com/portal/?payment=cancel
```

Package: `@payos/node`

---

## Out of Scope (this iteration)

- Premium feature implementation (themes, music, text UI)
- Admin panel payment history view
- Subscription cancellation flow
- Couple/shared subscription
- VAT invoice generation (records stored, invoice PDF not generated yet)
