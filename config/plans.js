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
