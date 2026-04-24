// services/payment.service.js
const { PayOS } = require('@payos/node');
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

    try {
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
    } catch (err) {
      throw new errorResponse({ message: 'Failed to process payment: ' + err.message, statusCode: 500 });
    }
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
