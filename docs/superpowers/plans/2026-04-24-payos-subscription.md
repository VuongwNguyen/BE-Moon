# PayOS Subscription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement PayOS payment infrastructure so users can subscribe to Plus or Pro plans, unlocking premium features via a `requireSubscription` middleware.

**Architecture:** Subscription model tracks the user's active plan + expiry; Payment model stores every transaction for tax audit. PayOS SDK handles checkout link creation and webhook signature verification. Admin role bypasses all subscription checks automatically.

**Tech Stack:** Express 5, Mongoose 8, `@payos/node`, vanilla JS frontend (dark purple theme, Cinzel + Jost fonts)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `config/plans.js` | Create | PLANS hardcoded config (price, features) |
| `models/subscription.js` | Create | Subscription schema |
| `models/payment.js` | Create | Payment schema (tax audit fields) |
| `services/payment.service.js` | Create | PayOS SDK calls + business logic |
| `controllers/payment.controller.js` | Create | HTTP request handling |
| `routes/payment.routes.js` | Create | Express route definitions |
| `routes/index.js` | Modify | Register `/payment` |
| `middlewares/subscription.js` | Create | `requireSubscription(minPlan)` middleware |
| `public/portal/index.html` | Modify | Add Subscription tab + CSS |
| `public/portal/js/subscription.js` | Create | Subscription UI logic |
| `public/portal/js/main.js` | Modify | Toast on ?payment=success/cancel |

---

## Task 1: Install @payos/node and create PLANS config

**Files:**
- Create: `config/plans.js`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install PayOS SDK**

```bash
npm install @payos/node
```

Expected: `@payos/node` appears in `package.json` dependencies.

- [ ] **Step 2: Create config/plans.js**

```js
// config/plans.js
const PLANS = {
  plus: {
    monthly: 10000,
    yearly: 109000,
    features: ['Themes'],
    label: 'Plus',
  },
  pro: {
    monthly: 19000,
    yearly: 159000,
    features: ['Themes', 'Nhac nen', 'Text / Caption'],
    label: 'Pro',
  },
};

const PLAN_RANK = { plus: 1, pro: 2 };

module.exports = { PLANS, PLAN_RANK };
```

- [ ] **Step 3: Verify file readable**

```bash
node -e "const { PLANS } = require('./config/plans'); console.log(PLANS.plus.monthly)"
```

Expected output: `10000`

- [ ] **Step 4: Commit**

```bash
git add config/plans.js package.json package-lock.json
git commit -m "feat: add plans config and install @payos/node"
```

---

## Task 2: Subscription model

**Files:**
- Create: `models/subscription.js`

- [ ] **Step 1: Create models/subscription.js**

```js
// models/subscription.js
const { model, Schema } = require('mongoose');

const subscriptionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  plan: {
    type: String,
    enum: ['plus', 'pro'],
    required: true,
  },
  period: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active',
  },
  startDate: {
    type: Date,
    required: true,
  },
  expiredAt: {
    type: Date,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model('Subscription', subscriptionSchema, 'subscriptions');
```

- [ ] **Step 2: Verify schema loads without error**

```bash
node -e "require('./models/subscription'); console.log('ok')"
```

Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add models/subscription.js
git commit -m "feat: add Subscription model"
```

---

## Task 3: Payment model

**Files:**
- Create: `models/payment.js`

- [ ] **Step 1: Create models/payment.js**

```js
// models/payment.js
const { model, Schema } = require('mongoose');

const paymentSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null,
  },
  payosOrderCode: {
    type: Number,
    required: true,
    unique: true,
  },
  payosTransactionId: {
    type: String,
    default: null,
  },
  plan: {
    type: String,
    enum: ['plus', 'pro'],
    required: true,
  },
  period: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending',
    index: true,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  buyerEmail: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model('Payment', paymentSchema, 'payments');
