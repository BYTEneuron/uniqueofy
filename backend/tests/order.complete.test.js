const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const { generateAccessToken } = require('../src/utils/token');
const { ORDER_STATUS } = require('../src/domain/orderStatusPolicy');

const randomPhone = () =>
  String(Math.floor(1000000000 + Math.random() * 9000000000));

const createUserWithToken = async (role = 'user') => {
  const user = await User.create({
    phone: randomPhone(),
    role,
    firstName: 'Complete',
    lastName: role,
  });

  return {
    user,
    token: generateAccessToken(user),
  };
};

const createOrder = async ({
  userId,
  status = ORDER_STATUS.QUOTE_FINALIZED,
  isAmountFinalized = true,
  finalAmount = 1500,
  paymentStatus = 'unpaid',
  paidAt = null,
  completedAt = null,
}) => {
  return Order.create({
    user: userId,
    services: [
      {
        serviceId: new mongoose.Types.ObjectId(),
        name: 'AC Repair',
        quantity: 1,
      },
    ],
    serviceDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    timeSlot: '10:00-12:00',
    address: 'Complete Street',
    status,
    isAmountFinalized,
    finalAmount,
    paymentStatus,
    paidAt,
    completedAt,
  });
};

// =====================================================
// A) COMPLETION FLOW TESTS
// =====================================================
describe('Order Completion Route', () => {
  it('admin can complete a paid and finalized order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      status: ORDER_STATUS.QUOTE_FINALIZED,
      isAmountFinalized: true,
      finalAmount: 1500,
      paymentStatus: 'paid',
      paidAt: new Date(),
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(ORDER_STATUS.COMPLETED);
    expect(res.body.data.completedAt).toBeTruthy();
  });

  it('cannot complete unpaid order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      status: ORDER_STATUS.QUOTE_FINALIZED,
      isAmountFinalized: true,
      finalAmount: 1500,
      paymentStatus: 'unpaid',
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });

  it('cannot complete unfinalized order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      status: ORDER_STATUS.PENDING_REVIEW,
      isAmountFinalized: false,
      finalAmount: null,
      paymentStatus: 'unpaid',
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });

  it('cannot complete cancelled order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      status: ORDER_STATUS.CANCELLED,
      isAmountFinalized: true,
      finalAmount: 1500,
      paymentStatus: 'paid',
      paidAt: new Date(),
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });

  it('cannot complete already completed order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      status: ORDER_STATUS.COMPLETED,
      isAmountFinalized: true,
      finalAmount: 1500,
      paymentStatus: 'paid',
      paidAt: new Date(),
      completedAt: new Date(),
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });

  it('user cannot access complete route', async () => {
    const { user, token: userToken } = await createUserWithToken('user');
    const order = await createOrder({
      userId: user._id,
      status: ORDER_STATUS.QUOTE_FINALIZED,
      isAmountFinalized: true,
      finalAmount: 1500,
      paymentStatus: 'paid',
      paidAt: new Date(),
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/complete`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('FORBIDDEN');
  });
});

// =====================================================
// B) TERMINAL STATE TESTS — COMPLETED
// =====================================================
describe('COMPLETED Terminal State Protection', () => {
  it('cannot cancel completed order', async () => {
    const { user, token } = await createUserWithToken('user');
    const order = await createOrder({
      userId: user._id,
      status: ORDER_STATUS.COMPLETED,
      isAmountFinalized: true,
      finalAmount: 1500,
      paymentStatus: 'paid',
      paidAt: new Date(),
      completedAt: new Date(),
    });

    const res = await request(app)
      .put(`/api/orders/${order._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });

  it('cannot finalize completed order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      status: ORDER_STATUS.COMPLETED,
      isAmountFinalized: true,
      finalAmount: 1500,
      paymentStatus: 'paid',
      paidAt: new Date(),
      completedAt: new Date(),
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/finalize`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ finalAmount: 2000 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });

  it('cannot mark paid on completed order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      status: ORDER_STATUS.COMPLETED,
      isAmountFinalized: true,
      finalAmount: 1500,
      paymentStatus: 'paid',
      paidAt: new Date(),
      completedAt: new Date(),
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/mark-paid`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });

  it('cannot update status of completed order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      status: ORDER_STATUS.COMPLETED,
      isAmountFinalized: true,
      finalAmount: 1500,
      paymentStatus: 'paid',
      paidAt: new Date(),
      completedAt: new Date(),
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ORDER_STATUS.CANCELLED });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });
});

// =====================================================
// B) TERMINAL STATE TESTS — CANCELLED
// =====================================================
describe('CANCELLED Terminal State Protection', () => {
  it('cannot finalize cancelled order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      status: 'cancelled',
      isAmountFinalized: false,
      finalAmount: null,
      paymentStatus: 'unpaid',
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/finalize`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ finalAmount: 1500 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('cannot mark paid on cancelled order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      status: 'cancelled',
      isAmountFinalized: true,
      finalAmount: 1500,
      paymentStatus: 'unpaid',
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/mark-paid`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('cannot complete cancelled order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      status: ORDER_STATUS.CANCELLED,
      isAmountFinalized: true,
      finalAmount: 1500,
      paymentStatus: 'paid',
      paidAt: new Date(),
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });

  it('cannot update status of cancelled order', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      status: ORDER_STATUS.CANCELLED,
      isAmountFinalized: false,
      finalAmount: null,
      paymentStatus: 'unpaid',
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ORDER_STATUS.QUOTE_IN_PROGRESS });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// =====================================================
// SUMMARY
// =====================================================
console.log('\n========================================');
console.log('  order.complete.test.js — Test Summary');
console.log('========================================');
console.log('  Order Completion Route:        6 tests');
console.log('  COMPLETED Terminal Protection:  4 tests');
console.log('  CANCELLED Terminal Protection:  4 tests');
console.log('  ─────────────────────────────────────');
console.log('  Total:                        14 tests');
console.log('========================================\n');
