const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const { getStats, getUsers, getUserDetail, grantSubscription, toggleUserStatus, getPayments, getCancellationChart } = require('../controllers/admin.controller');

router.use(requireAuth, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.patch('/users/:id/subscription', grantSubscription);
router.patch('/users/:id/status', toggleUserStatus);
router.get('/payments', getPayments);
router.get('/cancellation-chart', getCancellationChart);

module.exports = router;