```

- [ ] **Step 2: Verify schema loads without error**

```bash
node -e "require('./models/payment'); console.log('ok')"
```

Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add models/payment.js
git commit -m "feat: add Payment model (tax audit fields)"
```

---

## Task 4: Payment service

**Files:**
- Create: `services/payment.service.js`

Requires `.env` to have:
```
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
PAYOS_RETURN_URL=http://localhost:3000/portal/?payment=success
PAYOS_CANCEL_URL=http://localhost:3000/portal/?payment=cancel
```

- [ ] **Step 1: Create services/payment.service.js**

```js
// services/payment.service.js
const PayOS = require('@payos/node');
const SubscriptionModel = require('../models/subscription');
const PaymentModel = require('../models/payment');
const { PLANS } = require('../config/plans');
const { errorResponse } = require('../context/responseHandle');

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

class PaymentService {
  async createPaymentLink({ userId, userEmail, plan, period }) {
    if (!PLANS[plan]) {
      throw new errorResponse({ message: 'Invalid plan', statusCode: 400 });
    }
    if (!['monthly', 'yearly'].includes(period)) {
      throw new errorResponse({ message: 'Invalid period', statusCode: 400 });
    }

    const amount = PLANS[plan][period];
    const periodLabel = period === 'monthly' ? '1 thang' : '1 nam';
    const description = 'Galaxy ' + PLANS[plan].label + ' - ' + periodLabel;
    // PayOS orderCode must be a unique integer
    const orderCode = parseInt(String(Date.now()).slice(-8) + String(Math.floor(Math.random() * 100)).padStart(2, '0'));

    const payment = await PaymentModel.create({
      userId,
      payosOrderCode: orderCode,
      plan,
      period,
      amount,
      status: 'pending',
      buyerEmail: userEmail,
      description,
    });

    let payosResponse;
    try {
      payosResponse = await payos.createPaymentLink({
        orderCode,
        amount,
        description,
        returnUrl: process.env.PAYOS_RETURN_URL,
        cancelUrl: process.env.PAYOS_CANCEL_URL,
      });
    } catch (err) {
      await PaymentModel.findByIdAndDelete(payment._id);
      throw new errorResponse({ message: 'PayOS error: ' + err.message, statusCode: 502 });
    }

    return { checkoutUrl: payosResponse.checkoutUrl, orderCode };
  }

  async handleWebhook(webhookBody) {
    let webhookData;
    try {
      webhookData = payos.verifyPaymentWebhookData(webhookBody);
    } catch {
      throw new errorResponse({ message: 'Invalid webhook signature', statusCode: 400 });
    }

    const { orderCode, transactionId, code } = webhookData;

    const payment = await PaymentModel.findOne({ payosOrderCode: orderCode });
    if (!payment) return;

    if (code !== '00') {
      await PaymentModel.findByIdAndUpdate(payment._id, { status: 'cancelled' });
      return;
    }

    const paidAt = new Date();
    await PaymentModel.findByIdAndUpdate(payment._id, {
      status: 'paid',
      payosTransactionId: String(transactionId),
      paidAt,
    });

    const existingSub = await SubscriptionModel.findOne({ userId: payment.userId, status: 'active' });

    let subscription;
    if (existingSub) {
      const baseDate = existingSub.expiredAt > paidAt ? existingSub.expiredAt : paidAt;
      const newExpiredAt = new Date(baseDate);
      if (payment.period === 'monthly') {
        newExpiredAt.setMonth(newExpiredAt.getMonth() + 1);
      } else {
        newExpiredAt.setFullYear(newExpiredAt.getFullYear() + 1);
      }
      subscription = await SubscriptionModel.findByIdAndUpdate(
        existingSub._id,
        { plan: payment.plan, period: payment.period, expiredAt: newExpiredAt },
        { new: true }
      );
    } else {
      const expiredAt = new Date(paidAt);
      if (payment.period === 'monthly') {
        expiredAt.setMonth(expiredAt.getMonth() + 1);
      } else {
        expiredAt.setFullYear(expiredAt.getFullYear() + 1);
      }
      subscription = await SubscriptionModel.create({
        userId: payment.userId,
        plan: payment.plan,
        period: payment.period,
        status: 'active',
        startDate: paidAt,
        expiredAt,
      });
    }

    await PaymentModel.findByIdAndUpdate(payment._id, { subscriptionId: subscription._id });
  }

  async getStatus(userId) {
    const sub = await SubscriptionModel.findOne({ userId, status: 'active' }).sort({ expiredAt: -1 });
    if (!sub) return null;
    if (sub.expiredAt < new Date()) {
      await SubscriptionModel.findByIdAndUpdate(sub._id, { status: 'expired' });
      return null;
    }
    return sub;
  }

  async getHistory(userId) {
    return PaymentModel.find({ userId }).sort({ createdAt: -1 }).limit(50);
  }
}

module.exports = new PaymentService();
```

