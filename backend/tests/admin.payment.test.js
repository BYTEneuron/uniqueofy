const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const { generateAccessToken } = require('../src/utils/token');
const { ORDER_STATUS } = require('../src/domain/orderStatusPolicy');

const randomPhone = () => String(Math.floor(1000000000 + Math.random() * 9000000000));

const createUserWithToken = async (role = 'user') => {
  const user = await User.create({
    phone: randomPhone(),
    role,
    firstName: 'Payment',
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
  finalAmount = 999,
  paymentStatus = 'unpaid',
  paidAt = null,
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
    serviceDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
    timeSlot: '09:00-11:00',
    address: 'Payment Street',
    status,
    isAmountFinalized,
    finalAmount,
    paymentStatus,
    paidAt,
  });
};

describe('Admin Mark-Paid Route', () => {
  it('admin can mark finalized order as paid', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({ userId: user._id });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/mark-paid`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentStatus).toBe('paid');
    expect(res.body.data.paidAt).toBeTruthy();
  });

  it('cannot mark cancelled order as paid', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({ userId: user._id, status: ORDER_STATUS.CANCELLED });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/mark-paid`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('cannot mark unfinalized order as paid', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      isAmountFinalized: false,
      finalAmount: null,
      status: ORDER_STATUS.PENDING_REVIEW,
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/mark-paid`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_OPERATION');
  });

  it('cannot mark already paid order as paid again', async () => {
    const { user } = await createUserWithToken('user');
    const { token: adminToken } = await createUserWithToken('admin');
    const order = await createOrder({
      userId: user._id,
      paymentStatus: 'paid',
      paidAt: new Date(),
    });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/mark-paid`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('BAD_REQUEST');
  });

  it('user cannot access admin mark-paid route', async () => {
    const { user, token: userToken } = await createUserWithToken('user');
    const order = await createOrder({ userId: user._id });

    const res = await request(app)
      .put(`/api/admin/orders/${order._id}/mark-paid`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('FORBIDDEN');
  });
});
