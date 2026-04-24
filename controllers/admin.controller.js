const UserModel = require('../models/user');
const SubscriptionModel = require('../models/subscription');
const PaymentModel = require('../models/payment');
const GalaxyModel = require('../models/galaxy');
const { successfullyResponse, errorResponse } = require('../context/responseHandle');
const asyncHandler = require('../context/asyncHandler');

// GET /admin/stats
const getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalUsers, activeSubs, monthRevenue, totalPayments] = await Promise.all([
    UserModel.countDocuments(),
    SubscriptionModel.countDocuments({ status: 'active', expiredAt: { $gt: now } }),
    PaymentModel.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    PaymentModel.countDocuments({ status: 'paid' }),
  ]);

  new successfullyResponse({
    meta: {
      totalUsers,
      activeSubs,
      monthRevenue: monthRevenue[0]?.total || 0,
      totalPayments,
    },
    message: 'OK',
  }).json(res);
});

// GET /admin/users?page=1&limit=20&search=&plan=
const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim();
  const planFilter = req.query.plan;

  const query = {};
  if (search) query.email = { $regex: search, $options: 'i' };

  const users = await UserModel.find(query, 'email role isVerified createdAt')
    .sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

  const total = await UserModel.countDocuments(query);

  const userIds = users.map(u => u._id);
  const now = new Date();
  const subs = await SubscriptionModel.find({
    userId: { $in: userIds },
    status: 'active',
    expiredAt: { $gt: now },
  }).lean();

  const subMap = {};
  subs.forEach(s => { subMap[s.userId.toString()] = s; });

  let result = users.map(u => ({
    ...u,
    subscription: subMap[u._id.toString()] || null,
  }));

  if (planFilter) {
    if (planFilter === 'none') result = result.filter(u => !u.subscription);
    else result = result.filter(u => u.subscription?.plan === planFilter);
  }

  new successfullyResponse({ meta: { users: result, total, page, limit }, message: 'OK' }).json(res);
});

// GET /admin/users/:id
const getUserDetail = asyncHandler(async (req, res) => {
  const user = await UserModel.findById(req.params.id, 'email role isVerified createdAt').lean();
  if (!user) throw new errorResponse({ message: 'User not found', statusCode: 404 });

  const now = new Date();
  const [subscription, galaxies, payments] = await Promise.all([
    SubscriptionModel.findOne({ userId: user._id, status: 'active', expiredAt: { $gt: now } }).lean(),
    GalaxyModel.find({ userId: user._id }, 'name status createdAt').lean(),
    PaymentModel.find({ userId: user._id }, 'plan period amount status paidAt createdAt').sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  new successfullyResponse({ meta: { user, subscription, galaxies, payments }, message: 'OK' }).json(res);
});

// PATCH /admin/users/:id/subscription  body: { plan, days }
const grantSubscription = asyncHandler(async (req, res) => {
  const { plan, days } = req.body;
  if (!['plus', 'pro'].includes(plan) || !days) {
    throw new errorResponse({ message: 'Invalid plan or days', statusCode: 400 });
  }

  const user = await UserModel.findById(req.params.id);
  if (!user) throw new errorResponse({ message: 'User not found', statusCode: 404 });

  const now = new Date();
  await SubscriptionModel.updateMany({ userId: user._id, status: 'active' }, { status: 'cancelled' });

  const expiredAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const sub = await SubscriptionModel.create({
    userId: user._id,
    plan,
    period: 'monthly',
    status: 'active',
    startDate: now,
    expiredAt,
  });

  new successfullyResponse({ meta: sub, message: 'Subscription granted' }).json(res);
});

// PATCH /admin/users/:id/status  body: { isVerified }
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await UserModel.findByIdAndUpdate(
    req.params.id,
    { isVerified: req.body.isVerified },
    { new: true, select: 'email role isVerified' }
  );
  if (!user) throw new errorResponse({ message: 'User not found', statusCode: 404 });
  new successfullyResponse({ meta: user, message: 'Updated' }).json(res);
});

// GET /admin/payments?page=1&limit=20
const getPayments = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    PaymentModel.find({}, 'buyerEmail plan period amount status paidAt createdAt payosOrderCode')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PaymentModel.countDocuments(),
  ]);

  new successfullyResponse({ meta: { payments, total, page, limit }, message: 'OK' }).json(res);
});

// GET /admin/cancellation-chart?days=30
const getCancellationChart = asyncHandler(async (req, res) => {
  const days = Math.min(90, parseInt(req.query.days) || 30);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Auto-cancel pending > 1 hour
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  await PaymentModel.updateMany({ status: 'pending', createdAt: { $lt: cutoff } }, { status: 'cancelled' });

  const rows = await PaymentModel.aggregate([
    { $match: { createdAt: { $gte: since }, status: { $in: ['paid', 'cancelled'] } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: 1 },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill missing days with 0
  const map = {};
  rows.forEach(r => { map[r._id] = r; });
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const row = map[key] || { total: 0, cancelled: 0 };
    result.push({ date: key, total: row.total, cancelled: row.cancelled, rate: row.total > 0 ? Math.round(row.cancelled / row.total * 100) : 0 });
  }

  new successfullyResponse({ meta: result, message: 'OK' }).json(res);
});

module.exports = { getStats, getUsers, getUserDetail, grantSubscription, toggleUserStatus, getPayments, getCancellationChart };