- [ ] **Step 2: Verify service loads**

```bash
node -e "require('./services/payment.service'); console.log('ok')"
```

Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add services/payment.service.js
git commit -m "feat: payment service (createPaymentLink, webhook, status, history)"
```

---

## Task 5: Payment controller

**Files:**
- Create: `controllers/payment.controller.js`

- [ ] **Step 1: Create controllers/payment.controller.js**

```js
// controllers/payment.controller.js
const PaymentService = require('../services/payment.service');
const { successfullyResponse, errorResponse } = require('../context/responseHandle');

class PaymentController {
  async createPaymentLink(req, res, next) {
    const { plan, period } = req.body;
    if (!plan || !period) {
      return next(new errorResponse({ message: 'plan and period are required', statusCode: 400 }));
    }
    const result = await PaymentService.createPaymentLink({
      userId: req.user._id,
      userEmail: req.user.email,
      plan,
      period,
    });
    return new successfullyResponse({ message: 'Payment link created', meta: result }).json(res);
  }

  async webhook(req, res, next) {
    await PaymentService.handleWebhook(req.body);
    res.json({ error: '0', message: 'Success' });
  }

  async getStatus(req, res, next) {
    const sub = await PaymentService.getStatus(req.user._id);
    return new successfullyResponse({ message: 'Subscription status fetched', meta: sub }).json(res);
  }

  async getHistory(req, res, next) {
    const history = await PaymentService.getHistory(req.user._id);
    return new successfullyResponse({ message: 'Payment history fetched', meta: history }).json(res);
  }
}

module.exports = new PaymentController();
```

- [ ] **Step 2: Verify file loads**

```bash
node -e "require('./controllers/payment.controller'); console.log('ok')"
```

Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add controllers/payment.controller.js
git commit -m "feat: payment controller"
```

---

## Task 6: Payment routes + register in index.js

**Files:**
- Create: `routes/payment.routes.js`
- Modify: `routes/index.js`

- [ ] **Step 1: Create routes/payment.routes.js**

```js
// routes/payment.routes.js
const router = require('express').Router();
const asyncHandler = require('../context/asyncHandler');
const { requireAuth } = require('../middlewares/auth');
const PaymentController = require('../controllers/payment.controller');

router.post('/create', requireAuth, asyncHandler(PaymentController.createPaymentLink));
router.post('/webhook', asyncHandler(PaymentController.webhook));
router.get('/status', requireAuth, asyncHandler(PaymentController.getStatus));
router.get('/history', requireAuth, asyncHandler(PaymentController.getHistory));

module.exports = router;
```

- [ ] **Step 2: Register in routes/index.js**

Replace the full content of `routes/index.js`:

```js
// routes/index.js
const router = require('express').Router();

router.use('/gallary', require('./gallary.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/galaxies', require('./galaxies.routes'));
router.use('/payment', require('./payment.routes'));

module.exports = router;
```

- [ ] **Step 3: Start server and verify auth guard**

