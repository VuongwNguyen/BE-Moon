// config/plans.js
const PLANS = {
  plus: {
    monthly: 10000,
    yearly: 109000,
    features: ['themes'],
    label: 'Plus',
    maxGalaxies: 3,
  },
  pro: {
    monthly: 19000,
    yearly: 159000,
    features: ['themes', 'music', 'text'],
    label: 'Pro',
    maxGalaxies: 10,
  },
};

const PLAN_RANK = { plus: 1, pro: 2 };
const FREE_MAX_GALAXIES = 1;

module.exports = { PLANS, PLAN_RANK, FREE_MAX_GALAXIES };
