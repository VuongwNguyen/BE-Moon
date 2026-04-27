// controllers/payment.controller.js
const PaymentService = require('../services/payment.service');
const { successfullyResponse, errorResponse } = require('../context/responseHandle');

class PaymentController {
  async createPaymentLink(req, res, next) {
    const { plan, period } = req.body;
    if (!plan || !period) {
      return next(new errorResponse({ message: 'plan and period are required', statusCode: 400 }));
    }
    const baseUrl = req.protocol + '://' + req.get('host');
    const result = await PaymentService.createPaymentLink({
      userId: req.user._id,
      userEmail: req.user.email,
      plan,
      period,
      returnUrl: baseUrl + '/portal/?payment=success',
      cancelUrl: baseUrl + '/payment/cancel',
    });
    return new successfullyResponse({ message: 'Payment link created', meta: result }).json(res);
  }

  async webhook(req, res, next) {
    await PaymentService.handleWebhook(req.body);
    return res.json({ error: '0', message: 'Success' });
  }

  async getStatus(req, res, next) {
    const sub = await PaymentService.getStatus(req.user._id);
    return new successfullyResponse({ message: 'Subscription status fetched', meta: sub }).json(res);
  }

  async getHistory(req, res, next) {
    const history = await PaymentService.getHistory(req.user._id);
    return new successfullyResponse({ message: 'Payment history fetched', meta: history }).json(res);
  }

  async cancel(req, res, next) {
    const { orderCode } = req.query;
    if (orderCode) {
      await PaymentService.cancelPayment(parseInt(orderCode));
    }
    const baseUrl = req.protocol + '://' + req.get('host');
    return res.redirect(baseUrl + '/portal/?payment=cancel');
  }
}

module.exports = new PaymentController();