```bash
npm run dev
```

In another terminal:
```bash
curl http://localhost:3000/payment/status
```

Expected: `{"statusResponse":false,"message":"Unauthorized","statusCode":401}`

- [ ] **Step 4: Commit**

```bash
git add routes/payment.routes.js routes/index.js
git commit -m "feat: payment routes registered"
```

---

## Task 7: requireSubscription middleware

**Files:**
- Create: `middlewares/subscription.js`

- [ ] **Step 1: Create middlewares/subscription.js**

```js
// middlewares/subscription.js
const SubscriptionModel = require('../models/subscription');
const { errorResponse } = require('../context/responseHandle');
const { PLAN_RANK } = require('../config/plans');

const requireSubscription = (minPlan) => async (req, res, next) => {
  if (req.user.role === 'admin') return next();

  const sub = await SubscriptionModel.findOne({ userId: req.user._id, status: 'active' });

  if (!sub || sub.expiredAt < new Date()) {
    if (sub) {
      await SubscriptionModel.findByIdAndUpdate(sub._id, { status: 'expired' });
    }
    return next(new errorResponse({ message: 'Active subscription required', statusCode: 403 }));
  }

  if (PLAN_RANK[sub.plan] < PLAN_RANK[minPlan]) {
    return next(new errorResponse({ message: minPlan + ' plan or higher required', statusCode: 403 }));
  }

  req.subscription = sub;
  next();
};

module.exports = { requireSubscription };
```

- [ ] **Step 2: Verify middleware loads**

```bash
node -e "require('./middlewares/subscription'); console.log('ok')"
```

Expected output: `ok`

- [ ] **Step 3: Manual test — admin bypass**

With server running, log in as admin via `POST /auth/login`, copy the token, then:

```bash
curl -H "Authorization: Bearer <admin_token>" http://localhost:3000/payment/status
```

Expected: `200 OK` with `"meta": null`

- [ ] **Step 4: Commit**

```bash
git add middlewares/subscription.js
git commit -m "feat: requireSubscription middleware with admin bypass"
```

---

## Task 8: Frontend — Subscription tab CSS + HTML in portal/index.html

**Files:**
- Modify: `public/portal/index.html`

- [ ] **Step 1: Add CSS before closing `</style>` tag (around line 370)**

Find the exact line `  </style>` and insert before it:

```css
    /* ── Subscription ────────────────────────────── */
    .sub-section { max-width: 520px; }
    .sub-current {
      background: var(--surface);
      border: 1px solid var(--border-accent);
      border-radius: var(--radius);
      padding: 20px 24px;
      margin-bottom: 24px;
    }
    .sub-current .plan-label {
      font-family: 'Cinzel', serif;
      font-size: 15px;
      font-weight: 600;
      color: var(--accent-light);
      letter-spacing: 0.06em;
      margin-bottom: 6px;
    }
    .sub-current .plan-expiry { font-size: 13px; color: var(--text-sub); }
    .sub-plans {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }
    .plan-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      transition: border-color 0.2s;
    }
    .plan-card:hover { border-color: var(--border-accent); }
    .plan-card .plan-name {
      font-family: 'Cinzel', serif;
      font-size: 14px;
      font-weight: 600;
      color: var(--accent-light);
      letter-spacing: 0.06em;
      margin-bottom: 10px;
    }
    .plan-card .plan-features {
      font-size: 12px;
      color: var(--text-sub);
      margin-bottom: 14px;
      line-height: 1.7;
    }
    .plan-card .plan-price { font-size: 13px; color: var(--text); margin-bottom: 14px; }
    .plan-card .plan-price strong { font-size: 17px; }
    .period-toggle { display: flex; gap: 6px; margin-bottom: 20px; }
    .period-btn {
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: none;
      color: var(--text-sub);
      font-size: 12px;
      font-family: 'Jost', sans-serif;
      cursor: pointer;
      transition: all 0.15s;
    }
    .period-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    .btn-subscribe {
      width: 100%;
      padding: 9px;
      background: var(--accent);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 13px;
      font-family: 'Jost', sans-serif;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-subscribe:hover { background: var(--accent-dark); }
    .btn-subscribe:disabled { opacity: 0.5; cursor: not-allowed; }
    .toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%) translateY(80px);
      background: #1a1a2e;
      border: 1px solid var(--border-accent);
      border-radius: 10px;
      padding: 12px 24px;
      font-size: 14px;
      color: var(--text);
      z-index: 200;
      transition: transform 0.3s ease;
      white-space: nowrap;
    }
    .toast.show { transform: translateX(-50%) translateY(0); }
    .toast.success { border-color: rgba(110,231,183,0.4); color: var(--green); }
    .toast.error { border-color: rgba(248,113,113,0.4); color: var(--red); }
```

