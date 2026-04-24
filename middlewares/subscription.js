// middlewares/subscription.js
const SubscriptionModel = require('../models/subscription');
const { errorResponse } = require('../context/responseHandle');
const { PLAN_RANK } = require('../config/plans');

const requireSubscription = (minPlan) => async (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'partner') return next();

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