- [ ] **Step 2: Add Subscription tab button in `.tabs-nav`**

Find:
```html
      <button class="tab-btn" data-tab="admin" id="tab-admin" style="display:none">
        🛡 Admin <span class="admin-badge">ADMIN</span>
      </button>
    </div>
```

Replace with:
```html
      <button class="tab-btn" data-tab="admin" id="tab-admin" style="display:none">
        🛡 Admin <span class="admin-badge">ADMIN</span>
      </button>
      <button class="tab-btn" data-tab="subscription">Subscription</button>
    </div>
```

- [ ] **Step 3: Add subscription panel and toast element**

Find:
```html
    </div>
  </div>

  <div class="modal-overlay" id="modal">
```

Replace with:
```html
    </div>

    <div class="tab-panel" id="panel-subscription">
      <div class="sub-section" id="sub-section">
        <div class="empty" id="sub-loading">Dang tai...</div>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <div class="modal-overlay" id="modal">
```

- [ ] **Step 4: Add subscription.js script tag before closing body**

Find:
```html
  <script src="./js/main.js"></script>
</body>
```

Replace with:
```html
  <script src="./js/main.js"></script>
  <script src="./js/subscription.js"></script>
</body>
```

- [ ] **Step 5: Verify Subscription tab appears**

Open `http://localhost:3000/portal/` — should see "Subscription" in the tab bar.

- [ ] **Step 6: Commit**

```bash
git add public/portal/index.html
git commit -m "feat: add subscription tab and toast to portal"
```

---

## Task 9: Frontend — subscription.js

**Files:**
- Create: `public/portal/js/subscription.js`
- Modify: `public/portal/js/main.js`

- [ ] **Step 1: Create public/portal/js/subscription.js**

```js
// public/portal/js/subscription.js
(function () {
  var token = localStorage.getItem('token');

  var PLANS = {
    plus: { label: 'Plus',  monthly: 10000, yearly: 109000, features: ['Themes'] },
    pro:  { label: 'Pro',   monthly: 19000, yearly: 159000, features: ['Themes', 'Nhac nen', 'Text / Caption'] },
  };

  var selectedPeriod = 'monthly';

  function fmtVND(amount) {
    return amount.toLocaleString('vi-VN') + 'd';
  }

  function showToast(msg, type) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast ' + (type || '');
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 3500);
  }

  // Handle ?payment= query param
  var params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    showToast('Thanh toan thanh cong! Subscription da duoc kich hoat.', 'success');
    history.replaceState({}, '', '/portal/');
  } else if (params.get('payment') === 'cancel') {
    showToast('Thanh toan bi huy.', 'error');
    history.replaceState({}, '', '/portal/');
  }

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function renderCurrentPlan(sub) {
    var div = el('div', 'sub-current');
    var label = el('div', 'plan-label');
    var planInfo = PLANS[sub.plan];
    label.textContent = (planInfo ? planInfo.label : sub.plan) + ' Plan';
    var expiry = el('div', 'plan-expiry');
    expiry.textContent = 'Het han: ' + new Date(sub.expiredAt).toLocaleDateString('vi-VN');
    div.appendChild(label);
    div.appendChild(expiry);
    return div;
  }

  function renderPeriodToggle(sub) {
    var toggle = el('div', 'period-toggle');
    ['monthly', 'yearly'].forEach(function (p) {
      var btn = el('button', 'period-btn' + (p === selectedPeriod ? ' active' : ''));
      btn.textContent = p === 'monthly' ? 'Theo thang' : 'Theo nam';
      btn.addEventListener('click', function () {
        selectedPeriod = p;
        render(sub);
      });
      toggle.appendChild(btn);
    });
    return toggle;
  }

  function renderPlanCard(planKey, plan, sub) {
    var card = el('div', 'plan-card');

    var nameEl = el('div', 'plan-name');
    nameEl.textContent = plan.label;

    var featuresEl = el('div', 'plan-features');
    plan.features.forEach(function (f) {
      var line = document.createElement('div');
      line.textContent = f;
      featuresEl.appendChild(line);
    });

    var priceEl = el('div', 'plan-price');
    var strong = document.createElement('strong');
    strong.textContent = fmtVND(plan[selectedPeriod]);
    priceEl.appendChild(strong);
    var periodText = document.createTextNode(' / ' + (selectedPeriod === 'monthly' ? 'thang' : 'nam'));
    priceEl.appendChild(periodText);

    var isCurrent = sub && sub.plan === planKey;
    var btn = el('button', 'btn-subscribe');
    btn.textContent = isCurrent ? 'Gia han' : ('Nang len ' + plan.label);
    btn.addEventListener('click', function () {
      handleSubscribe(btn, planKey, selectedPeriod, plan.label);
    });

    card.appendChild(nameEl);
    card.appendChild(featuresEl);
    card.appendChild(priceEl);
    card.appendChild(btn);
    return card;
  }

  function render(sub) {
    var section = document.getElementById('sub-section');
    while (section.firstChild) section.removeChild(section.firstChild);

    if (sub) {
      section.appendChild(renderCurrentPlan(sub));
    }

    section.appendChild(renderPeriodToggle(sub));

    var grid = el('div', 'sub-plans');
    Object.keys(PLANS).forEach(function (planKey) {
      grid.appendChild(renderPlanCard(planKey, PLANS[planKey], sub));
    });
    section.appendChild(grid);
  }

  async function loadSubscription() {
    var section = document.getElementById('sub-section');
    while (section.firstChild) section.removeChild(section.firstChild);
    var loading = el('div', 'empty');
    loading.textContent = 'Dang tai...';
    section.appendChild(loading);

    try {
      var res = await fetch('/payment/status', {
        headers: { 'Authorization': 'Bearer ' + token },
      });
      if (res.status === 401) return;
      var data = await res.json();
      render(data.meta || null);
    } catch {
      while (section.firstChild) section.removeChild(section.firstChild);
      var errEl = el('div', 'empty');
      errEl.textContent = 'Loi tai subscription';
      section.appendChild(errEl);
    }
  }

  async function handleSubscribe(btn, plan, period, planLabel) {
    btn.disabled = true;
    btn.textContent = 'Dang xu ly...';
    try {
      var res = await fetch('/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ plan: plan, period: period }),
      });
      var data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Loi tao link thanh toan', 'error');
        btn.disabled = false;
        btn.textContent = 'Nang len ' + planLabel;
        return;
      }
      window.location.href = data.meta.checkoutUrl;
    } catch {
      showToast('Loi ket noi', 'error');
      btn.disabled = false;
      btn.textContent = 'Nang len ' + planLabel;
    }
  }

  window._loadSubscription = loadSubscription;
})();
```

- [ ] **Step 2: Update tab switching in main.js to reload subscription on tab activate**

Find in `public/portal/js/main.js`:
```js
// Tab switching
document.querySelectorAll('.tab-btn[data-tab]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    const tab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('panel-' + tab).classList.add('active');
  });
});
```

Replace with:
```js
// Tab switching
document.querySelectorAll('.tab-btn[data-tab]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    const tab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('panel-' + tab).classList.add('active');
    if (tab === 'subscription' && window._loadSubscription) {
      window._loadSubscription();
    }
  });
});
```

- [ ] **Step 3: Test full UI flow**

With server running (`npm run dev`):
1. Open `http://localhost:3000/portal/` and log in
2. Click "Subscription" tab — see period toggle + Plus and Pro plan cards
3. Toggle "Theo thang" / "Theo nam" — prices update correctly
4. Click "Nang len Plus" — redirects to PayOS (or gets PayOS API error if no real keys)
5. Test toast: navigate to `http://localhost:3000/portal/?payment=success` — green toast appears, URL cleaned to `/portal/`
6. Test toast: navigate to `http://localhost:3000/portal/?payment=cancel` — red toast appears

- [ ] **Step 4: Commit**

```bash
git add public/portal/js/subscription.js public/portal/js/main.js
git commit -m "feat: subscription frontend UI"
```

---

## Task 10: Environment + end-to-end test

- [ ] **Step 1: Add PayOS keys to .env** (do not commit .env)

```
PAYOS_CLIENT_ID=your_client_id_from_payos_dashboard
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key
PAYOS_RETURN_URL=https://yourdomain.com/portal/?payment=success
PAYOS_CANCEL_URL=https://yourdomain.com/portal/?payment=cancel
```

For local webhook testing, install ngrok and run:
```bash
ngrok http 3000
```
Use the ngrok HTTPS URL as the webhook URL in PayOS dashboard. Update PAYOS_RETURN_URL/CANCEL_URL with ngrok domain.

- [ ] **Step 2: Create payment link smoke test**

```bash
# 1. Login to get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"yourpassword"}' | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).meta.token))")

# 2. Create payment link
curl -X POST http://localhost:3000/payment/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan":"plus","period":"monthly"}'
```

Expected: `{ "meta": { "checkoutUrl": "https://pay.payos.vn/...", "orderCode": ... } }`

- [ ] **Step 3: Complete sandbox payment and verify subscription**

1. Open `checkoutUrl` in browser, complete PayOS sandbox payment
2. Check subscription status:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/payment/status
```
Expected: `{ "meta": { "plan": "plus", "status": "active", "expiredAt": "..." } }`

3. Check payment history:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/payment/history
```
Expected: array with one `paid` payment record including `buyerEmail`, `amount`, `paidAt`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete PayOS subscription infrastructure"
```

---

## Verification Checklist

- [ ] `GET /payment/status` without token → 401 Unauthorized
- [ ] `POST /payment/create` with invalid plan (`{"plan":"vip"}`) → 400 "Invalid plan"
- [ ] `POST /payment/create` with invalid period → 400 "Invalid period"
- [ ] Admin JWT on `requireSubscription("pro")` route → passes through (200)
- [ ] Non-subscribed user on `requireSubscription("plus")` route → 403 "Active subscription required"
- [ ] Plus subscriber on `requireSubscription("pro")` route → 403 "pro plan or higher required"
- [ ] PayOS webhook with wrong signature → 400
- [ ] PayOS webhook `code !== "00"` → Payment marked `cancelled`, no Subscription created
- [ ] PayOS webhook `code === "00"` → Payment `paid`, Subscription `active`, `expiredAt` = now + 1 month
- [ ] Second payment on existing active sub → `expiredAt` extended from old expiry (not reset to today)
- [ ] Subscription tab shows plan + expiry when active
- [ ] Period toggle updates prices correctly
- [ ] Toast shows on `?payment=success`, URL cleaned to `/portal/`
- [ ] Toast shows on `?payment=cancel`, URL cleaned to `/portal/`
